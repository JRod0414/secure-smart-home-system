const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Allows the API to read JSON sent in requests.
app.use(express.json());

// Temporary in-memory event storage.
// We will replace this with a database later.
const events = [];

// Check that the server is running.
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Secure Smart Home API is running",
  });
});

// Return all stored sensor events.
app.get("/api/events", (req, res) => {
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

  const newEvent = {
    id: events.length + 1,
    device_id,
    sensor_type,
    event,
    timestamp: timestamp || new Date().toISOString(),
    received_at: new Date().toISOString(),
  };

  events.unshift(newEvent);

  res.status(201).json({
    message: "Sensor event stored",
    event: newEvent,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});