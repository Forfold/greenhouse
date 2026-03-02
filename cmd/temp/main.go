package main

import (
	"fmt"
	"machine"
	"time"

	"tinygo.org/x/drivers/dht"
)

func main() {
	// dht.New auto-manages the 2s minimum interval between reads
	sensor1 := dht.New(machine.GPIO13, dht.DHT22) // GPi013 = D13 on board
	sensor2 := dht.New(machine.GPIO4, dht.DHT22) // GPI04 = D4 on board

	// DHT22 needs >1s after power-up before first read
	time.Sleep(time.Second * 2)

	for {
		temp, err := sensor1.TemperatureFloat(dht.F)
		hum, err2 := sensor1.HumidityFloat()
		if err != nil || err2 != nil {
			println("sensor1 error")
		} else {
			fmt.Printf("sensor1: %.1fF  %.1f%%\n", temp, hum)
		}

		temp, err = sensor2.TemperatureFloat(dht.F)
		hum, err2 = sensor2.HumidityFloat()
		if err != nil || err2 != nil {
			println("sensor2 error")
		} else {
			fmt.Printf("sensor2: %.1fF  %.1f%%\n", temp, hum)
		}

		time.Sleep(2 * time.Second)
	}
}
