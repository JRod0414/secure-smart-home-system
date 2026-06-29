const express = require("express");
const path = require("path");
const { initializeDatabase } = require('./db/database');
const { hashPassword, verifyPassword } = require("./security/passwords");
const { createAuthMiddleware, publicUser } = require("./security/auth-middleware");
const { loadDeviceConfig } = require("./config/devices");
const { validateSensorEvent } = require("./validation/event-validation");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = process.env.PORT || 3000;

const {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
  hashSessionToken,
  sessionCookieOptions,
  clearSessionCookieOptions,
} = require("./security/sessions");

const deviceConfig = loadDeviceConfig();
const { createDeviceAuth } = require("./security/device-auth");
const { isAuthorizedDevice } = createDeviceAuth(deviceConfig);

// Allows the API to read JSON request bodies.
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use(cookieParser());

// Database initialization from database.js
const db = initializeDatabase();
const { loadCurrentUser, requireAuth, deleteSessionById } = createAuthMiddleware(db);

function normalizeUsername(value) {
  if (typeof value !== "string") {
    return null;
  }

  const username = value.trim().toLowerCase();

  if (!/^[a-z0-9_-]{3,32}$/.test(username)) {
    return null;
  }

  return username;
}

function isValidPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

// Check that the server is running.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Secure Smart Home API is running",
  });
});

// Return all stored sensor events, newest first.
app.get("/api/events", (req, res) => {
  const events = db
    .prepare(`
      SELECT id, device_id, sensor_type, event, timestamp, received_at
      FROM events
      ORDER BY id DESC
    `)
    .all();

  res.json({
    count: events.length,
    events,
  });
});

const countUsers = db.prepare(`
  SELECT COUNT(*) AS count
  FROM users
`);

const insertUser = db.prepare(`
  INSERT INTO users (
    username,
    password_hash,
    password_salt,
    role,
    created_at
  )
  VALUES (?, ?, ?, ?, ?)
`);

const findUserByUsername = db.prepare(`
  SELECT id, username, password_hash, password_salt, role, disabled_at
  FROM users
  WHERE username = ?
`);

const insertSession = db.prepare(`
  INSERT INTO sessions (
    user_id,
    token_hash,
    expires_at,
    created_at,
    last_seen_at
  )
  VALUES (?, ?, ?, ?, ?)
`);

app.use(loadCurrentUser);

app.get("/api/auth/setup-status", (req, res) => {
  const { count } = countUsers.get();

  res.json({
    setupRequired: count === 0,
  });
});

app.post("/api/auth/setup", async (req, res) => {
  try {
    const { count } = countUsers.get();

    if (count > 0) {
      return res.status(403).json({
        error: "Initial setup has already been completed.",
      });
    }

    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;

    if (!username) {
      return res.status(400).json({
        error:
          "Username must be 3-32 characters and use only letters, numbers, underscores, or hyphens.",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error: "Password must be between 8 and 128 characters.",
      });
    }

    const { salt, hash } = await hashPassword(password);
    const createdAt = new Date().toISOString();

    const result = insertUser.run(
      username,
      hash,
      salt,
      "admin",
      createdAt
    );

    const user = {
      id: Number(result.lastInsertRowid),
      username,
      role: "admin",
    };

    res.status(201).json({
      message: "Initial admin account created.",
      user,
    });
  } catch (error) {
    console.error("Failed to create initial admin account:", error);

    res.status(500).json({
      error: "Unable to create initial admin account.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = req.body?.password;

    if (!username || typeof password !== "string") {
      return res.status(400).json({
        error: "Username and password are required.",
      });
    }

    const user = findUserByUsername.get(username);

    if (!user || user.disabled_at) {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    const passwordMatches = await verifyPassword(
      password,
      user.password_salt,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid username or password.",
      });
    }

    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

    insertSession.run(
      user.id,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString()
    );

    res
      .cookie(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions())
      .json({
        message: "Login successful.",
        user: publicUser(user),
      });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      error: "Unable to log in.",
    });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  deleteSessionById.run(req.sessionId);

  res
    .clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions())
    .json({
      message: "Logout successful.",
    });
});

// Receive and store a sensor event.
app.post("/api/events", (req, res) => {
  const { device_id, sensor_type, event, timestamp } = req.body || {};

  // Make sure the required values exist and are strings.
  if (
    typeof device_id !== "string" ||
    typeof sensor_type !== "string" ||
    typeof event !== "string"
  ) {
    return res.status(400).json({
      error: "device_id, sensor_type, and event are required as strings",
    });
  }

  // Remove accidental spaces from incoming values.
  const cleanDeviceId = device_id.trim();
  const cleanSensorType = sensor_type.trim().toLowerCase();
  const cleanEvent = event.trim().toLowerCase();

  // Reject blank or strangely formatted device IDs.
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleanDeviceId)) {
    return res.status(400).json({
      error: "device_id must use only letters, numbers, underscores, or hyphens",
    });
  }

  const apiKey = req.get("X-API-Key");
  if (!isAuthorizedDevice(cleanDeviceId, apiKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const validation = validateSensorEvent(cleanSensorType, cleanEvent);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  let eventTimestamp = new Date().toISOString();

  // timestamp remains optional, but must be valid if the device sends one.
  if (timestamp !== undefined) {
    if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
      return res.status(400).json({
        error: "timestamp must be a valid date/time string",
      });
    }

    eventTimestamp = new Date(timestamp).toISOString();
  }

  const receivedAt = new Date().toISOString();

  const result = db
    .prepare(`
      INSERT INTO events (
        device_id,
        sensor_type,
        event,
        timestamp,
        received_at
      )
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(
      cleanDeviceId,
      cleanSensorType,
      cleanEvent,
      eventTimestamp,
      receivedAt
    );

  const storedEvent = db
    .prepare(`
      SELECT id, device_id, sensor_type, event, timestamp, received_at
      FROM events
      WHERE id = ?
    `)
    .get(Number(result.lastInsertRowid));

  res.status(201).json({
    message: "Sensor event stored",
    event: storedEvent,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});