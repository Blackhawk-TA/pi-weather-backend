#!/usr/bin/env python3
# This is used to read the sensor data directly on the device and write it to the database
# This is only required when the database runs on the same device as the sensor

import time
import bme680
import src.databaseUtils as Utils

db_path = "../resources/weather.db"
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

db = Utils.init_database(db_path)

try:
	while True:
		if counter >= 3600:  # save data to database
			counter, temp_data, humidity_data, pressure_data, air_quality_data = Utils.write_to_database(
				db,
				counter,
				temp_data,
				humidity_data,
				pressure_data,
				air_quality_data
			)

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
except Exception as error:
	print("Error" + repr(error))
	pass
