# Secure Smart Home System

> A full-stack IoT smart-home monitoring project using an ESP32, an Express REST API, SQLite event storage, a browser dashboard, device API-key authentication, and local human login sessions.

## Overview

This project is a local smart-home monitoring system built to explore embedded systems, networking, web development, databases, and cybersecurity.

Sensor devices send events to a Node.js/Express backend using HTTP and JSON. The backend validates each event, authenticates the device with an API key, stores the event in SQLite, and serves a browser dashboard showing recent activity.

Human users can log in through the dashboard. Passwords are hashed, sessions are stored server-side, and access to stored events is protected by authentication and permissions.

## Current Status

**Status: Local MVP working with device API-key authentication, human login sessions, role-based permissions, and a protected dashboard.**

### Completed

* Express backend API
* `GET /api/health` endpoint
* Device-authenticated `POST /api/events` endpoint
* Human-authenticated and permission-protected `GET /api/events` endpoint
* SQLite persistence for sensor events
* Fresh database initialization for `users`, `sessions`, and `events` tables
* Input validation for supported sensor types and events
* Browser dashboard served by Express
* Session-aware login screen, logout button, and current-user display
* Event totals for all, door, and motion events
* Frontend event filtering by sensor type
* PowerShell sensor-event testing
* ESP32 Wi-Fi connection and authenticated HTTP test sender
* Device API-key authentication
* Local secret/config files excluded from Git
* One-time initial admin-account setup
* Username and password validation
* Password hashing with Node.js `scrypt` and a unique random salt
* Server-side login sessions stored in SQLite
* Random session tokens stored as hashes in the database
* `HttpOnly`, `SameSite=Lax` browser session cookies
* Login, logout, and current-user authentication endpoints
* `admin` and `viewer` roles with named permissions

### Current Hardware Status

The ESP32 currently connects to Wi-Fi and sends an authenticated **test** event to the backend.

Physical reed-switch GPIO reading is **not implemented yet**. The next hardware milestone is to wire the magnetic reed switch, read its open/closed state locally through Serial Monitor, and then send events only when the state changes.

## Current Security Boundary

The project has two separate authentication paths:

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
GET /api/auth/me and protected GET /api/events
```

### Device Authentication

The backend requires an API key for device event requests.

* Missing API key → `401 Unauthorized`
* Wrong API key → `401 Unauthorized`
* Unknown device ID → `401 Unauthorized`
* Valid device ID and matching API key → event is stored with `201 Created`

Device API keys authenticate sensor devices. They are not used for human dashboard accounts.

### Human Authentication and Authorization

The backend supports local human users and login sessions.

* The first account is created through a one-time setup endpoint.
* The first account receives the `admin` role.
* Passwords are never stored in plaintext.
* Passwords are hashed with `scrypt` and a unique random salt.
* The browser receives a random session token in an `HttpOnly` cookie.
* SQLite stores only a SHA-256 hash of each session token.
* Sessions currently expire after 12 hours.
* Logging out deletes the server-side session and clears the browser cookie.
* `GET /api/events` requires an authenticated user with the `events:read` permission.

Current permissions:

| Role     | Permissions                   |
| -------- | ----------------------------- |
| `admin`  | `events:read`, `events:write` |
| `viewer` | `events:read`                 |

### Local Network Warning

The project currently uses plain HTTP for local testing.

Keep the backend on a trusted local network only. HTTPS should be added before exposing the API outside the local network.

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
Authenticated Browser Dashboard
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
Express identifies the current user and checks permissions
```

## Technology Stack

| Area            | Technologies                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Embedded        | ESP32, Arduino framework, magnetic reed switch                                                 |
| Communication   | HTTP, JSON, Wi-Fi                                                                              |
| Backend         | Node.js, Express                                                                               |
| Database        | SQLite                                                                                         |
| Frontend        | HTML, CSS, JavaScript                                                                          |
| Device security | Input validation, per-device API keys                                                          |
| Human security  | Password hashing with `scrypt`, server-side sessions, HttpOnly cookies, roles, and permissions |

## API Endpoints

### General and Device Endpoints

