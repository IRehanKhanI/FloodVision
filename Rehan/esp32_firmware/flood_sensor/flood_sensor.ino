/**
 * FloodVision — ESP32 Flood Sensor Firmware
 * 
 * Hardware:
 * - ESP32 Development Board
 * - HC-SR04 Ultrasonic Sensor (Water Level)
 * - DHT11/22 Sensor (Optional - Temperature/Humidity)
 * 
 * Dependencies:
 * - PubSubClient (MQTT)
 * - NewPing (Ultrasonic)
 * - ArduinoJson
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <NewPing.h>
#include <ArduinoJson.h>
// Optional: Uncomment to enable reading from a DHT temperature sensor
// Requires the DHT sensor library: https://github.com/adafruit/DHT-sensor-library
#define USE_DHT 1
#if USE_DHT
#include <DHT.h>
#define DHTPIN 4     // Change to the GPIO pin where your DHT sensor is connected
#define DHTTYPE DHT22 // or DHT11
#endif

// --- Configuration ---
const char* ssid = "Rehan's Laptop";
const char* password = "rehan123";
// IMPORTANT: set this to the IP address of the MQTT broker reachable from the ESP32
// e.g. the laptop running Mosquitto on the same WiFi network. Do NOT use "localhost" here.
const char* mqtt_server = "10.111.152.66"; // e.g. "192.168.1.10"
const int mqtt_port = 1883;

// Sensor Pins
#define TRIGGER_PIN  5
#define ECHO_PIN     18
#define MAX_DISTANCE 400 // cm

// Node Identity
const char* node_id = "SN-ESP32-DEV";
const char* topic = "floodvision/sensors/SN-ESP32-DEV/data";

WiFiClient espClient;
PubSubClient client(espClient);
NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);
#if USE_DHT
DHT dht(DHTPIN, DHTTYPE);
#endif

unsigned long lastMsg = 0;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(node_id)) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  #if USE_DHT
  dht.begin();
  Serial.println("DHT sensor initialized");
  #endif
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > 5000) { // Every 5 seconds
    lastMsg = now;

    // Read distance
    unsigned int distance_cm = sonar.ping_cm();
    
    // Invert for water level: level = tank_height - distance_to_water
    // Assuming sensor is 200cm above ground
    float tank_height = 200.0;
    float water_level_cm = tank_height - distance_cm;
    if (distance_cm == 0) water_level_cm = 0; // Out of range or error

    // Read temperature (optional DHT) and build JSON payload
    float temperature = 28.5; // fallback if no sensor
    #if USE_DHT
    float t = dht.readTemperature();
    if (!isnan(t)) {
      temperature = t;
    } else {
      Serial.println("DHT read failed, using fallback temperature");
    }
    #endif

    // Create JSON payload
    StaticJsonDocument<256> doc;
    doc["node_id"] = node_id;
    doc["water_level_cm"] = water_level_cm;
    doc["temperature"] = temperature;
    doc["rssi"] = WiFi.RSSI();
    doc["lat"] = 19.0330; // Hardcoded deployment coordinates; update if needed
    doc["lng"] = 72.8438;

    char buffer[256];
    serializeJson(doc, buffer, sizeof(buffer));

    Serial.print("Publishing message: ");
    Serial.println(buffer);
    client.publish(topic, buffer);
  }
}
