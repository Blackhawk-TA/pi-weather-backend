/**
 * This is an independent nodejs script which fetches data from the Database and writes the data formatted to a JSON file
 */
const sqlite = require("sqlite3").verbose();
const express = require("express");
const directory = require('serve-index');
const cors = require("cors");
const fs = require("fs");

const sDatabasePath = "../resources/weather.db";
const iOneHour = 3600000;

function initBackendServer() {
	let app = express(),
		port = process.env.PORT || 4000;

	app.use(cors());
	app.use(directory(__dirname + "/weatherData", {}));
	app.use(express.static(__dirname + "/weatherData"));

	app.listen(port);
	console.log(`Server started running: http://localhost:${port}`);
}

function fetchData(iTimespan) {
	const aTables = ["temperature", "humidity", "pressure", "airQuality"];
	let iTimespanInSec = iTimespan * 24 * 60 * 60,
		iCurTimeInSec = Math.round(new Date().getTime() / 1000),
		iMinAllowedDate = iCurTimeInSec - iTimespanInSec;

	if (!fs.existsSync("../resources")) {
		fs.mkdirSync("../resources");
	}

	let oDatabase = new sqlite.Database(sDatabasePath, (err) => {
		if (err) return console.error(err.message);
		console.log("Connected to SQLite database " + sDatabasePath);
	});

	aTables.forEach((sTable) => {
		oDatabase.all(`SELECT * FROM ${sTable} WHERE date > ${iMinAllowedDate}`, [], (err, aRows) => {
			if (err) throw err;
			let aValues = [],
				aMinValues = [],
				aAvgValues = [],
				aMaxValues = [],
				aExtremeValues = [],
				iTimespanModifier,
				iAverage = 0,
				index = 0,
				sJsonFolderPath = "../weatherData/",
				sJsonPath = sJsonFolderPath + sTable + ".json",
				oData = {};

			aRows.forEach((oRow) => {
				aValues.push(oRow.value);
			});

			switch (iTimespan) {
				case 1:
					iTimespanModifier = Math.floor(aValues.length / 24);
					break;
				case 365:
					iTimespanModifier = Math.floor(aValues.length / 12);
					break;
				default:
					iTimespanModifier = Math.floor(aValues.length / iTimespan);
					break;
			}

			for (let i = 0; i < aValues.length; i++) {
				iAverage += aValues[i];
				aExtremeValues.push(aValues[i]);
				if ((i !== 0 && i % (iTimespanModifier - 1) === 0) || iTimespanModifier === 1) {
					aAvgValues[index] = Number((iAverage / iTimespanModifier).toFixed(2));

					// No min/max data when iTimespan is one day
					if (iTimespanModifier !== 1) {
						aMinValues[index] = Math.min.apply(Math, aExtremeValues);
						aMaxValues[index] = Math.max.apply(Math, aExtremeValues);
						aExtremeValues = [];
					}

					//Reset
					iAverage = 0;
					index++;
				}
			}

			if (fs.existsSync(sJsonPath)) {
				oData = require(sJsonPath);
			} else if (!fs.existsSync(sJsonFolderPath)) {
				fs.mkdirSync(sJsonFolderPath);
			}

			oData[iTimespan] = {
				"min": aMinValues,
				"avg": aAvgValues,
				"max": aMaxValues
			};

			fs.writeFile(sJsonPath, JSON.stringify(oData, null, 4), "utf-8", (err) => {
				if (err) throw err;
				console.log(`Updated ${sTable} for timespan ${iTimespan}`);
			});
		});
	});

	oDatabase.close((err) => {
		if (err) throw err;
		console.log("Closed the database connection.");
	});
}

function executeFetch() {
	fetchData(1);
	fetchData(7);
	fetchData(30);
	fetchData(365);
}

initBackendServer();
// executeFetch();
// setInterval(() => executeFetch(), iOneHour);
