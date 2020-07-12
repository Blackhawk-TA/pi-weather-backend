package main

import (
	"encoding/json"
	"log"
	"net/http"
)

type DataCollection struct {
	Avg []float64
	Min []float64
	Max []float64
}

type Timespan struct {
	Day   DataCollection
	Week  DataCollection
	Month DataCollection
	Year  DataCollection
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/temperature":
			fallthrough
		case "/humidity":
			fallthrough
		case "/pressure":
			fallthrough
		case "/airQuality":
			data, err := fetchData(r.URL.Path)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			writeData(w, data)
			break
		default:
			http.Error(w, "400 - Bad Request", http.StatusBadRequest)
			break
		}
	})
	log.Fatal(http.ListenAndServe(":4000", nil))
}

func writeData(writer http.ResponseWriter, data Timespan) {
	res, jsonErr := json.Marshal(data)

	if jsonErr != nil {
		http.Error(writer, jsonErr.Error(), http.StatusInternalServerError)
		return
	}

	writer.Header().Set("Content-Type", "application/json")
	_, writeErr := writer.Write(res)

	if writeErr != nil {
		http.Error(writer, writeErr.Error(), http.StatusInternalServerError)
		return
	}
}

func fetchData(dataSet string) (Timespan, error) {
	var data = []float64{1.23, 5.43}
	dataCollection := DataCollection{data, data, data}
	timespanData := Timespan{dataCollection, dataCollection, dataCollection, dataCollection}

	return timespanData, nil
}
