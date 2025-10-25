#!/bin/bash
# Run the Indian Railway Stations Map without snap interference

cd "$(dirname "$0")/build"

# Remove all snap-related environment variables
unset SNAP
unset SNAP_ARCH
unset SNAP_COMMON
unset SNAP_DATA
unset SNAP_INSTANCE_NAME
unset SNAP_INSTANCE_KEY
unset SNAP_LIBRARY_PATH
unset SNAP_NAME
unset SNAP_REAL_HOME
unset SNAP_REEXEC
unset SNAP_REVISION
unset SNAP_USER_COMMON
unset SNAP_USER_DATA
unset SNAP_VERSION
unset LD_LIBRARY_PATH
unset GTK_PATH
unset XDG_DATA_DIRS

# Set Qt plugin path explicitly to system location
export QT_QPA_PLATFORM_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu/qt5/plugins
export QT_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu/qt5/plugins

# Run the application
./sample "$@"
