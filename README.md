# Secure Smart Home System

> A full-stack IoT smart-home monitoring project using an ESP32, an Express REST API, SQLite persistence, a protected browser dashboard, device API-key authentication, and server-side human login sessions.

## Overview

This project is a local smart-home monitoring system built to explore embedded systems, networking, web development, databases, and cybersecurity.

Sensor devices send events to a Node.js and Express backend using HTTP and JSON. The backend validates each event, authenticates the device with an API key, stores the event in SQLite, and serves a browser dashboard showing recent activity.

Human users can log in through the dashboard. Passwords are hashed, sessions are stored server-side, and access to events and administrative features is controlled through roles and named permissions.

## Current Status

**Status: Local MVP working with device API-key authentication, human login sessions, role-based permissions, protected event monitoring, and admin user management.**

### Completed

* Express backend API
* `GET /api/health` endpoint
* Device-authenticated `POST /api/events` endpoint
* Human-authenticated and permission-protected `GET /api/events` endpoint
* SQLite persistence for users, sessions, and sensor events
* Automatic creation of the `users`, `sessions`, and `events` tables
* Input validation for supported sensor types and events
* Browser dashboard served through Express
* Session-aware login screen
* Logout button and current-user display
* Event totals for all, door, and motion events
* Frontend event filtering by sensor type
* Manual event refreshing
* PowerShell sensor-event testing
* ESP32 Wi-Fi connection and authenticated HTTP test sender
* Per-device API-key authentication
* Local secrets and database files excluded from Git
* One-time initial admin-account setup
* Username and password validation
* Password hashing with Node.js `scrypt`
* Unique random password salt for each user
* Server-side login sessions stored in SQLite
* Random session tokens stored as hashes in the database
* `HttpOnly` and `SameSite=Lax` session cookies
* Login, logout, and current-user authentication endpoints
* `admin` and `viewer` roles with named permissions
* Admin-only user list in the dashboard
* Admin creation of `admin` and `viewer` accounts
* Admin account disabling and re-enabling
* Automatic deletion of a user’s active sessions when that account is disabled
* Protection against an admin disabling their own account
* Protection against disabling the final active admin
* Generic login errors for invalid credentials and disabled accounts

## Current Hardware Status

The ESP32 currently connects to Wi-Fi and sends an authenticated **test event** to the backend.

Physical reed-switch GPIO reading is not implemented yet. The next hardware milestone is to wire the magnetic reed switch, read its open and closed states through Serial Monitor, and send events only when the physical state changes.

## Current Security Boundary

The project has two separate authentication paths:

```text
ESP32 device
    ↓
device_id + X-API-Key header
    ↓
POST /api/events

Human browser user
    ↓
username + password
    ↓
server-side session cookie
    ↓
protected human API routes
```

### Device Authentication

The backend requires a registered device ID and matching API key for device event requests.

* Missing API key → `401 Unauthorized`
* Wrong API key → `401 Unauthorized`
* Unknown device ID → `401 Unauthorized`
* Valid device ID and matching API key → event stored with `201 Created`

Device API keys authenticate sensor devices. They are not used for human dashboard accounts.

A valid API key proves that the sender knows the registered device secret. It does not physically prove that the request came from a specific ESP32 board, so device keys must remain private.

### Human Authentication

The backend supports local human users and server-side login sessions.

* The first account is created through a one-time setup endpoint.
* The first account receives the `admin` role.
* Passwords are never stored in plaintext.
* Passwords are hashed with `scrypt` and a unique random salt.
* The browser receives a random session token in an `HttpOnly` cookie.
* SQLite stores only a SHA-256 hash of each session token.
* Sessions currently expire after 12 hours.
* Logging out deletes the server-side session and clears the browser cookie.
* Disabled users cannot log in.
* Disabling a user deletes all active sessions belonging to that user.
* Re-enabling a user does not restore old sessions; the user must log in again.

The login endpoint returns the same generic error for:

* Unknown usernames
* Incorrect passwords
* Disabled accounts

This prevents the login response from revealing whether an account exists or has been disabled.

### Authorization

Authentication proves who a human user is.

Authorization determines what that user is allowed to do.

