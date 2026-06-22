# Secure Smart Home System

A local IoT smart-home monitoring MVP built with an ESP32-ready HTTP API, SQLite event storage, and a browser dashboard.

## Project Goal

Build a smart-home monitoring system that receives door and motion events from embedded devices, stores them persistently, and displays recent activity in a browser.

This is a solo EE/CS project combining:

* Embedded systems and ESP32 programming
* Wi-Fi networking and HTTP/JSON communication
* Node.js and Express backend development
* SQLite persistence
* HTML, CSS, and JavaScript frontend work
* Security planning and input validation

## Current Project Status

**Current status: Local MVP working**

The complete local path has been tested:

```text
PowerShell or ESP32
        ↓
HTTP JSON POST request
        ↓
Express API
        ↓
SQLite database
        ↓
Browser dashboard
```

The ESP32 has successfully connected to Wi-Fi and sent a hard-coded `door/open` event to the API. That event was stored in SQLite and appeared in the dashboard.

The next hardware milestone is connecting an NC magnetic reed switch to the ESP32 and sending door state changes.

## Completed Features

* [x] Express backend API
* [x] `GET /api/health`
* [x] `GET /api/events`
* [x] `POST /api/events`
* [x] SQLite event persistence
* [x] Events remain after a backend restart
* [x] Required-field validation
* [x] Validation of supported sensor types and event combinations
* [x] Browser dashboard served from the Express server
* [x] Dashboard API health status
* [x] Total, door, and motion event counters
* [x] Recent-event list
* [x] Manual refresh button
* [x] Frontend dropdown filtering by sensor type
* [x] PowerShell test sender
* [x] ESP32 Wi-Fi connection
* [x] ESP32 HTTP POST test sender
* [x] GitHub repository and multi-computer Git workflow
* [x] `.gitignore` protection for local database, Node modules, and ESP32 secrets

## Not Yet Implemented

* [ ] Physical reed-switch door sensor
* [ ] ESP32 state-change detection
* [ ] API-key authentication for devices
* [ ] HTTPS deployment
* [ ] User sign-in/authentication
* [ ] Alerts or real-time dashboard updates
* [ ] Motion sensor hardware
* [ ] Threat model documentation

## Technology Stack

| Area            | Technology                            |
| --------------- | ------------------------------------- |
| Embedded        | ESP32, Arduino IDE, Arduino framework |
| Planned sensor  | NC magnetic reed switch               |
| Networking      | Wi-Fi, HTTP, JSON                     |
| Backend         | Node.js, Express                      |
| Database        | SQLite using `node:sqlite`            |
| Frontend        | HTML, CSS, vanilla JavaScript         |
| Testing         | PowerShell `Invoke-RestMethod`        |
| Version control | Git and GitHub                        |

## Repository Structure

```text
secure-smart-home-system/
├── backend/
│   ├── server.js                     # Express API and SQLite logic
│   ├── package.json                  # npm start script and dependencies
│   └── data/                         # Local SQLite database; ignored by Git
├── embedded/
│   └── esp32_test_sender/
│       └── esp32_test_sender.ino     # ESP32 HTTP test sender
├── frontend/
│   ├── index.html                    # Dashboard structure
│   ├── style.css                     # Dashboard styling
│   └── app.js                        # Fetches API data and filters events
├── docs/
│   └── architecture.md
├── security/                         # Future security documentation
├── .gitignore
└── README.md
```

## Current API Contract

All sensor events use this JSON structure:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-06-21T12:00:00Z"
}
```

`timestamp` is optional. When it is missing, the backend assigns the event timestamp.

### API Routes

| Method | Route         | Purpose                                |
| ------ | ------------- | -------------------------------------- |
| `GET`  | `/api/health` | Confirms the server is running         |
| `GET`  | `/api/events` | Returns all saved events, newest first |
| `POST` | `/api/events` | Validates and stores a sensor event    |

### Supported Event Combinations

| Sensor Type | Allowed Events   |
| ----------- | ---------------- |
| `door`      | `open`, `closed` |
| `motion`    | `detected`       |

### POST Validation Rules

The backend currently rejects requests when:

* `device_id`, `sensor_type`, or `event` are missing or not strings
* `device_id` contains unsupported characters
* `sensor_type` is not `door` or `motion`
* The event is not valid for that sensor type
* A supplied timestamp is invalid

Valid device IDs use letters, numbers, underscores, and hyphens.

Examples:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "closed"
}
```

```json
{
  "device_id": "motion_1",
  "sensor_type": "motion",
  "event": "detected"
}
```

## Run the Project Locally

From the project root:

```powershell
cd backend
npm install
npm start
```

The Express server runs on:

```text
http://localhost:3000
```

Open the dashboard in a browser:

```text
http://localhost:3000
```

Useful API checks:

```text
http://localhost:3000/api/health
```

```text
http://localhost:3000/api/events
```

## Test the API with PowerShell

Send a valid door event:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"device_id":"door_1","sensor_type":"door","event":"open"}'
```

Send a valid motion event:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"device_id":"motion_1","sensor_type":"motion","event":"detected"}'
```

Test invalid validation behavior:

```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/events" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"device_id":"door_1","sensor_type":"door","event":"detected"}'
} catch {
  $_.ErrorDetails.Message
}
```

## Current Frontend Behavior

The dashboard currently:

* Fetches API health from `/api/health`
* Fetches events from `/api/events`
* Displays API status
* Counts total events
* Counts door events
* Counts motion events
* Lists recent events with device ID, event, sensor type, and timestamp
* Filters the visible event list by `all`, `door`, or `motion`
* Refreshes API data with a button

