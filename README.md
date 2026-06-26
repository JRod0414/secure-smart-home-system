# Secure Smart Home System

> A full-stack IoT smart-home monitoring project using an ESP32, an Express REST API, SQLite event storage, browser dashboard, device API-key authentication, and local human login sessions.

## Overview

This project is a local smart-home monitoring system built to explore embedded systems, networking, web development, databases, and cybersecurity.

Sensor devices send events to a Node.js/Express backend using HTTP and JSON. The backend validates each event, authenticates the device with an API key, stores the event in SQLite, and serves a browser dashboard showing recent activity.

The backend also supports local human accounts with password hashing and server-side login sessions. Human authentication is currently implemented at the API level; dashboard login and route protection are the next steps.

## Current Status

**Status: Local MVP working with device authentication and human session-authentication foundation**

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
* One-time initial admin-account setup
* Username and password validation
* Password hashing with Node.js `scrypt` and a unique random salt
* Server-side login sessions stored in SQLite
* Random session tokens stored as hashes in the database
* `HttpOnly`, `SameSite=Lax` browser session cookies
* Login, logout, and current-user authentication endpoints

## Current Security Boundary

The project currently has two separate authentication paths:

```text
ESP32 device
    ↓
X-API-Key header
    ↓
POST /api/events

Human browser user
    ↓
Username + password
    ↓
Server-side session cookie
    ↓
Authentication endpoints
```

### Device Authentication

The backend requires an API key for device event requests.

* Missing API key → `401 Unauthorized`
* Wrong API key → `401 Unauthorized`
* Unknown device ID → `401 Unauthorized`
* Valid device ID and matching API key → event is stored with `201 Created`

Device API keys authenticate sensor devices. They are not used for human dashboard accounts.

### Human Authentication

The backend supports local human users and login sessions.

* The first account is created through a one-time setup endpoint.
* The first account receives the `admin` role.
* Passwords are never stored in plaintext.
* Passwords are hashed with `scrypt` and a unique random salt.
* The browser receives a random session token in an `HttpOnly` cookie.
* SQLite stores only a SHA-256 hash of each session token.
* Sessions currently expire after 12 hours.
* Logging out deletes the server-side session and clears the browser cookie.

### Current Limitation

Human login sessions work, but dashboard access and `GET /api/events` are not protected yet.

Role-based authorization and a dashboard login screen are the next planned milestones.

### Local Network Warning

The project currently uses plain HTTP for local testing.

Keep the backend on a trusted local network only. HTTPS must be added before exposing the API outside the local network.

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

### Human Authentication Flow

```text
Browser
    ↓
POST /api/auth/login
    ↓
Express verifies password with scrypt
    ↓
SQLite stores hashed session token
    ↓
Browser receives HttpOnly session cookie
    ↓
Later requests include cookie automatically
    ↓
Express identifies current user from session
```

## Technology Stack

| Area            | Technologies                                                           |
| --------------- | ---------------------------------------------------------------------- |
| Embedded        | ESP32, Arduino framework, magnetic reed switch                         |
| Communication   | HTTP, JSON, Wi-Fi                                                      |
| Backend         | Node.js, Express                                                       |
| Database        | SQLite                                                                 |
| Frontend        | HTML, CSS, JavaScript                                                  |
| Device security | Input validation, per-device API keys                                  |
| Human security  | Password hashing with `scrypt`, server-side sessions, HttpOnly cookies |

## API Endpoints

### General and Device Endpoints

| Method | Endpoint      | Purpose                                             |
| ------ | ------------- | --------------------------------------------------- |
| `GET`  | `/api/health` | Confirms the API is running                         |
| `GET`  | `/api/events` | Returns stored sensor events, newest first          |
| `POST` | `/api/events` | Authenticates, validates, and stores a sensor event |

### Human Authentication Endpoints

| Method | Endpoint                 | Purpose                                                           |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| `GET`  | `/api/auth/setup-status` | Reports whether the first admin account still needs to be created |
| `POST` | `/api/auth/setup`        | Creates the first admin account; works only while no users exist  |
| `POST` | `/api/auth/login`        | Verifies credentials and starts a browser session                 |
| `GET`  | `/api/auth/me`           | Returns the logged-in user for the current session                |
| `POST` | `/api/auth/logout`       | Ends the current session                                          |

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

Generate a device API key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated key into:

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

## First-Time Admin Setup

Before anyone can log in, create the initial admin account.

From the `backend` folder:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/setup" -ContentType "application/json" -Body '{"username":"your_username","password":"use-an-8-character-or-longer-password"}'
```

Username rules:

* 3 to 32 characters
* Letters, numbers, underscores, and hyphens only
* Usernames are normalized to lowercase

Password rules:

* 8 to 128 characters
* Password whitespace is preserved exactly as entered

The initial setup endpoint works only when there are zero users. Once the first admin is created, the endpoint returns `403 Forbidden`.

Check whether first-time setup is still required:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/setup-status"
```

## Test Human Login Sessions

### Log In

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/login" -ContentType "application/json" -Body '{"username":"your_username","password":"your_password"}' -SessionVariable session
```

PowerShell stores the session cookie in `$session`.

### Check the Current User

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -WebSession $session
```

### Log Out

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/auth/logout" -WebSession $session
```

After logout, using the same session against `/api/auth/me` should return `401 Unauthorized`.

## Local Secret Files

These files must stay local and must not be committed to Git:

```text
backend/config/devices.json
embedded/esp32_test_sender/secrets.h
backend/data/smart_home.db
```

Safe templates and source code can be committed, but real Wi-Fi credentials, API keys, session data, and local IP addresses must not be.

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

## Test a Device Event with PowerShell

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
│   ├── package.json
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

## Suggested Next Milestones

1. Add role-based authorization for `admin` and `viewer` accounts.
2. Protect dashboard API routes, including `GET /api/events`.
3. Add a dashboard login screen, logout button, and current-user display.
4. Add user-management routes for admins.
5. Add real-time dashboard updates or alerts.
6. Add rate limiting and API-key rotation for device authentication.
7. Move the local API to HTTPS before any remote access.

## Development Handoff

For a future development session, provide:

1. The GitHub repository link
2. A current project ZIP file
3. The feature you want to build next
4. A request to work step-by-step rather than having files changed automatically

Current completed milestone:

```text
Human authentication foundation:
initial admin setup → scrypt password hashing → SQLite server-side sessions → HttpOnly browser cookie → login/logout/current-user endpoints
```

## License

Educational and portfolio project.