| Method | Endpoint      | Access                            | Purpose                                             |
| ------ | ------------- | --------------------------------- | --------------------------------------------------- |
| `GET`  | `/api/health` | Public                            | Confirms the API is running                         |
| `GET`  | `/api/events` | Logged-in user with `events:read` | Returns stored sensor events, newest first          |
| `POST` | `/api/events` | Device API key                    | Authenticates, validates, and stores a sensor event |

### Human Authentication Endpoints

| Method | Endpoint                 | Purpose                                                           |
| ------ | ------------------------ | ----------------------------------------------------------------- |
| `GET`  | `/api/auth/setup-status` | Reports whether the first admin account still needs to be created |
| `POST` | `/api/auth/setup`        | Creates the first admin account; works only while no users exist  |
| `POST` | `/api/auth/login`        | Verifies credentials and starts a browser session                 |
| `GET`  | `/api/auth/me`           | Returns the logged-in user for the current session                |
| `POST` | `/api/auth/logout`       | Ends the current session                                          |

## `POST /api/events`

### Required Header

```text
X-API-Key: YOUR_DEVICE_API_KEY
```

### Example Sensor Event

```json
{
  "device_id": "esp32_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-07-05T12:00:00Z"
}
```

Supported event combinations:

* `door`: `open`, `closed`
* `motion`: `detected`

The `timestamp` field is optional. When a device does not provide it, the backend uses the current server time.

The backend also stores `received_at`, which records when the server received the event.

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
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/setup" `
  -ContentType "application/json" `
  -Body '{"username":"your_username","password":"use-an-8-character-or-longer-password"}'
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
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"your_username","password":"your_password"}' `
  -SessionVariable session
```

PowerShell stores the session cookie in `$session`.

### Check the Current User

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/me" `
  -WebSession $session
```

### Read Stored Events

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/events" `
  -WebSession $session
```

### Log Out

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/logout" `
  -WebSession $session
```

After logout, using the same session against `/api/auth/me` or `/api/events` should return `401 Unauthorized`.

## Local Secret Files

These files must stay local and must not be committed to Git:

```text
backend/config/devices.json
embedded/esp32_test_sender/secrets.h
backend/data/smart_home.db
```

Safe templates and source code can be committed, but real Wi-Fi credentials, API keys, session data, local IP addresses, and SQLite database files must not be.

## ESP32 Setup

The ESP32 test sender is located at:

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

A successful ESP32 test sender request should return:

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
│   ├── data/                  # Local SQLite database, ignored by Git
│   ├── db/
│   │   └── database.js
│   ├── scripts/
│   ├── security/
│   ├── validation/
│   ├── package.json
│   └── server.js
├── embedded/
│   └── esp32_test_sender/
│       ├── esp32_test_sender.ino
│       ├── secrets.example.h
│       └── secrets.h          # Local and ignored by Git
├── frontend/                  # Browser dashboard
├── docs/                      # Architecture and project notes
├── .gitignore
└── README.md
```

## Next Milestones

1. Read a physical reed switch through an ESP32 GPIO pin and print stable `OPEN` and `CLOSED` changes through Serial Monitor.
2. Add debouncing and define the initial door state.
3. Send authenticated `door/open` and `door/closed` events only when the physical state changes.
4. Add user-management routes for admins.
5. Add real-time dashboard updates or alerts.
6. Add rate limiting and device API-key rotation.
7. Move the local API to HTTPS before any remote access.
8. Explore a camera design only after the reed-switch event path works end-to-end. The first camera goal should be an event-triggered still image with protected access, not live streaming.

## Learning Notes

For each feature branch:

1. Describe the behavior you want before changing code.
2. Inspect the relevant code and Git status.
3. Predict the smallest change.
4. Test the focused behavior.
5. Review `git diff` and `git diff --check`.
6. Commit only the intended files with a focused message.
7. Record what you tested and what you learned in project documentation.

## Development Handoff

For a future development session, provide:

1. The GitHub repository link.
2. A current project ZIP file.
3. The feature you want to build next.
4. A request to work step-by-step and inspect code before implementation.

Current completed milestones:

```text
Human authentication and authorization:
initial admin setup
→ scrypt password hashing
→ SQLite server-side sessions
→ HttpOnly browser cookie
→ login/logout/current-user endpoints
→ roles and permissions
→ protected event dashboard

Fresh database reliability:
database initialization creates users, sessions, and events tables
→ authenticated device event storage works on a new database
```

## License

Educational and portfolio project.