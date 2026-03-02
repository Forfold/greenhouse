TARGET  := esp32-coreboard-v2
PORT    := /dev/cu.SLAB_USBtoUART
BAUD    := 115200

.PHONY: flash-temp flash-soil monitor help

flash-temp:
	tinygo flash -target=$(TARGET) -port=$(PORT) ./cmd/temp/

flash-soil:
	tinygo flash -target=$(TARGET) -port=$(PORT) ./cmd/soil/

monitor:
	tinygo monitor -port=$(PORT) -baudrate $(BAUD)

help:
	@echo "Usage:"
	@echo "  make flash-temp   Flash the temp/humidity board"
	@echo "  make flash-soil   Flash the soil moisture board"
	@echo "  make monitor      Open serial monitor (115200 baud)"
