#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import bme680
import json
import time
import os
from dotenv import load_dotenv


class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
	sensor = bme680.BME680()

	sensor.set_humidity_oversample(bme680.OS_2X)
	sensor.set_pressure_oversample(bme680.OS_4X)
	sensor.set_temperature_oversample(bme680.OS_8X)
	sensor.set_filter(bme680.FILTER_SIZE_3)

	sensor.set_gas_status(bme680.ENABLE_GAS_MEAS)
	sensor.set_gas_heater_temperature(320)
	sensor.set_gas_heater_duration(150)
	sensor.select_gas_heater_profile(0)

	live_data = {
		"temperature": 0,
		"humidity": 0,
		"pressure": 0,
		"airQuality": 0
	}

	def do_GET(self):
		if self.sensor.get_sensor_data():
			self.live_data = {
				"temperature": round(self.sensor.data.temperature - 3.5, 2),
				"humidity": round(self.sensor.data.humidity, 2),
				"pressure": round(self.sensor.data.pressure, 2),
				"airQuality": round(self.sensor.data.gas_resistance)
			}

		response = json.dumps(self.live_data)
		self.send_response(200)
		self.send_header("Access-Control-Allow-Credentials", "true")
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Content-type", "text/json")
		self.end_headers()
		self.wfile.write(str.encode(response))
		self.wfile.flush()


load_dotenv()
server_ip = os.getenv("BACKEND_LIVE_SRV_IP")
server_port = os.getenv("BACKEND_LIVE_SRV_PORT")

time.sleep(300)  # Timout for sensor calibration

httpd = HTTPServer((server_ip, server_port), SimpleHTTPRequestHandler)
httpd.serve_forever()