Current permissions:

| Role     | Permissions                                |
| -------- | ------------------------------------------ |
| `admin`  | `events:read`, `users:read`, `users:write` |
| `viewer` | `events:read`                              |

Permission purposes:

| Permission    | Purpose                                   |
| ------------- | ----------------------------------------- |
| `events:read` | Read stored sensor events                 |
| `users:read`  | List human user accounts                  |
| `users:write` | Create, disable, and enable user accounts |

The admin panel is hidden from viewers in the frontend, but frontend visibility is not the security boundary. Every admin API route is separately protected by backend authentication and permission middleware.

### Local Network Warning

The project currently uses plain HTTP for local development.

Keep the backend on a trusted local network only. HTTPS should be added before exposing the API outside the local network.

## System Architecture

```text
ESP32 Sensor / PowerShell Test Client
    ↓
HTTP + JSON + Device API Key
    ↓
Express REST API
    ↓
Authentication + Authorization + Validation
    ↓
SQLite Database
    ↓
Protected Browser Dashboard
```

### Device Event Flow

```text
Device detects or generates an event
    ↓
Device sends POST /api/events
    ↓
Backend validates required fields
    ↓
Backend validates device_id format
    ↓
Backend checks the device API key
    ↓
Backend validates the sensor_type and event combination
    ↓
Backend stores the event in SQLite
    ↓
Dashboard later reads the event through GET /api/events
```

### Human Authentication Flow

```text
Browser sends POST /api/auth/login
    ↓
Express finds the user by username
    ↓
Express verifies the password with scrypt
    ↓
Backend creates a random session token
    ↓
SQLite stores a hash of the session token
    ↓
Browser receives the raw token in an HttpOnly cookie
    ↓
Later requests include the cookie automatically
    ↓
Express identifies the user and checks permissions
```

### Admin User-Management Flow

```text
Admin logs in
    ↓
Browser receives a valid session cookie
    ↓
Frontend displays the User Management panel
    ↓
Admin lists, creates, disables, or enables an account
    ↓
Backend checks the session
    ↓
Backend checks users:read or users:write
    ↓
Backend validates the requested operation
    ↓
SQLite is updated
```

When an account is disabled:

```text
disabled_at is set
    ↓
all sessions for that user are deleted
    ↓
existing sessions stop working
    ↓
future login attempts are rejected
```

## Technology Stack

| Area            | Technologies                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Embedded        | ESP32, Arduino framework, magnetic reed switch                                                                  |
| Communication   | HTTP, JSON, Wi-Fi                                                                                               |
| Backend         | Node.js, Express                                                                                                |
| Database        | SQLite through Node’s built-in `node:sqlite` module                                                             |
| Frontend        | HTML, CSS, JavaScript                                                                                           |
| Device security | Input validation and per-device API keys                                                                        |
| Human security  | `scrypt`, password salts, server-side sessions, hashed session tokens, HttpOnly cookies, roles, and permissions |

## API Endpoints

### General and Event Endpoints

| Method | Endpoint      | Access                    | Purpose                                             |
| ------ | ------------- | ------------------------- | --------------------------------------------------- |
| `GET`  | `/api/health` | Public                    | Confirms that the API is running                    |
| `GET`  | `/api/events` | User with `events:read`   | Returns stored sensor events, newest first          |
| `POST` | `/api/events` | Registered device API key | Authenticates, validates, and stores a sensor event |

### Human Authentication Endpoints

| Method | Endpoint                 | Access                      | Purpose                                         |
| ------ | ------------------------ | --------------------------- | ----------------------------------------------- |
| `GET`  | `/api/auth/setup-status` | Public                      | Reports whether initial admin setup is required |
| `POST` | `/api/auth/setup`        | Public while no users exist | Creates the first admin account                 |
| `POST` | `/api/auth/login`        | Public                      | Verifies credentials and starts a session       |
| `GET`  | `/api/auth/me`           | Logged-in user              | Returns the current user                        |
| `POST` | `/api/auth/logout`       | Logged-in user              | Deletes the session and clears the cookie       |

### Admin User-Management Endpoints

