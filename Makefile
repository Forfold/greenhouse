PORT    := /dev/cu.SLAB_USBtoUART
BAUD    := 115200

.PHONY: flash-temp flash-soil monitor help

flash-temp:
	~/.platformio/penv/bin/pio run -t upload -d arduino/temp

monitor:
	~/.platformio/penv/bin/pio device monitor -p $(PORT) -b $(BAUD)

help:
	@echo "Usage:"
	@echo "  make flash-temp   Compile and flash the temp/humidity board (PlatformIO)"
	@echo "  make monitor      Open serial monitor (115200 baud)"
