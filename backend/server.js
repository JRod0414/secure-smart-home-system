const express = require("express");
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const app = express();
const PORT = process.env.PORT || 3000;

// Allows the API to read JSON request bodies.
app.use(express.json());

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

// Receive and store a sensor event.
app.post("/api/events", (req, res) => {
  const { device_id, sensor_type, event, timestamp } = req.body || {};

  if (!device_id || !sensor_type || !event) {
    return res.status(400).json({
      error: "device_id, sensor_type, and event are required",
    });
  }

  const eventTimestamp = timestamp || new Date().toISOString();
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
    .run(device_id, sensor_type, event, eventTimestamp, receivedAt);

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