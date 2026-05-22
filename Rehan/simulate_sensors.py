import json
import random
import time

import paho.mqtt.client as mqtt

# --- Configuration ---
BROKER = "localhost"
PORT = 1883
TOPIC_TEMPLATE = "floodvision/sensors/{node_id}/data"

SENSORS = [
    {"node_id": "SN-402", "name": "Hindmata Underpass", "lat": 19.0330, "lng": 72.8438, "base_level": 45},
    {"node_id": "SN-219", "name": "Milan Subway", "lat": 19.0895, "lng": 72.8656, "base_level": 22},
    {"node_id": "SN-105", "name": "Andheri Subway", "lat": 19.1136, "lng": 72.8697, "base_level": 12},
    {"node_id": "SN-490", "name": "Bandra Skywalk", "lat": 19.0596, "lng": 72.8295, "base_level": 5},
]

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT Broker at {BROKER}:{PORT}")
    else:
        print(f"Failed to connect, return code {rc}")

def simulate():
    client = mqtt.Client()
    client.on_connect = on_connect

    try:
        client.connect(BROKER, PORT, 60)
    except Exception as e:
        print(f"Error connecting to broker: {e}")
        print("Make sure Mosquitto is running on localhost:1883")
        return

    client.loop_start()

    print("Starting sensor simulation. Press Ctrl+C to stop.")
    
    # Track current levels for smooth transitions
    current_levels = {s["node_id"]: s["base_level"] for s in SENSORS}

    try:
        while True:
            for sensor in SENSORS:
                node_id = sensor["node_id"]
                
                # Random walk for water level
                change = random.uniform(-1, 2) # Slightly biased upwards
                current_levels[node_id] = max(0, current_levels[node_id] + change)
                
                payload = {
                    "node_id": node_id,
                    "name": sensor["name"],
                    "water_level_cm": round(current_levels[node_id], 1),
                    "temperature": round(random.uniform(26, 32), 1),
                    "rssi": random.randint(-85, -45),
                    "lat": sensor["lat"],
                    "lng": sensor["lng"]
                }
                
                topic = TOPIC_TEMPLATE.format(node_id=node_id)
                client.publish(topic, json.dumps(payload))
                print(f"Published to {topic}: {payload['water_level_cm']} cm")
                
            time.sleep(5)
    except KeyboardInterrupt:
        print("\nStopping simulation...")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    simulate()