| Method  | Endpoint                       | Required permission | Purpose                                      |
| ------- | ------------------------------ | ------------------- | -------------------------------------------- |
| `GET`   | `/api/admin/users`             | `users:read`        | Lists user accounts                          |
| `POST`  | `/api/admin/users`             | `users:write`       | Creates an `admin` or `viewer` account       |
| `PATCH` | `/api/admin/users/:id/disable` | `users:write`       | Disables an account and deletes its sessions |
| `PATCH` | `/api/admin/users/:id/enable`  | `users:write`       | Re-enables a disabled account                |

### Admin Account Protections

The backend enforces the following rules:

* User IDs must be positive integers.
* Unknown user IDs return `404 Not Found`.
* Disabling an already disabled account returns `409 Conflict`.
* Enabling an already enabled account returns `409 Conflict`.
* An admin cannot disable their own account.
* The final active admin cannot be disabled.
* Duplicate usernames return `409 Conflict`.
* Roles must be either `admin` or `viewer`.
* Passwords must satisfy the configured length requirements.
* Password hashes and salts are never included in API responses.

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

The backend also stores `received_at`, which records when the server received and saved the event.

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

The initial setup endpoint works only while there are zero users. Once the first admin has been created, the endpoint returns `403 Forbidden`.

Check whether first-time setup is still required:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/auth/setup-status"
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

## Test Admin User Management

Log in as an admin and store the session in `$session` before running these examples.

### List Users

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/admin/users" `
  -WebSession $session
