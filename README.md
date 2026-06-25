# Secure Smart Home System

> A full-stack IoT smart-home monitoring project using an ESP32, an Express REST API, SQLite event storage, and a browser dashboard.

## Overview

This project is a local smart-home monitoring system built to explore embedded systems, networking, web development, databases, and cybersecurity.

Sensor devices send events to a Node.js/Express backend using HTTP and JSON. The backend validates the event, authenticates the device with an API key, stores the event in SQLite, and serves a browser dashboard showing recent activity.

## Current Status

**Status: Local MVP working**

### Completed

* Express backend API
* `GET /api/health` endpoint
* `GET /api/events` endpoint
* `POST /api/events` endpoint
* SQLite persistence for sensor events
* Input validation for supported sensor types and events
* Browser dashboard served by Express
* Event totals for all, door, and motion events
* Frontend event filtering by sensor type
* PowerShell sensor-event testing
* ESP32 Wi-Fi connection and HTTP test sender
* Physical reed-switch door sensor integration
* Basic device API-key authentication
* Local secret/config files excluded from Git

### Current Security Boundary

The backend now requires an API key for device event requests.

* Missing API key → `401 Unauthorized`
* Wrong API key → `401 Unauthorized`
* Unknown device ID → `401 Unauthorized`
* Valid device ID and matching API key → event is stored with `201 Created`

This is **basic device authentication**, not user authentication.

The project currently uses plain HTTP for local testing. Keep it on a trusted local network only. HTTPS must be added before exposing the API outside the local network.

### Not Implemented Yet

* HTTPS deployment
* Human user accounts, passwords, login sessions, and permissions
* Rate limiting for repeated failed requests
* API-key rotation/revocation workflow
* Real-time dashboard updates or alerts

## System Architecture

```text
ESP32 Sensor / PowerShell Test Client
                ↓
        HTTP + JSON + API Key
                ↓
          Express REST API
                ↓
           SQLite Database
                ↓
         Browser Dashboard
```

## Technology Stack

| Area          | Technologies                                                 |
| ------------- | ------------------------------------------------------------ |
| Embedded      | ESP32, Arduino framework, magnetic reed switch               |
| Communication | HTTP, JSON, Wi-Fi                                            |
| Backend       | Node.js, Express                                             |
| Database      | SQLite                                                       |
| Frontend      | HTML, CSS, JavaScript                                        |
| Security      | Input validation, per-device API keys, ignored local secrets |

## API Endpoints

| Method | Endpoint      | Purpose                                             |
| ------ | ------------- | --------------------------------------------------- |
| `GET`  | `/api/health` | Confirms the API is running                         |
| `GET`  | `/api/events` | Returns stored sensor events, newest first          |
| `POST` | `/api/events` | Authenticates, validates, and stores a sensor event |

## POST `/api/events`

### Required Header

```text
X-API-Key: <device-api-key>
```

### Example Sensor Event

```json
{
  "device_id": "esp32_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-06-21T12:00:00Z"
}
```

Supported event combinations:

* `door`: `open`, `closed`
* `motion`: `detected`

## Run Locally

From the project root:

```powershell
cd backend
npm install
Copy-Item .\config\devices.example.json .\config\devices.json
```

Generate a device key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated key into the local file:

```text
backend/config/devices.json
```

Then start the backend:

```powershell
npm start
```

Open the dashboard:

```text
http://localhost:3000
```

## Local Secret Files

These files must stay local and must not be committed to Git:

```text
backend/config/devices.json
embedded/esp32_test_sender/secrets.h
```

Safe templates and source code can be committed, but real Wi-Fi credentials, API keys, and local IP addresses must not be.

## ESP32 Setup

The ESP32 sender is located at:

```text
embedded/esp32_test_sender/
```

Create a local file named:

```text
embedded/esp32_test_sender/secrets.h
```

Example contents:

```cpp
#pragma once

const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_COMPUTER_LAN_IP:3000/api/events";
const char* deviceApiKey = "YOUR_DEVICE_API_KEY";
```

Important:

* Use the IPv4 address of the computer running the backend.
* Do not use `localhost` or `127.0.0.1`.
* Do not use the ESP32's own IP address.
* The ESP32 API key must exactly match the key in `backend/config/devices.json`.

A successful ESP32 test should return:

```text
HTTP response code: 201
```

## Test an Event with PowerShell

From the `backend` folder:

```powershell
$apiKey = (
  Get-Content .\config\devices.json -Raw |
  ConvertFrom-Json
).devices.esp32_1.apiKey

$body = @{
  device_id = "esp32_1"
  sensor_type = "door"
  event = "open"
} | ConvertTo-Json -Compress

$response = Invoke-WebRequest `
  -Uri "http://localhost:3000/api/events" `
  -Method Post `
  -ContentType "application/json" `
  -Headers @{ "X-API-Key" = $apiKey } `
  -Body $body `
  -UseBasicParsing

$response.StatusCode
$response.Content
```

Expected result:

```text
201
```

## Repository Structure

```text
secure-smart-home-system/
├── backend/
│   ├── config/
│   │   └── devices.example.json
│   ├── data/                    # Local SQLite database, ignored by Git
│   └── server.js
├── embedded/
│   └── esp32_test_sender/
│       ├── esp32_test_sender.ino
│       └── secrets.h             # Local and ignored by Git
├── frontend/                     # Browser dashboard
├── security/                     # Security notes and future work
├── docs/                         # Architecture and project notes
├── .gitignore
└── README.md
```

## Development Handoff

For a future development session, provide:

1. The GitHub repository link
2. A current project ZIP file
3. The feature you want to build next
4. A request to work step-by-step rather than having files changed automatically

Current completed milestone:

```text
Basic device API-key authentication:
ESP32 → X-API-Key header → Express validation → SQLite event storage
```

## Suggested Next Milestones

1. Add real-time dashboard updates or alerts.
2. Add rate limiting and API-key rotation for device authentication.
3. Move the local API to HTTPS before any remote access.
4. Add human user authentication for dashboard access.
5. Improve event history, filtering, and device management.

## License

Educational and portfolio project.
