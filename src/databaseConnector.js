/**
 * This is an independent nodejs script which fetches data from the Database and writes the data formatted to a JSON file
 */
const sqlite = require("sqlite3").verbose();
const express = require("express");
const directory = require('serve-index');
const cors = require("cors");
const fs = require("fs");

const sDatabasePath = __dirname + "/../resources/weather.db";
const iOneHourMs = 3600000;
const iOneDaySec = 86400;
const aTables = ["temperature", "humidity", "pressure", "airQuality"];

/**
 * Start server to allow json files to be accessed from outside
 */
function initBackendServer() {
	let app = express(),
		port = process.env.PORT || 4000;

	app.use(cors());
	app.use(directory(__dirname + "/weatherData", {}));
	app.use(express.static(__dirname + "/weatherData"));

	app.listen(port);

	console.log(`Server started running: http://localhost:${port}/`);
}

/**
 * Fetches the data of a specific timespan from the database and calculates the average, min./max.
 * The result is stored in json files.
 *
 * @param iTimespan {number} The timespan in which the data shall be collected
 * @param aDatabaseTables {string[]} The name of the database tables which shall be accessed
 */
function fetchData(iTimespan, aDatabaseTables) {
	return new Promise((resolve) => {
		let iTimespanInSec = iTimespan * iOneDaySec,
			iCurTimeInSec = Math.round(new Date().getTime() / 1000),
			iMinAllowedDate = iCurTimeInSec - iTimespanInSec;

		if (!fs.existsSync(__dirname + "/../resources/weather.db")) {
			fs.mkdirSync(__dirname + "/../resources/weather.db");
		}

		let oDatabase = new sqlite.Database(sDatabasePath, (err) => {
			if (err) return console.error(err.message);
			console.log("Connected to SQLite database " + sDatabasePath);
		});

		aDatabaseTables.forEach((sTable) => {
			oDatabase.all(`SELECT * FROM ${sTable} WHERE date > ${iMinAllowedDate}`, [], (err, aRows) => {
				if (err) throw err;
				let aMinValues = [],
					aAvgValues = [],
					aMaxValues = [],
					aExtremeValues = [],
					iValuesSum = 0,
					sJsonFolderPath = __dirname + "/weatherData/",
					sJsonPath = sJsonFolderPath + sTable + ".json",
					oData = {},
					iPreviousDate,
					iValue,
					iValuesAmount = 0,
					iExpectedValueAmount = getExpectedValueAmount(iTimespan),
					iValueDifference;

				for (let i = 1; i < aRows.length; i++) {
					iPreviousDate = getDateScale(aRows[i - 1].date, iTimespan);
					iValue = aRows[i - 1].value;
					iValuesSum += iValue;
					iValuesAmount++;
					aExtremeValues.push(iValue);

					if (iPreviousDate !== getDateScale(aRows[i].date, iTimespan)) {
						if (iTimespan !== 1) {
							aMinValues.push(Math.min.apply(Math, aExtremeValues));
							aMaxValues.push(Math.max.apply(Math, aExtremeValues));
						}
						aAvgValues.push(Number((iValuesSum / iValuesAmount).toFixed(2)));

						if (iValuesAmount > 1) {
							aExtremeValues = [];
							iValuesSum = 0;
							iValuesAmount = 0;
						}
					}
				}

				if (fs.existsSync(sJsonPath)) {
					oData = require(sJsonPath);
				} else if (!fs.existsSync(sJsonFolderPath)) {
					fs.mkdirSync(sJsonFolderPath);
				}

				if (aAvgValues.length < iExpectedValueAmount) {
					iValueDifference = iExpectedValueAmount - aAvgValues.length;
					for (let i = 0; i < iValueDifference; i++) {
						aAvgValues.unshift(null);
						if (iTimespan !== 1) {
							aMinValues.unshift(null);
							aMaxValues.unshift(null);
						}
					}
				}

				oData[iTimespan] = {
					"min": aMinValues,
					"avg": aAvgValues,
					"max": aMaxValues
				};

				fs.writeFile(sJsonPath, JSON.stringify(oData, null, 4), "utf-8", (err) => {
					if (err) throw err;
					console.log(`Updated ${sTable} for timespan ${iTimespan}`);
					resolve();
				});
			});
		});

		oDatabase.close((err) => {
			if (err) throw err;
			console.log("Closed the database connection.");
		});
	});
}

/**
 * Gets tge expected amount of values which should be displayed for a specific timespan
 * @param iTimespan {number} The timespan in which the data shall be displayed
 * @returns {number} The amount of expected values
 */
function getExpectedValueAmount(iTimespan) {
	let iExpectedValueAmount;

	switch (iTimespan) {
		case 1:
			iExpectedValueAmount = 24;
			break;
		case 365:
			iExpectedValueAmount = 12;
			break;
		default:
			iExpectedValueAmount = iTimespan;
			break;
	}

	return iExpectedValueAmount;
}

/**
 * Gets the scale in which the data is stored (e.g. hours, days, months)
 * @param iUnixTime {number} The unix time without milliseconds
 * @param iTimespan {number} The timespan in which the data is collected
 * @returns {number} The date part according to the scale
 */
function getDateScale(iUnixTime, iTimespan) {
	let iDatePart;
	iUnixTime *= 1000;

	switch (iTimespan) {
		case 1:
			iDatePart = new Date(iUnixTime).getHours();
			break;
		case 7:
			iDatePart = new Date(iUnixTime).getDay();
			break;
		case 30:
			iDatePart = new Date(iUnixTime).getDate();
			break;
		case 365:
			iDatePart = new Date(iUnixTime).getMonth();
			break;
		default:
			iDatePart = new Date(iUnixTime).getDate();
			break;
	}

	return iDatePart;
}

/**
 * Executes the database fetch for different timespans
 */
function executeFetch() {
	fetchData(1, aTables).then(() => {
		fetchData(7, aTables).then(() => {
			fetchData(30, aTables).then(() => {
				fetchData(365, aTables).then(() => {
				});
			});
		});
	});
}

initBackendServer();
executeFetch();
setInterval(() => executeFetch(), iOneHourMs);
