// ─── FloodVision ESP32 Firmware ───────────────────────────────────────────────
// HC-SR04 Ultrasonic Sensor + WiFi HTTP to Django espdata backend
//
// Wiring:
//   TRIG → GPIO 5
//   ECHO → GPIO 18
//   VCC  → 5V (or 3.3V for 3.3V-tolerant sensor)
//   GND  → GND
//
// Instructions:
//   1. Set your hotspot SSID & password below.
//   2. Flash to ESP32 via Arduino IDE (Board: "ESP32 Dev Module").
//   3. Open Serial Monitor at 115200 baud to watch logs.
// ─────────────────────────────────────────────────────────────────────────────

#include <WiFi.h>
#include <HTTPClient.h>

// ─── WiFi credentials (laptop hotspot) ───────────────────────────────────────
const char* ssid     = "Rehan's Laptop";
const char* password = "rehan123";

// ─── Django espdata backend ───────────────────────────────────────────────────
// This is the laptop's IP on the hotspot network.
const char* serverUrl = "http://10.111.152.66:8000/espdata/reading/";

// ─── Sensor pins ─────────────────────────────────────────────────────────────
#define TRIG_PIN 5
#define ECHO_PIN 18

// ─── Flood detection threshold (must match Django FLOOD_THRESHOLD_CM) ─────────
#define FLOOD_THRESHOLD_CM 30.0

// ─── Reading interval ────────────────────────────────────────────────────────
#define READING_INTERVAL_MS 1000

// ─────────────────────────────────────────────────────────────────────────────

void connectWiFi() {
  Serial.printf("\n[WiFi] Connecting to '%s'", ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++attempts > 40) {
      Serial.println("\n[WiFi] Failed to connect. Restarting...");
      ESP.restart();
    }
  }

  Serial.println();
  Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
}

float measureDistance() {
  // Clear the trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  // Send 10µs pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo duration (timeout = 30ms → ~5m max range)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration == 0) {
    return -1.0;  // sensor timeout / no echo
  }

  // Distance = (duration × speed of sound) / 2
  // Speed of sound ≈ 0.034 cm/µs at room temperature
  return duration * 0.034 / 2.0;
}

void sendToBackend(float distance_cm) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi disconnected, reconnecting...");
    connectWiFi();
    return;
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  String payload = "{\"distance_cm\":" + String(distance_cm, 2) + "}";

  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.printf("[HTTP] POST OK (%d): %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("[HTTP] POST failed. Code: %d\n", httpCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== FloodVision ESP32 Sensor Node ===");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  connectWiFi();

  Serial.println("[System] HC-SR04 ready. Starting readings...\n");
}

void loop() {
  float distance = measureDistance();

  if (distance < 0) {
    Serial.println("[Sensor] Error: No echo received (check wiring / range)");
  } else {
    Serial.printf("[Sensor] Distance: %.2f cm", distance);

    if (distance < FLOOD_THRESHOLD_CM) {
      Serial.print("  ⚠ FLOOD ALERT!");
    }
    Serial.println();

    // Send reading to Django backend
    sendToBackend(distance);
  }

  delay(READING_INTERVAL_MS);
}