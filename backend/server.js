const express = require("express");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = process.env.PORT || 3000;

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

// Create a local folder for the database if it does not exist.
const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });

// Open or create a persistent SQLite database file.
const dbPath = path.join(dataDirectory, "smart_home.db");
const db = new DatabaseSync(dbPath);

// Create the events table the first time the server runs.
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    sensor_type TEXT NOT NULL,
    event TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    received_at TEXT NOT NULL
  )
`);

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