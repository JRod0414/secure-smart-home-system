# Secure Smart Home System

> An in-development secure IoT monitoring system that connects ESP32-based sensors to a backend API and web dashboard.

## Overview

This project is a full-stack IoT smart-home monitoring system designed to explore embedded systems, web development, networking, and cybersecurity.

The system will collect events from physical sensors, send them securely to a backend server, store the events in a database, and display recent activity through a web dashboard.

## Project Status

**Status:** In development

### Current Progress

* [x] GitHub repository and project board created
* [x] High-level system architecture documented
* [x] HTTP and JSON communication format defined
* [x] ESP32 development environment tested
* [ ] Read door sensor input with ESP32
* [x] Build backend API
* [x] Store and retrieve sensor events
* [x] Create web dashboard
* [ ] Add device authentication and request validation
* [ ] Record an end-to-end demo

## System Architecture

```text
Door / Motion Sensor
        ↓
      ESP32
        ↓  HTTP + JSON
   Backend REST API
        ↓
     Database
        ↓
 Web Monitoring Dashboard
```

## Planned Technology Stack

| Area            | Technologies                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| Embedded system | ESP32, Arduino framework, magnetic reed switch, motion sensor                            |
| Communication   | HTTP, JSON                                                                               |
| Backend         | REST API, database                                                                       |
| Frontend        | Web dashboard                                                                            |
| Security        | HTTPS, device identification, API keys or signed requests, JWT-based user authentication |

## Event Data Format

The ESP32 will send sensor events to the backend as JSON:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-06-21T12:00:00Z"
}
```

## Planned API Endpoints

| Method | Endpoint      | Purpose                                  |
| ------ | ------------- | ---------------------------------------- |
| `POST` | `/api/events` | Receive sensor events from devices       |
| `GET`  | `/api/events` | Retrieve stored events for the dashboard |

## Security Goals

The system will be built in phases:

1. Encrypt device-to-server communication with HTTPS.
2. Verify device identity using API keys, tokens, or signed requests.
3. Authenticate dashboard users with JWT-based authentication.
4. Validate incoming data and document potential threats and mitigations.

## Repository Structure

```text
secure-smart-home-system/
├── embedded/     # ESP32 firmware and sensor code
├── backend/      # API server and database logic
├── frontend/     # Web monitoring dashboard
├── security/     # Threat model and authentication work
└── docs/         # Architecture and project documentation
```

## Team

* **Jared** — Embedded systems, sensor integration, device-to-backend communication
* **Charlie** — Backend API, database, and frontend dashboard
* **Riley** — Authentication, device validation, and threat modeling

## Roadmap

The immediate milestone is an end-to-end proof of concept:

1. Detect a door open/close event with an ESP32.
2. Send that event to the backend.
3. Store the event.
4. Display it on the dashboard.

## Future Improvements

* Real-time dashboard updates with WebSockets
* Alerts for unexpected door or motion events
* MQTT comparison with HTTP-based communication
* Automated tests and CI checks
* Deployment of the backend and dashboard

## License

This project is currently for educational and portfolio use.