Important frontend behavior:

* The event counters always count every event returned by the API.
* The dropdown filters only the displayed event list.
* Changing the filter does not make another API request.
* Clicking Refresh fetches current database data again.

## Current ESP32 Test Sender

The ESP32 test sender is located at:

```text
embedded/esp32_test_sender/esp32_test_sender.ino
```

It currently:

1. Connects to Wi-Fi.
2. Prints its assigned IP address in Serial Monitor.
3. Sends one hard-coded HTTP POST event during `setup()`.
4. Prints the HTTP response code and server response.
5. Does not repeatedly send events in `loop()`.

The test event is currently equivalent to:

```json
{
  "device_id": "esp32_1",
  "sensor_type": "door",
  "event": "open"
}
```

Expected successful Serial Monitor result:

```text
HTTP response code: 201
```

### Important ESP32 Networking Rule

The ESP32 must use the IPv4 address of the computer running the Node/Express backend.

Do not use:

```text
http://localhost:3000
```

inside the ESP32 sketch.

`localhost` would refer to the ESP32 itself, not the backend computer.

Use the backend computer's local Wi-Fi IPv4 instead:

```cpp
const char* serverUrl = "http://YOUR_SERVER_IPV4:3000/api/events";
```

The ESP32 and backend computer must be connected to the same local Wi-Fi network.

If the ESP32 gets HTTP response code `-1`, check:

1. The backend is running.
2. The server IP address is correct.
3. The ESP32 and backend computer are on the same network.
4. Windows Firewall allows inbound TCP traffic on port `3000`.
5. The Wi-Fi network is not a guest network with device isolation.

## Planned Reed-Switch Milestone

NC magnetic reed switches have been ordered.

The next goal is to replace the hard-coded ESP32 event with real door-state detection.

### Planned Wiring

Use one NC reed switch.

```text
Reed switch wire 1 → ESP32 GND
Reed switch wire 2 → ESP32 GPIO input
```

The planned GPIO is:

```text
GPIO 27
```

The ESP32 code should use:

```cpp
pinMode(27, INPUT_PULLUP);
```

Because the switch is normally closed, test the raw pin reading in Serial Monitor before deciding which reading corresponds to `"open"` and which corresponds to `"closed"`.

### Reed-Switch Software Requirements

The next ESP32 version should:

1. Read the reed switch state.
2. Store the previous state.
3. Send a POST request only when the state changes.
4. Send `"open"` when the magnet moves away.
5. Send `"closed"` when the magnet returns.
6. Avoid repeatedly posting the same state while the door remains unchanged.
7. Keep the existing API JSON contract.

The expected flow will become:

```text
Door opens or closes
        ↓
NC reed switch changes electrical state
        ↓
ESP32 detects a state change
        ↓
ESP32 POSTs open or closed event
        ↓
Express validates the event
        ↓
SQLite stores the event
        ↓
Dashboard displays it
```

## Security Status

This project is currently a local-development MVP.

Implemented security-related work:

* Input validation
* Device ID format validation
* Restricted sensor types
* Restricted event combinations
* Local secrets ignored by Git

Not yet implemented:

* Device API keys
* Signed requests
* HTTPS
* User authentication
* Authorization
* Rate limits
* Alerts
* Production deployment security

Do not claim the system is fully secure yet.

## Secret Handling Rules

Never commit:

* Wi-Fi network name if private
* Wi-Fi password
* Local server IP configuration
* Future device API keys
* `.env` files
* `config.h`
* `secrets.h`
* `backend/data/`
* `node_modules/`

The repository ignores local ESP32 secret files through:

```text
embedded/**/config.h
embedded/**/secrets.h
```

Use placeholder values in committed ESP32 code.

## Git Workflow

Before beginning new work:

```powershell
git pull --rebase origin main
git status
```

After completing a working milestone:

```powershell
git add <changed-files>
git commit -m "Clear description of change"
git push
```

Check synchronization:

```powershell
git status
git log --oneline -5
```

A healthy final status is:

```text
nothing to commit, working tree clean
```

Do not use force-push for normal project work.

## Next Recommended Milestones

1. Connect and test one NC reed switch with the ESP32.
2. Add state-change detection and open/closed event sending.
3. Add a local ESP32 secrets file ignored by Git.
4. Refactor the ESP32 POST logic into a reusable `sendEvent()` function.
5. Add an API key requirement to `POST /api/events`.
6. Update PowerShell and ESP32 senders to include that API key.
7. Add basic “last event received” information to the dashboard.
8. Later, add motion hardware, alerts, user authentication, and HTTPS deployment.

## New-Chat / Assistant Handoff

When continuing this project in a new chat, provide the repository link and ZIP if available.

Suggested prompt:

```text
I am continuing my Secure Smart Home System project.

Repository:
https://github.com/JRod0414/secure-smart-home-system

Please inspect the README and current files before suggesting changes.

Current state:
- The Express backend, SQLite database, browser dashboard, filtering, validation, and ESP32 HTTP test sender work.
- The ESP32 successfully sent an event to the backend over local Wi-Fi and it appeared in the dashboard.
- NC magnetic reed switches are the next hardware step.
- The next milestone is reading one reed switch with INPUT_PULLUP, detecting only state changes, and sending door open/closed events to the existing API.
- Do not change the current API event shape unless there is a clear reason.
- Keep Wi-Fi credentials, local server IPs, and API keys out of GitHub.
- Explain changes clearly, identify exact files to edit, and test each step before moving on.
```

## License

Educational and portfolio project.
