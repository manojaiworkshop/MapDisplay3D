#!/bin/bash
# Script to run the Indian Railway Stations Map application
# This avoids snap library conflicts

cd "$(dirname "$0")/build"

echo "Starting Indian Railway Stations Map..."
echo "Setting up environment to avoid library conflicts..."

export LD_LIBRARY_PATH="/lib/x86_64-linux-gnu:/usr/lib/x86_64-linux-gnu"

# Run the application
./sample

echo "Application finished."