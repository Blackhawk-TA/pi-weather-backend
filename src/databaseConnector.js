//TODO remove all nodejs related stuff
/**
 * This is an independent nodejs script which fetches data from the Database and writes the data formatted to a JSON file
 */
const sqlite = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");
const sDatabasePath = __dirname + "/../resources/weather.db";
const iOneDaySec = 86400;

const aTables = ["temperature", "humidity", "pressure", "airQuality"];
const aTimespans = [1, 7, 30, 365];

/**
 * Start server to allow json files to be accessed from outside
 */
function initBackendServer() {
	let app = express(),
		port = process.env.PORT || 4000;

	aTables.forEach((sTable) => {
		app.use(cors());
		app.use("/" + sTable, (req, res) => {
			let oDatabase = new sqlite.Database(sDatabasePath, (err) => {
				if (err) return console.error(err.message);
			});

			fetchData(oDatabase, sTable, aTimespans).then((fulfilled) => {
				res.send(fulfilled);
				oDatabase.close((err) => {
					if (err) throw err;
					console.log("Data request successful.");
				});
			});
		});
	});
	app.listen(port);

	console.log(`Server started running: http://localhost:${port}/`);
}

/**
 * Fetches the data of the given timespans from the database and calculates the average, min./max.
 * The result is stored in json files.
 *
 * @param aTimespans {number[]} The timespans in which the data shall be collected
 * @param sDatabaseTable {string} The name of the database table which shall be accessed
 * @param oDatabase {object} The database to fetch the data from
 */
function fetchData(oDatabase, sDatabaseTable, aTimespans) {
	return new Promise((resolve) => {
		let iMaxTimespanInSec = Math.max.apply(Math, aTimespans) * iOneDaySec,
			iCurTimeInSec = Math.round(new Date().getTime() / 1000),
			iMinAllowedDate = iCurTimeInSec - iMaxTimespanInSec;

		oDatabase.all(`SELECT * FROM ${sDatabaseTable} WHERE date > ${iMinAllowedDate}`, [], (err, aRows) => {
			if (err) throw err;
			let oData = {},
				aMinValues,
				aAvgValues,
				aMaxValues,
				aExtremeValues,
				iValuesSum = 0,
				iPreviousDate,
				iValue,
				iValuesAmount = 0,
				iExpectedValueAmount,
				iValueDifference,
				iTimespanInSec,
				iRelMinAllowedDate;

			aTimespans.forEach((iTimespan) => {
				aMinValues = [];
				aAvgValues = [];
				aMaxValues = [];
				aExtremeValues = [];

				iExpectedValueAmount = getExpectedValueAmount(iTimespan);
				iTimespanInSec = iTimespan * iOneDaySec;
				iRelMinAllowedDate = iCurTimeInSec - iTimespanInSec;

				for (let i = 1; i < aRows.length; i++) {
					if (aRows[i].date > iRelMinAllowedDate) {
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
			});
			resolve(oData);
		});
	});
}

/**
 * Gets the expected amount of values which should be displayed for a specific timespan
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

initBackendServer();
