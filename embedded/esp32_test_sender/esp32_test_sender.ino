#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

void setup() {
  Serial.begin(9600);

  WiFi.begin(ssid, password);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("Wi-Fi connected");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());

  WiFiClient client;
  HTTPClient http;

  Serial.println("Sending test sensor event...");

  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", deviceApiKey);

  String jsonEvent =
    "{\"device_id\":\"esp32_1\","
    "\"sensor_type\":\"door\","
    "\"event\":\"open\"}";

  int responseCode = http.POST(jsonEvent);

  Serial.print("HTTP response code: ");
  Serial.println(responseCode);

  if (responseCode > 0) {
    String responseBody = http.getString();

    Serial.println("Server response:");
    Serial.println(responseBody);
  } else {
    Serial.println("Request failed. Check IP address, backend, and firewall.");
  }

  http.end();
}

void loop() {
  // Sends once each time the ESP32 starts or resets.
}