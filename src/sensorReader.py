#!/usr/bin/env python
import time
import bme680
import sqlite3
import json

db_path = "../resources/weather.db"
json_path = "weatherData/liveData.json"

sensor = bme680.BME680()

sensor.set_humidity_oversample(bme680.OS_2X)
sensor.set_pressure_oversample(bme680.OS_4X)
sensor.set_temperature_oversample(bme680.OS_8X)
sensor.set_filter(bme680.FILTER_SIZE_3)

sensor.set_gas_status(bme680.ENABLE_GAS_MEAS)
sensor.set_gas_heater_temperature(320)
sensor.set_gas_heater_duration(150)
sensor.select_gas_heater_profile(0)

temp_data = []
humidity_data = []
pressure_data = []
air_quality_data = []
counter = 0  # Count to 60min, save when counter at 3600

db = sqlite3.connect(db_path)
db_cursor = db.cursor()
db_cursor.execute("CREATE TABLE IF NOT EXISTS temperature(date NUMERIC, value NUMERIC)")
db_cursor.execute("CREATE TABLE IF NOT EXISTS humidity(date NUMERIC, value NUMERIC)")
db_cursor.execute("CREATE TABLE IF NOT EXISTS pressure(date NUMERIC, value NUMERIC)")
db_cursor.execute("CREATE TABLE IF NOT EXISTS airQuality(date NUMERIC, value NUMERIC)")


def calc_min_avg_max(data, data_amount):  # Calculates the minimum, average and maximum value of a list
	average = 0
	for i in range(0, data_amount - 1):
		average += data[i]

	average = round(average / counter, 2)
	return average


try:
	while True:
		if counter == 3600:  # save data to database
			avg_temperature = calc_min_avg_max(temp_data, counter)
			avg_humidity = calc_min_avg_max(humidity_data, counter)
			avg_pressure = calc_min_avg_max(pressure_data, counter)
			avg_air_quality = calc_min_avg_max(air_quality_data, counter)

			temp_data = []
			humidity_data = []
			pressure_data = []
			air_quality_data = []

			unix_time = round(time.time())

			db_cursor.execute("INSERT INTO temperature(date, value) VALUES(?, ?)", (unix_time, avg_temperature))
			db_cursor.execute("INSERT INTO humidity(date, value) VALUES(?, ?)", (unix_time, avg_humidity))
			db_cursor.execute("INSERT INTO pressure(date, value) VALUES(?, ?)", (unix_time, avg_pressure))
			db_cursor.execute("INSERT INTO airQuality(date, value) VALUES(?, ?)", (unix_time, avg_air_quality))
			db.commit()

			counter = 0

		if sensor.get_sensor_data():
			cur_temperature = sensor.data.temperature - 3.5
			cur_humidity = round(sensor.data.humidity, 2)
			cur_pressure = sensor.data.pressure
			cur_air_quality = sensor.data.gas_resistance

			temp_data.append(cur_temperature)
			humidity_data.append(cur_humidity)
			pressure_data.append(cur_pressure)
			air_quality_data.append(cur_air_quality)

		counter += 1
		time.sleep(1)
except KeyboardInterrupt:
	pass
