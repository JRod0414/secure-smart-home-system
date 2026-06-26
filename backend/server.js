const express = require("express");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const app = express();
const PORT = process.env.PORT || 3000;

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE_NAME = "smart_home_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const PASSWORD_KEY_LENGTH = 64;

const cookieParser = require("cookie-parser");

// Read the device configuration file.
const deviceConfigPath = path.join(__dirname, "config", "devices.json");
let deviceConfig;
try {
  const deviceConfigText = fs.readFileSync(deviceConfigPath, "utf8");
  deviceConfig = JSON.parse(deviceConfigText);
} catch (error) {
  console.error("Could not load device config:", error.message);
  process.exit(1);
}
if (
  !deviceConfig.devices ||
  typeof deviceConfig.devices !== "object" ||
  Object.keys(deviceConfig.devices).length === 0
) {
  console.error("Device config must contain at least one configured device.");
  process.exit(1);
}

// Allows the API to read JSON request bodies.
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.use(cookieParser());

// Create a local folder for the database if it does not exist.
const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });

// Open or create a persistent SQLite database file.
const dbPath = path.join(dataDirectory, "smart_home.db");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA foreign_keys = ON");

// Create the events table the first time the server runs.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
    created_at TEXT NOT NULL,
    disabled_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

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

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  return {
    salt,
    hash: derivedKey.toString("hex"),
  };
}

async function verifyPassword(password, salt, storedHash) {
  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  const storedKey = Buffer.from(storedHash, "hex");

  return crypto.timingSafeEqual(storedKey, derivedKey);
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSessionToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  };
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
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

const allowedEventsBySensor = {
  door: ["open", "closed"],
  motion: ["detected"],
};

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

const findSessionWithUser = db.prepare(`
  SELECT
    sessions.id AS session_id,
    sessions.expires_at,
    users.id,
    users.username,
    users.role,
    users.disabled_at
  FROM sessions
  JOIN users ON users.id = sessions.user_id
  WHERE sessions.token_hash = ?
`);

const updateSessionLastSeen = db.prepare(`
  UPDATE sessions
  SET last_seen_at = ?
  WHERE id = ?
`);

const deleteSessionById = db.prepare(`
  DELETE FROM sessions
  WHERE id = ?
`);

function clearSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

function loadCurrentUser(req, res, next) {
  const sessionToken = req.cookies[SESSION_COOKIE_NAME];

  if (!sessionToken) {
    req.user = null;
    return next();
  }

  const tokenHash = hashSessionToken(sessionToken);
  const session = findSessionWithUser.get(tokenHash);

  if (!session) {
    req.user = null;
    res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
    return next();
  }

  const expired = new Date(session.expires_at) <= new Date();

  if (expired || session.disabled_at) {
    deleteSessionById.run(session.session_id);

    req.user = null;
    res.clearCookie(SESSION_COOKIE_NAME, clearSessionCookieOptions());
    return next();
  }

  updateSessionLastSeen.run(
    new Date().toISOString(),
    session.session_id
  );

  req.user = publicUser(session);
  req.sessionId = session.session_id;

  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }

  next();
}

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
  const configuredDevice = deviceConfig.devices[cleanDeviceId];
  if (
    !apiKey ||
    !configuredDevice ||
    apiKey !== configuredDevice.apiKey
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only allow sensor types your project currently supports.
  if (!["door", "motion"].includes(cleanSensorType)) {
    return res.status(400).json({
      error: "sensor_type must be either door or motion",
    });
  }

  // Make sure the event makes sense for that sensor.
  if (!allowedEventsBySensor[cleanSensorType].includes(cleanEvent)) {
    return res.status(400).json({
      error: `event "${cleanEvent}" is not valid for sensor_type "${cleanSensorType}"`,
    });
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