#!/bin/bash

PORT=${1:-3030}
PID_FILE="server.pid"
LOG_FILE="server.log"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Server is already running on PID $PID"
        exit 0
    else
        echo "Stale PID file found. Removing..."
        rm "$PID_FILE"
    fi
fi

# Clean previous log
rm -f "$LOG_FILE"

# Start server with nohup
echo "[$(date)] Starting server on port $PORT..."
nohup bun x http-server -a 0.0.0.0 -p $PORT -c-1 > "$LOG_FILE" 2>&1 &

# Capture PID
PID=$!
echo $PID > "$PID_FILE"

# Wait a moment to ensure it doesn't crash immediately
sleep 2

# Verify
if ps -p "$PID" > /dev/null 2>&1; then
    echo "Server started successfully (PID $PID)"
    exit 0
else
    echo "Server failed to start. Check $LOG_FILE"
    cat "$LOG_FILE"
    rm "$PID_FILE"
    exit 1
fi
