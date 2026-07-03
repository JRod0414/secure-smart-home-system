# Secure Smart Home System

A secure smart-home project with an Express backend, SQLite event storage, device API-key authentication, and a browser dashboard with human login/logout support.

## Features

- Express REST API
- SQLite database for sensor events, users, and sessions
- Sensor event validation
- Device authentication with API keys
- Human authentication with usernames, hashed passwords, and sessions
- Role-based permissions
- Protected event retrieval
- Browser dashboard with login and logout
- Local PowerShell test scripts

## Requirements

- Node.js with support for `node:sqlite`
- npm

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

The server runs at:

```text
http://localhost:3000
```

Open that address in a browser to use the dashboard.

## Project Structure

```text
backend/
  config/
    devices.js
    devices.json
  data/
    smart_home.db
  db/
    database.js
  scripts/
    test-auth.ps1
    test-events.ps1
  security/
    auth-middleware.js
    device-auth.js
    passwords.js
    permissions.js
    sessions.js
  validation/
    event-validation.js
  server.js

frontend/
  index.html
  app.js
```

## Authentication and Authorization

This project uses two separate security systems because devices and humans should not authenticate in the same way.

### Device Authentication

Devices send sensor events using an API key.

```text
POST /api/events
```

A device must provide:

- A valid `device_id`
- A matching API key in the `X-API-Key` request header
- A valid sensor type and event combination

Device API keys are configured locally in:

```text
backend/config/devices.json
```

Do not commit real API keys to GitHub.

### Human Authentication

Humans use username/password login and receive a session cookie.

```text
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
```

The frontend checks the current session when the page loads:

```text
not logged in → show login form
logged in     → show dashboard
```

Logging out clears the session and returns the user to the login form.

### Roles and Permissions

Current roles:

| Role | Permissions |
|---|---|
| `admin` | `events:read`, `events:write` |
| `viewer` | `events:read` |

The dashboard currently uses the `events:read` permission.

There is no public registration route. Normal users should not be able to create or promote their own accounts.

## API Endpoints

### Health Check

```text
GET /api/health
```

Example response:

```json
{
  "status": "ok",
  "message": "Secure Smart Home API is running"
}
```

### Log In

```text
POST /api/auth/login
```

Example request body:

```json
{
  "username": "admin",
  "password": "your-password"
}
```

Successful login creates a session cookie and returns the authenticated user.

### Current User

```text
GET /api/auth/me
```

Returns the currently authenticated user.

Unauthenticated users receive:

```json
{
  "error": "Authentication required."
}
```

### Log Out

```text
POST /api/auth/logout
```

Requires a valid session. This removes the server-side session and clears the browser cookie.

### Get Sensor Events

```text
GET /api/events
```

This route requires:

```text
valid session
→ events:read permission
```

Expected behavior:

| Situation | Response |
|---|---|
| Not logged in | `401 Unauthorized` |
| Logged in without permission | `403 Forbidden` |
| Admin or viewer | Events returned |

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

### Create a Sensor Event

```text
POST /api/events
```

This route is intended for configured devices, not human users.

Required JSON fields:

- `device_id`
- `sensor_type`
- `event`

Optional field:

- `timestamp`

Example request:

```powershell
Invoke-RestMethod `
  -Method POST `
  -Uri "http://localhost:3000/api/events" `
  -Headers @{ "X-API-Key" = "YOUR_DEVICE_API_KEY" } `
  -ContentType "application/json" `
  -Body '{"device_id":"door_1","sensor_type":"door","event":"open"}'
```

Example request body:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open"
}
```

The server adds a timestamp when one is not provided.

## Event Validation

The API only accepts valid event types for each sensor type.

Examples:

```text
door   → open, closed
motion → detected
```

Invalid sensor types or invalid event combinations return a `400 Bad Request` response.

## Data Storage

Local SQLite data is stored in:

```text
backend/data/smart_home.db
```

This includes:

- Sensor events
- User accounts
- Session records

Local database files should not be committed to the repository.

## Testing

Start the backend server first:

```powershell
cd backend
npm start
```

In another PowerShell window, run the authentication test:

```powershell
.\scripts\test-auth.ps1
```

This script tests:

```text
login
→ current-user route
→ logout
→ expected unauthorized response after logout
```

To test device event requests:

```powershell
.\scripts\test-events.ps1
```

Before running it, replace the placeholder device ID and API key inside the script with values from your local device configuration.

Do not commit real API keys or passwords into test scripts.

## Current Security Model

```text
Device event upload:
device ID + API key
→ POST /api/events

Human dashboard access:
username + password
→ session cookie
→ role permission check
→ GET /api/events
```

This separation prevents human user roles from being used as device credentials and prevents device API keys from being used as human login credentials.

## Future Work

- Admin-only user management
- Admin-only account creation and role assignment
- Optional admin-only manual event creation route
- ESP32 integration
- Additional sensor types
- Automated tests
- Improved dashboard styling and filtering
- Deployment configuration
