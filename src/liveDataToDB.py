#!/usr/bin/env python3
# This is used to read the data from the LiveDataServer and write it to the database
# It is only required when the database runs on a different device than the sensor

import os
import time
import urllib.request
import json
from utils import database as db_utils
from dotenv import load_dotenv
load_dotenv()

server_ip = os.getenv("BACKEND_LIVE_SRV_IP")
server_port = os.getenv("BACKEND_LIVE_SRV_PORT")
server_url = "http://" + server_ip + ":" + server_port + "/"
counter = 0  # Count to 60min, save when counter at 3600

db_path = "./resources/weather.db"
db = db_utils.init_database(db_path)

temp_data = []
humidity_data = []
pressure_data = []
air_quality_data = []

while True:
	try:
		with urllib.request.urlopen(server_url, timeout=2) as url:
			data = json.loads(url.read().decode())
			cur_temperature = data["temperature"]
			cur_humidity = data["humidity"]
			cur_pressure = data["pressure"]
			cur_air_quality = data["airQuality"]

			if cur_temperature != cur_humidity != cur_pressure != cur_air_quality:
				temp_data.append(cur_temperature)
				humidity_data.append(cur_humidity)
				pressure_data.append(cur_pressure)
				air_quality_data.append(cur_air_quality)

			if counter >= 3600:  # save data to database
				counter, temp_data, humidity_data, pressure_data, air_quality_data = db_utils.write_to_database(
					db,
					counter,
					temp_data,
					humidity_data,
					pressure_data,
					air_quality_data
				)

	except Exception as error:
		print("Error" + repr(error))
		pass

	counter += 1
	time.sleep(1)
