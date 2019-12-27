#!/usr/bin/env python3

import sqlite3
import time


def init_database(db_path):
	db = sqlite3.connect(db_path)
	db_cursor = db.cursor()
	db_cursor.execute("CREATE TABLE IF NOT EXISTS temperature(date NUMERIC, value NUMERIC)")
	db_cursor.execute("CREATE TABLE IF NOT EXISTS humidity(date NUMERIC, value NUMERIC)")
	db_cursor.execute("CREATE TABLE IF NOT EXISTS pressure(date NUMERIC, value NUMERIC)")
	db_cursor.execute("CREATE TABLE IF NOT EXISTS airQuality(date NUMERIC, value NUMERIC)")
	return db


def calc_average(data, counter):  # Calculates the minimum, average and maximum value of a list
	average = 0
	for i in range(0, len(data)):
		average += data[i]

	average = round(average / counter, 2)
	return average


def write_to_database(db, counter, temp_data, humidity_data, pressure_data, air_quality_data):
	db_cursor = db.cursor()

	avg_temperature = calc_average(temp_data, counter)
	avg_humidity = calc_average(humidity_data, counter)
	avg_pressure = calc_average(pressure_data, counter)
	avg_air_quality = calc_average(air_quality_data, counter)

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
	print("Pushed to database.")
	counter = 0

	return counter, temp_data, humidity_data, pressure_data, air_quality_data
