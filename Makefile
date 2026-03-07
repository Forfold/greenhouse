PORT       := /dev/cu.SLAB_USBtoUART
BAUD       := 115200
SERVER_URL ?= http://localhost:3000
API_KEY    ?= $(shell grep -E '^API_KEY=' server/.env | cut -d= -f2-)
COUNT      ?= 1

.PHONY: flash-temp flash-soil monitor limit update-limit format-server help

flash-temp:
	~/.platformio/penv/bin/pio run -t upload -d arduino/temp

monitor:
	~/.platformio/penv/bin/pio device monitor -p $(PORT) -b $(BAUD)

# Usage: make limit CONFIG_ID=<uuid> VALUE=99 UNIT=fahrenheit PERIOD=hour TYPE=threshold DIRECTION=above [COUNT=1]
limit:
	curl -s -X POST $(SERVER_URL)/limits \
	  -H "Content-Type: application/json" \
	  -H "x-api-key: $(API_KEY)" \
	  -d '{"configID":"$(CONFIG_ID)","limitValue":$(VALUE),"limitUnit":"$(UNIT)","period":"$(PERIOD)","periodCount":$(COUNT),"type":"$(TYPE)","direction":"$(DIRECTION)"}' \
	  | jq .

# Usage: make update-limit ID=<uuid> BODY='{"limitValue":105}'
update-limit:
	curl -s -X PATCH $(SERVER_URL)/limits/$(ID) \
	  -H "Content-Type: application/json" \
	  -H "x-api-key: $(API_KEY)" \
	  -d '$(BODY)' \
	  | jq .

format-server:
	cd server && npm run lint -- --fix && cd ..

help:
	@echo "Usage:"
	@echo "  make flash-temp                      Compile and flash the temp/humidity board (PlatformIO)"
	@echo "  make monitor                         Open serial monitor (115200 baud)"
	@echo "  make limit CONFIG_ID=<uuid> VALUE=99 UNIT=fahrenheit PERIOD=hour TYPE=threshold DIRECTION=above"
	@echo "  make update-limit ID=<uuid> BODY='{\"limitValue\":105}'"
	@echo "  make format-server                   Auto-fix ESLint issues in server/src"
