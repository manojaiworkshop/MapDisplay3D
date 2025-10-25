#!/bin/bash
# Build and run the Indian Railway Stations Map application (Lightweight Version)

echo "Building the lightweight Railway Stations Map..."
cd "$(dirname "$0")"

# Create build directory if it doesn't exist
mkdir -p build
cd build

# Configure and build
echo "Configuring with CMake..."
cmake ..

echo "Building..."
make

echo "Running the application..."
# Unset snap environment variables and use only system libraries
unset GTK_PATH
unset LD_LIBRARY_PATH
export QT_QPA_PLATFORM_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu/qt5/plugins
exec ./sample