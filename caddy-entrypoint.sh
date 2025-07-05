#!/bin/sh

CONFIG_FILE="/config/caddy/autosave.json"
INITIAL_CONFIG="/etc/caddy/caddy_initial.json"

# If no autosave file exists, copy the initial config
if [ ! -f "$CONFIG_FILE" ]; then
    cp "$INITIAL_CONFIG" "$CONFIG_FILE"
fi

# Start Caddy with the autosaved config
exec caddy run --config "$CONFIG_FILE"
