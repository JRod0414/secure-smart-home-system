# Secure Smart Home System Architecture

## Project Goal
Build a secure smart home system with embedded sensors, a backend API, a frontend dashboard, and core cybersecurity protections.

## System Components

### Embedded Layer
- Door sensor
- Motion sensor
- Microcontroller (ESP32 or Arduino)

### Backend Layer
- REST API server
- Event storage
- Alert logic (later phase)

### Frontend Layer
- Dashboard for viewing sensor activity
- User login (later phase)

### Security Layer
- Device authentication
- User authentication
- HTTPS encryption
- Trusted device validation

## High-Level Data Flow

1. A sensor detects an event.
2. The microcontroller packages the event as JSON.
3. The device sends the event to the backend API over HTTP.
4. The backend validates the device and stores the event.
5. The frontend dashboard requests event data from the backend.
6. The dashboard displays recent activity.
7. Later, the backend can trigger alerts for important events.

## Communication Protocol

### Devices to Backend
- Protocol: HTTP
- Format: JSON

Example payload:

```json
{
  "device_id": "door_1",
  "sensor_type": "door",
  "event": "open",
  "timestamp": "2026-03-29T12:00:00Z"
}