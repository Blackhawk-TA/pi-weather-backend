#!/bin/sh
python ./src/liveDataToDB.py &
node ./src/databaseConnector.js &
