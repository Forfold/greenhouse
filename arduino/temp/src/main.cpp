#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHTesp.h>
#include "config.h"

DHTesp sensor1;
DHTesp sensor2;

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi reconnected: " + WiFi.localIP().toString());
  } else {
    Serial.printf("WiFi reconnect failed, status=%d\n", WiFi.status());
  }
}

void postReadings(float temp1, float hum1, float temp2, float hum2) {
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/readings");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);

  char body[128];
  snprintf(body, sizeof(body),
    "{\"board\":\"temperature\",\"sensor1\":{\"tempF\":%.1f,\"humidity\":%.1f},\"sensor2\":{\"tempF\":%.1f,\"humidity\":%.1f}}",
    temp1, hum1, temp2, hum2);

  int code = http.POST(body);
  Serial.printf("POST %d\n", code);
  http.end();
}

void setup() {
  Serial.begin(115200);
  sensor1.setup(13, DHTesp::DHT22); // D13 on board
  sensor2.setup(4, DHTesp::DHT22); // D04 on board
  delay(2000);  // DHT22 needs >1s after power-up
  Serial.printf("Connecting to %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void loop() {
  TempAndHumidity d1 = sensor1.getTempAndHumidity();
  TempAndHumidity d2 = sensor2.getTempAndHumidity();

  bool ok1 = !isnan(d1.temperature) && !isnan(d1.humidity);
  bool ok2 = !isnan(d2.temperature) && !isnan(d2.humidity);

  float temp1F = ok1 ? sensor1.toFahrenheit(d1.temperature) : 0;
  float temp2F = ok2 ? sensor2.toFahrenheit(d2.temperature) : 0;

  if (ok1) {
    Serial.printf("sensor1: %.1fF  %.1f%% humid\n", temp1F, d1.humidity);
  } else {
    Serial.println("sensor1 error");
  }

  if (ok2) {
    Serial.printf("sensor2: %.1fF  %.1f%% humid\n", temp2F, d2.humidity);
  } else {
    Serial.println("sensor2 error");
  }

  if (ok1 && ok2) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("IP: " + WiFi.localIP().toString());
      postReadings(temp1F, d1.humidity, temp2F, d2.humidity);
    }
  }

  Serial.println();
  delay(30000);  // wait 30s between readings
}