```

### Create a Viewer

```powershell
$newUserBody = @{
  username = "viewer1"
  password = "viewer-password-123"
  role = "viewer"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/users" `
  -ContentType "application/json" `
  -Body $newUserBody `
  -WebSession $session
```

### Create an Admin

```powershell
$newAdminBody = @{
  username = "admin2"
  password = "admin-password-123"
  role = "admin"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/users" `
  -ContentType "application/json" `
  -Body $newAdminBody `
  -WebSession $session
```

### Disable a User

Replace `2` with the target user’s database ID:

```powershell
Invoke-RestMethod `
  -Method Patch `
  -Uri "http://localhost:3000/api/admin/users/2/disable" `
  -WebSession $session
```

Disabling a user:

* Sets `disabled_at` to the current time
* Deletes all sessions for that user
* Prevents future login attempts
* Does not delete the user record

### Enable a User

```powershell
Invoke-RestMethod `
  -Method Patch `
  -Uri "http://localhost:3000/api/admin/users/2/enable" `
  -WebSession $session
```

Re-enabling a user sets `disabled_at` back to `NULL`. The user must log in again because old sessions are not restored.

## Admin Dashboard

Admins see a User Management panel inside the protected dashboard.

The panel supports:

* Viewing all user accounts
* Viewing each user’s role
* Viewing whether each account is enabled or disabled
* Creating admin and viewer accounts
* Disabling enabled accounts
* Enabling disabled accounts
* Manually refreshing the user list

Viewers do not see the User Management panel.

The frontend display is only a convenience. Direct requests to admin routes are still blocked by backend permission middleware when the current user lacks the required permission.

## Local Secret Files

These files must remain local and must not be committed to Git:

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
* Do not use the ESP32’s own IP address.
* The ESP32 API key must exactly match the key in `backend/config/devices.json`.

A successful ESP32 test request should return:

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

## Testing Checklist

### Device Events

| Test                                | Expected result    |
| ----------------------------------- | ------------------ |
| Valid device ID, API key, and event | `201 Created`      |
| Wrong API key                       | `401 Unauthorized` |
| Unknown device ID                   | `401 Unauthorized` |
| Missing required fields             | `400 Bad Request`  |
| Unsupported event combination       | `400 Bad Request`  |
| Invalid timestamp                   | `400 Bad Request`  |

### Human Authentication

| Test                                | Expected result                    |
| ----------------------------------- | ---------------------------------- |
| First admin setup on fresh database | `201 Created`                      |
| Setup after a user exists           | `403 Forbidden`                    |
| Correct login                       | Session cookie created             |
| Incorrect password                  | `401 Unauthorized`                 |
| Disabled account login              | `401 Unauthorized`                 |
| `/api/auth/me` with valid session   | Current user returned              |
| `/api/auth/me` without session      | `401 Unauthorized`                 |
| Logout                              | Session deleted and cookie cleared |

### Admin User Management

| Test                                  | Expected result                        |
| ------------------------------------- | -------------------------------------- |
| Admin lists users                     | `200 OK`                               |
| Viewer lists users                    | `403 Forbidden`                        |
| Admin creates a valid user            | `201 Created`                          |
| Duplicate username                    | `409 Conflict`                         |
| Invalid username, password, or role   | `400 Bad Request`                      |
| Disable an active user                | `disabled_at` set and sessions deleted |
| Disabled user logs in                 | `401 Unauthorized`                     |
| Disable the same account twice        | `409 Conflict`                         |
| Admin attempts to disable self        | `409 Conflict`                         |
| Attempt to disable final active admin | `409 Conflict`                         |
| Enable a disabled account             | `disabled_at` becomes `NULL`           |
| Enable an already active account      | `409 Conflict`                         |

### Frontend Dashboard

| Test                            | Expected result                                         |
| ------------------------------- | ------------------------------------------------------- |
| Open dashboard while logged out | Login panel shown                                       |
| Log in as viewer                | Event dashboard shown and admin panel hidden            |
| Log in as admin                 | Event dashboard and admin panel shown                   |
| Create a user                   | User appears in the refreshed list                      |
| Disable a user                  | Status changes to Disabled and button changes to Enable |
| Enable a user                   | Status changes to Enabled and button changes to Disable |
| Refresh events                  | Latest event list loaded                                |
| Change sensor filter            | Only matching events displayed                          |
| Log out                         | Login panel shown                                       |

## Repository Structure

```text
secure-smart-home-system/
├── backend/
│   ├── config/
│   │   └── devices.example.json
│   ├── data/
│   │   └── smart_home.db       # Local SQLite database, ignored by Git
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
│       └── secrets.h           # Local and ignored by Git
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── docs/
├── .gitignore
└── README.md
```

## Next Milestones

1. Read a physical reed switch through an ESP32 GPIO pin.
2. Print stable `OPEN` and `CLOSED` changes through Serial Monitor.
3. Add reed-switch debouncing.
4. Define and report the initial door state.
5. Send authenticated `door/open` and `door/closed` events only when the physical state changes.
6. Add automated backend integration tests.
7. Add a software door-event simulator for testing without physical hardware.
8. Add real-time dashboard updates or alerts.
9. Add rate limiting and device API-key rotation.
10. Move the local API to HTTPS before allowing remote access.
11. Explore a camera design only after the reed-switch event path works end to end. The first camera goal should be an event-triggered still image with protected access, not live streaming.

## Learning Notes

For each feature branch:

1. Describe the desired behavior before changing code.
2. Inspect the relevant code and Git status.
3. Predict the smallest useful change.
4. Implement one focused checkpoint at a time.
5. Test the behavior that changed.
6. Review `git diff`.
7. Run `git diff --check`.
8. Stage only the intended files.
9. Review `git diff --cached`.
10. Commit with a focused message.
11. Record what was tested and learned.

## Development Handoff

For a future development session, provide:

1. The GitHub repository link.
2. A current project ZIP file.
3. The feature you want to build next.
4. A request to work step by step and inspect the existing code before implementation.

Current completed milestones:

```text
Human authentication and authorization:
initial admin setup
→ scrypt password hashing
→ SQLite server-side sessions
→ HttpOnly browser cookie
→ login/logout/current-user endpoints
→ admin and viewer roles
→ named permissions
→ protected event dashboard

Admin user management:
admin-only user listing
→ creation of admin and viewer accounts
→ account disabling
→ active-session deletion
→ account re-enabling
→ self-disable protection
→ final-active-admin protection
→ dashboard user-management controls

Device event pipeline:
device ID and API-key authentication
→ event validation
→ SQLite persistence
→ protected dashboard display

Fresh database reliability:
database initialization creates users, sessions, and events tables
→ authentication works on a new database
→ authenticated device event storage works on a new database
```

## License

Educational and portfolio project.