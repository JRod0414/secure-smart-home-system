# Backend API

REST API for the Secure Smart Home System. It receives sensor events from devices, validates required fields, and stores events in a local SQLite database.

## Requirements

* Node.js with support for `node:sqlite`
* npm

Check your Node version:

```powershell
node -v
```

## Setup

From the `backend` folder:

```powershell
npm install
npm start
```

The API runs at:

```text
http://localhost:3000
```

## API Endpoints

### Health Check

```text
GET /api/health
```

Example:

```text
http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "message": "Secure Smart Home API is running"
}
```

### Get Sensor Events

```text
GET /api/events
```

Example response:

```json
{
  "count": 1,
  "events": [
    {
      "id": 1,
      "device_id": "door_1",
      "sensor_type": "door",
      "event": "open",
      "timestamp": "2026-06-21T14:39:06.992Z",
      "received_at": "2026-06-21T14:39:06.992Z"
    }
  ]
}
```

### Create Sensor Event

```text
POST /api/events
```

Required JSON fields:

* `device_id`
* `sensor_type`
* `event`

Example PowerShell request:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/events" -ContentType "application/json" -Body '{"device_id":"door_1","sensor_type":"door","event":"open"}'
```

Example JSON body:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open"
}
```

The API automatically adds a timestamp if one is not provided.

## Data Storage

Sensor events are stored locally in:

```text
backend/data/smart_home.db
```

This folder is ignored by Git so local test data is not committed to the repository.

## Current Features

* Express REST API
* Health-check endpoint
* Sensor event validation
* SQLite persistence
* Event retrieval ordered newest first

## Next Steps

* Add device authentication
* Add automated API tests
* Connect the ESP32 to the API
* Build a frontend dashboard for stored events
