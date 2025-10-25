cmake_minimum_required(VERSION 3.16)

project(sample)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required Qt5 components (lightweight - no WebEngine)
find_package(Qt5 REQUIRED COMPONENTS Core Widgets)

# Automatically handle Qt's meta-object compiler (MOC)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

# Set source files
set(SOURCES
    main.cpp
    mainwindow.cpp
    mapwidget.cpp
)

set(HEADERS
    mainwindow.h
    mapwidget.h
)

# No UI forms needed for lightweight version

# Create the executable
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

# Link Qt libraries (lightweight)
target_link_libraries(${PROJECT_NAME} 
    Qt5::Core
    Qt5::Widgets
)

# Copy resource files to build directory (stations and boundary data only)
configure_file(${CMAKE_SOURCE_DIR}/stations.geojson ${CMAKE_BINARY_DIR}/stations.geojson COPYONLY)
configure_file(${CMAKE_SOURCE_DIR}/fullstations.json ${CMAKE_BINARY_DIR}/fullstations.json COPYONLY)
configure_file(${CMAKE_SOURCE_DIR}/india_boundary_detailed.geojson ${CMAKE_BINARY_DIR}/india_boundary_detailed.geojson COPYONLY)
configure_file(${CMAKE_SOURCE_DIR}/states.geojson ${CMAKE_BINARY_DIR}/states.geojson COPYONLY)

# Set executable properties
set_target_properties(${PROJECT_NAME} PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE TRUE
)

# Install target (optional)
install(TARGETS ${PROJECT_NAME}
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)