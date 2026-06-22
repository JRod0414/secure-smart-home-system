# Secure Smart Home System

> A full-stack IoT smart-home monitoring system using an ESP32-ready REST API, SQLite event storage, and a browser dashboard.

## Overview

This project is a secure smart-home monitoring system built to explore embedded systems, web development, networking, databases, and cybersecurity.

It currently accepts sensor events through an HTTP/JSON API, validates and stores them in SQLite, and displays recent activity in a browser dashboard. PowerShell and an ESP32 test sender can both simulate sensor devices.

## Current Status

**Status:** Local MVP working

### Completed

* [x] Express backend API
* [x] `GET /api/health` endpoint
* [x] `GET /api/events` endpoint
* [x] `POST /api/events` endpoint
* [x] SQLite persistence for sensor events
* [x] Input validation for supported sensor types and events
* [x] Browser dashboard served by Express
* [x] Event totals for all, door, and motion events
* [x] Frontend event filtering by sensor type
* [x] PowerShell sensor-event testing
* [x] ESP32 Wi-Fi connection and HTTP test event sender
* [ ] Physical reed-switch door sensor integration
* [ ] Device API-key authentication
* [ ] HTTPS deployment and user authentication

## System Architecture

```text
PowerShell or ESP32 Sensor Sender
              ↓
         HTTP + JSON
              ↓
       Express REST API
              ↓
        SQLite Database
              ↓
     Browser Dashboard
```

## Technology Stack

| Area          | Technologies                                                           |
| ------------- | ---------------------------------------------------------------------- |
| Embedded      | ESP32, Arduino framework, planned NC magnetic reed switch              |
| Communication | HTTP, JSON, Wi-Fi                                                      |
| Backend       | Node.js, Express                                                       |
| Database      | SQLite                                                                 |
| Frontend      | HTML, CSS, JavaScript                                                  |
| Security      | Input validation now; API keys, HTTPS, and user authentication planned |

## API Endpoints

| Method | Endpoint      | Purpose                                    |
| ------ | ------------- | ------------------------------------------ |
| `GET`  | `/api/health` | Confirms the API is running                |
| `GET`  | `/api/events` | Returns stored sensor events, newest first |
| `POST` | `/api/events` | Validates and stores a sensor event        |

### Example Sensor Event

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-06-21T12:00:00Z"
}
```

Supported event combinations:

* `door`: `open`, `closed`
* `motion`: `detected`

## Run Locally

```powershell
cd backend
npm install
npm start
```

Open the dashboard at:

```text
http://localhost:3000
```

## Test an Event with PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"device_id":"door_1","sensor_type":"door","event":"open"}'
```

## ESP32 Test Sender

The repository includes an ESP32 sketch that connects to Wi-Fi and posts a hard-coded test event to the local API.

Before uploading it, use your own local Wi-Fi credentials and the IPv4 address of the computer running the backend. Do not commit Wi-Fi credentials, API keys, or local IP configuration.

## Repository Structure

```text
secure-smart-home-system/
├── backend/                         # Express API and SQLite database
├── embedded/
│   └── esp32_test_sender/           # ESP32 HTTP test sender
├── frontend/                        # Browser dashboard
├── security/                        # Future threat model and authentication work
├── docs/                            # Architecture and project notes
└── README.md
```

## Next Milestones

1. Connect an NC magnetic reed switch to the ESP32.
2. Send `open` and `closed` events only when the switch state changes.
3. Add API-key authentication for device requests.
4. Keep device secrets out of GitHub using ignored local configuration files.
5. Add alerts or real-time dashboard updates.

## License

Educational and portfolio project.
