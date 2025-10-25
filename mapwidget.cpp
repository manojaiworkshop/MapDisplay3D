#include "mapwidget.h"
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QFile>
#include <QDebug>
#include <QPainterPath>
#include <QFontMetrics>
#include <cmath>

const double MapWidget::MIN_SCALE = 0.5;
const double MapWidget::MAX_SCALE = 2600.0; // Allow zooming to ~10 meter level (150x zoom)

MapWidget::MapWidget(QWidget *parent)
    : QWidget(parent)
    , centerLat(23.0)
    , centerLon(78.0)
    , scale(1.0)
    , isPanning(false)
    , hoveredStationIndex(-1)
    , clickedStationIndex(-1)
    , drawerOpen(false)
    , sourceStationIndex(-1)
    , destinationStationIndex(-1)
    , trainSpeed(2.0)
    , trainMoving(false)
    , trainPosition(0.0)
    , cameraFollowTrain(true)
    , zoomAnimation(nullptr)
    , panAnimation(nullptr)
{
    setMouseTracking(true);
    setFocusPolicy(Qt::StrongFocus);
    
    // Ensure no margins or padding
    setContentsMargins(0, 0, 0, 0);
    setStyleSheet("MapWidget { background-color: white; border: none; margin: 0px; padding: 0px; }");
    
    // Initialize zoom control rectangles
    zoomInRect = QRect(0, 0, 30, 30);
    zoomOutRect = QRect(0, 35, 30, 30);
    
    // Initialize train timer
    trainTimer = new QTimer(this);
    connect(trainTimer, &QTimer::timeout, this, &MapWidget::updateTrainPosition);
    
    // Create drawer widget and UI components BEFORE loading stations
    setupDrawerUI();
    
    // Now load data
    loadStations();
    loadIndiaBoundary();
    loadStateBoundaries();
}

void MapWidget::loadStations(const QString &filename)
{
    stations.clear();
    
    // Try to load from specified JSON file
    QFile file(filename);
    if (!file.open(QIODevice::ReadOnly)) {
        qWarning() << "Could not open" << filename << "file";
        return;
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    file.close();
    
    QJsonObject root = doc.object();
    
    // Check if it's zone-based format
    if (root.contains("zones")) {
        QJsonObject zones = root["zones"].toObject();
        
        // Iterate through each zone
        for (auto zoneIt = zones.begin(); zoneIt != zones.end(); ++zoneIt) {
            QJsonObject zoneObj = zoneIt.value().toObject();
            
            if (zoneObj.contains("features")) {
                QJsonArray features = zoneObj["features"].toArray();
                
                for (const auto &feature : features) {
                    QJsonObject featureObj = feature.toObject();
                    QJsonObject properties = featureObj["properties"].toObject();
                    QJsonObject geometry = featureObj["geometry"].toObject();
                    
                    if (geometry["type"].toString() == "Point") {
                        QJsonArray coordinates = geometry["coordinates"].toArray();
                        
                        if (coordinates.size() >= 2) {
                            Station station;
                            station.name = properties["name"].toString();
                            QString code = properties["code"].toString();
                            if (!code.isEmpty()) {
                                station.name += " (" + code + ")";
                            }
                            station.lon = coordinates[0].toDouble();
                            station.lat = coordinates[1].toDouble();
                            stations.append(station);
                        }
                    }
                }
            }
        }
    }
    // Fallback to old GeoJSON format
    else if (root.contains("features")) {
        QJsonArray features = root["features"].toArray();
        
        for (const auto &feature : features) {
            QJsonObject featureObj = feature.toObject();
            QJsonObject properties = featureObj["properties"].toObject();
            QJsonObject geometry = featureObj["geometry"].toObject();
            
            if (geometry["type"].toString() == "Point") {
                QJsonArray coordinates = geometry["coordinates"].toArray();
                
                if (coordinates.size() >= 2) {
                    Station station;
                    station.name = properties["name"].toString();
                    station.lon = coordinates[0].toDouble();
                    station.lat = coordinates[1].toDouble();
                    stations.append(station);
                }
            }
        }
    }
    
    qDebug() << "Loaded" << stations.size() << "stations from" << filename;
    updateStationPositions();
    updateStationComboBoxes();
}

void MapWidget::loadIndiaBoundary()
{
    // Try to load from file
    QFile file("india_boundary_detailed.geojson");
    if (file.open(QIODevice::ReadOnly)) {
        QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
        QJsonObject root = doc.object();
        
        if (root.contains("features")) {
            QJsonArray features = root["features"].toArray();
            for (const auto &feature : features) {
                QJsonObject featureObj = feature.toObject();
                QJsonObject geometry = featureObj["geometry"].toObject();
                
                if (geometry["type"].toString() == "Polygon") {
                    QJsonArray coordinates = geometry["coordinates"].toArray();
                    if (!coordinates.isEmpty()) {
                        QJsonArray ring = coordinates[0].toArray();
                        QPolygonF polygon;
                        
                        for (const auto &coord : ring) {
                            QJsonArray point = coord.toArray();
                            if (point.size() >= 2) {
                                double lon = point[0].toDouble();
                                double lat = point[1].toDouble();
                                polygon << QPointF(lon, lat);
                            }
                        }
                        indiaBoundary.append(polygon);
                    }
                }
            }
        }
    }
    
    fitMapToView();
}

void MapWidget::loadStateBoundaries()
{
    stateBoundaries.clear();
    
    // Load state boundaries from states.geojson
    QFile file("states.geojson");
    if (!file.open(QIODevice::ReadOnly)) {
        qDebug() << "Could not open states.geojson";
        return;
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    file.close();
    
    QJsonObject root = doc.object();
    
    if (root.contains("features")) {
        QJsonArray features = root["features"].toArray();
        
        for (const auto &feature : features) {
            QJsonObject featureObj = feature.toObject();
            QJsonObject properties = featureObj["properties"].toObject();
            QJsonObject geometry = featureObj["geometry"].toObject();
            
            StateFeature stateFeature;
            stateFeature.name = properties["name"].toString();
            stateFeature.type = properties["type"].toString();
            stateFeature.minZoom = properties["min_zoom"].toDouble(0.0); // Default 0 = always show
            
            qDebug() << "Loading feature:" << stateFeature.name << "Type:" << stateFeature.type << "MinZoom:" << stateFeature.minZoom;
            
            QString geomType = geometry["type"].toString();
            
            if (geomType == "Polygon") {
                QJsonArray coordinates = geometry["coordinates"].toArray();
                if (!coordinates.isEmpty()) {
                    QJsonArray ring = coordinates[0].toArray();
                    QPolygonF polygon;
                    
                    for (const auto &coord : ring) {
                        QJsonArray point = coord.toArray();
                        if (point.size() >= 2) {
                            double lon = point[0].toDouble();
                            double lat = point[1].toDouble();
                            polygon << QPointF(lon, lat);
                        }
                    }
                    stateFeature.polygons.append(polygon);
                }
            }
            else if (geomType == "MultiPolygon") {
                QJsonArray coordinates = geometry["coordinates"].toArray();
                for (const auto &polygonCoords : coordinates) {
                    QJsonArray rings = polygonCoords.toArray();
                    if (!rings.isEmpty()) {
                        QJsonArray ring = rings[0].toArray();
                        QPolygonF polygon;
                        
                        for (const auto &coord : ring) {
                            QJsonArray point = coord.toArray();
                            if (point.size() >= 2) {
                                double lon = point[0].toDouble();
                                double lat = point[1].toDouble();
                                polygon << QPointF(lon, lat);
                            }
                        }
                        stateFeature.polygons.append(polygon);
                    }
                }
            }
            else if (geomType == "LineString") {
                // Handle rivers (LineString geometry)
                QJsonArray coordinates = geometry["coordinates"].toArray();
                for (const auto &coord : coordinates) {
                    QJsonArray point = coord.toArray();
                    if (point.size() >= 2) {
                        double lon = point[0].toDouble();
                        double lat = point[1].toDouble();
                        stateFeature.lineString << QPointF(lon, lat);
                    }
                }
            }
            
            if (!stateFeature.polygons.isEmpty() || !stateFeature.lineString.isEmpty()) {
                stateBoundaries.append(stateFeature);
                qDebug() << "Loaded feature:" << stateFeature.name 
                         << "Polygons:" << stateFeature.polygons.size() 
                         << "LinePoints:" << stateFeature.lineString.size();
            }
        }
    }
    
    qDebug() << "Total features loaded:" << stateBoundaries.size();
}

QPointF MapWidget::geoToScreen(double lat, double lon)
{
    // Simple equirectangular projection
    double x = (lon - centerLon) * scale * 100 + width() / 2.0 + panOffset.x();
    double y = (centerLat - lat) * scale * 100 + height() / 2.0 + panOffset.y();
    return QPointF(x, y);
}

void MapWidget::screenToGeo(const QPointF &screen, double &lat, double &lon)
{
    lon = centerLon + (screen.x() - width() / 2.0 - panOffset.x()) / (scale * 100);
    lat = centerLat - (screen.y() - height() / 2.0 - panOffset.y()) / (scale * 100);
}

QPointF MapWidget::worldToScreen(const QPointF &worldPos)
{
    // WorldPos is already in screen coordinate system (from trainPath)
    // Just apply panOffset to get actual screen position
    return worldPos;
}

void MapWidget::updateStationPositions()
{
    for (auto &station : stations) {
        station.screenPos = geoToScreen(station.lat, station.lon);
    }
}

void MapWidget::fitMapToView()
{
    if (indiaBoundary.isEmpty()) return;
    
    // Find bounds of India boundary
    double minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    
    for (const auto &polygon : indiaBoundary) {
        for (const auto &point : polygon) {
            minLat = qMin(minLat, point.y());
            maxLat = qMax(maxLat, point.y());
            minLon = qMin(minLon, point.x());
            maxLon = qMax(maxLon, point.x());
        }
    }
    
    // Set center and scale
    centerLat = (minLat + maxLat) / 2.0;
    centerLon = (minLon + maxLon) / 2.0;
    
    double latRange = maxLat - minLat;
    double lonRange = maxLon - minLon;
    
    if (width() > 0 && height() > 0) {
        double scaleX = width() / (lonRange * 120);
        double scaleY = height() / (latRange * 120);
        scale = qMin(scaleX, scaleY) * 0.9; // Add some padding
        scale = qBound(MIN_SCALE, scale, MAX_SCALE);
    }
    
    panOffset = QPointF(0, 0);
    updateStationPositions();
}

void MapWidget::paintEvent(QPaintEvent *event)
{
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    
    // Clear background with clean white
    painter.fillRect(rect(), Qt::white); // Clean white background
    
    // Draw India boundary
    drawIndiaBoundary(painter);
    
    // Draw state boundaries
    drawStateBoundaries(painter);
    
    // Draw stations and railway line
    drawStations(painter);
    
    // Draw zoom controls
    drawZoomControls(painter);
    
    // Draw moving train if active
    if (trainMoving && !trainPath.isEmpty() && trainPosition >= 0.0 && trainPosition <= 1.0) {
        // trainPath now contains geographic coordinates (lon, lat)
        // Convert currentTrainPos (set in updateTrainPosition) to screen coordinates
        if (!currentTrainPos.isNull()) {
            QPointF trainScreenPos = geoToScreen(currentTrainPos.y(), currentTrainPos.x());
            
            // Calculate angle based on direction of travel
            double angle = 0.0;
            
            // Find which segment we're on to calculate direction
            double pathLength = 0.0;
            for (int i = 0; i < trainPath.size() - 1; ++i) {
                QPointF p1 = trainPath[i];
                QPointF p2 = trainPath[i + 1];
                double dx = p2.x() - p1.x();
                double dy = p2.y() - p1.y();
                pathLength += std::sqrt(dx * dx + dy * dy);
            }
            
            double targetLength = trainPosition * pathLength;
            double currentLength = 0.0;
            
            for (int i = 0; i < trainPath.size() - 1; ++i) {
                QPointF p1 = trainPath[i];
                QPointF p2 = trainPath[i + 1];
                double dx = p2.x() - p1.x();
                double dy = p2.y() - p1.y();
                double segmentLength = std::sqrt(dx * dx + dy * dy);
                
                if (currentLength + segmentLength >= targetLength) {
                    // Calculate angle in screen coordinates
                    QPointF screenP1 = geoToScreen(p1.y(), p1.x());
                    QPointF screenP2 = geoToScreen(p2.y(), p2.x());
                    angle = -QLineF(screenP1, screenP2).angle();
                    break;
                }
                
                currentLength += segmentLength;
            }
            
            drawTrain(painter, trainScreenPos, angle);
        }
    }
    
    // Draw clicked station popup (full name)
    if (clickedStationIndex >= 0 && clickedStationIndex < stations.size()) {
        const Station &station = stations[clickedStationIndex];
        
        // Set up font
        QFont popupFont = painter.font();
        popupFont.setPointSize(10);
        popupFont.setBold(true);
        painter.setFont(popupFont);
        
        // Calculate popup size
        QFontMetrics fm(popupFont);
        QString fullName = station.name;
        QRect textRect = fm.boundingRect(fullName);
        
        // Position popup above the station
        QPoint popupPos = station.screenPos.toPoint() + QPoint(-textRect.width() / 2, -25);
        
        // Ensure popup stays within window bounds
        if (popupPos.x() < 5) popupPos.setX(5);
        if (popupPos.x() + textRect.width() + 10 > width() - 5) 
            popupPos.setX(width() - textRect.width() - 15);
        if (popupPos.y() < 5) popupPos.setY(station.screenPos.y() + 25);
        
        // Draw popup background with shadow
        QRect popupRect = textRect.translated(popupPos).adjusted(-8, -4, 8, 4);
        
        // Shadow
        painter.setPen(Qt::NoPen);
        painter.setBrush(QColor(0, 0, 0, 80));
        painter.drawRoundedRect(popupRect.adjusted(2, 2, 2, 2), 5, 5);
        
        // Main popup
        painter.setBrush(QColor(255, 235, 59)); // Yellow background
        painter.setPen(QPen(QColor(33, 33, 33), 2));
        painter.drawRoundedRect(popupRect, 5, 5);
        
        // Draw text
        painter.setPen(QColor(33, 33, 33));
        painter.drawText(popupRect, Qt::AlignCenter, fullName);
        
        // Draw small triangle pointing to station
        QPolygonF triangle;
        int triangleX = station.screenPos.x();
        int triangleY = (popupPos.y() < station.screenPos.y()) ? 
                        popupRect.bottom() : popupRect.top();
        
        if (popupPos.y() < station.screenPos.y()) {
            // Triangle points down
            triangle << QPointF(triangleX, triangleY + 8)
                    << QPointF(triangleX - 5, triangleY)
                    << QPointF(triangleX + 5, triangleY);
        } else {
            // Triangle points up
            triangle << QPointF(triangleX, triangleY - 8)
                    << QPointF(triangleX - 5, triangleY)
                    << QPointF(triangleX + 5, triangleY);
        }
        
        painter.setPen(QPen(QColor(33, 33, 33), 2));
        painter.setBrush(QColor(255, 235, 59));
        painter.drawPolygon(triangle);
    }
    
    // Draw zoom meter in bottom-left corner
    drawZoomMeter(painter);
}

void MapWidget::drawIndiaBoundary(QPainter &painter)
{
    painter.setPen(QPen(QColor(46, 125, 50), 2)); // Modern green border
    painter.setBrush(QColor(165, 214, 167, 120)); // Light green with better transparency
    
    for (const auto &polygon : indiaBoundary) {
        QPolygonF screenPolygon;
        for (const auto &point : polygon) {
            screenPolygon << geoToScreen(point.y(), point.x());
        }
        painter.drawPolygon(screenPolygon);
    }
}

void MapWidget::drawStateBoundaries(QPainter &painter)
{
    for (const auto &feature : stateBoundaries) {
        // Check if feature should be displayed at current zoom level
        if (feature.minZoom > 0 && scale < feature.minZoom) {
            continue; // Skip if zoom level is below minimum
        }
        
        // Set color based on feature type
        if (feature.type == "river") {
            // Rivers in light blue
            painter.setPen(QPen(QColor(100, 180, 255), 2));
            painter.setBrush(Qt::NoBrush);
            
            // Draw LineString (river path)
            if (feature.lineString.size() > 1) {
                QVector<QPointF> screenPath;
                for (const auto &point : feature.lineString) {
                    screenPath << geoToScreen(point.y(), point.x());
                }
                
                // Draw as connected line
                for (int i = 0; i < screenPath.size() - 1; ++i) {
                    painter.drawLine(screenPath[i], screenPath[i + 1]);
                }
            }
        }
        else { // state_border or default
            // State boundaries in blue
            painter.setPen(QPen(QColor(33, 150, 243), 2));
            painter.setBrush(Qt::NoBrush);
            
            // Draw polygons
            for (const auto &polygon : feature.polygons) {
                QPolygonF screenPolygon;
                for (const auto &point : polygon) {
                    screenPolygon << geoToScreen(point.y(), point.x());
                }
                painter.drawPolygon(screenPolygon);
            }
        }
    }
}

void MapWidget::drawRailwayTrack(QPainter &painter, const QPointF &start, const QPointF &end)
{
    // Calculate track parameters
    QLineF trackLine(start, end);
    double length = trackLine.length();
    double angle = trackLine.angle();
    
    // Don't draw if too short
    if (length < 2) return;
    
    // Save painter state
    painter.save();
    
    // Railway track dimensions
    const double railGauge = 6.0;        // Distance between rails (scaled)
    const double sleeperWidth = 10.0;    // Width of sleepers
    const double sleeperSpacing = 15.0;  // Distance between sleepers
    const double railWidth = 2.5;        // Width of rails
    
    // Translate and rotate to align with track
    painter.translate(start);
    painter.rotate(-angle);
    
    // Draw sleepers (wooden/concrete ties)
    int numSleepers = static_cast<int>(length / sleeperSpacing);
    painter.setPen(Qt::NoPen);
    painter.setBrush(QColor(101, 67, 33)); // Brown color for wooden sleepers
    
    for (int i = 0; i <= numSleepers; ++i) {
        double x = i * sleeperSpacing;
        if (x > length) break;
        
        // Draw sleeper as a small rectangle
        QRectF sleeper(x - 2, -sleeperWidth / 2, 4, sleeperWidth);
        painter.drawRect(sleeper);
    }
    
    // Draw ballast bed (gravel under tracks) - subtle
    painter.setBrush(QColor(150, 150, 150, 60));
    QRectF ballast(0, -railGauge - 2, length, railGauge * 2 + 4);
    painter.drawRect(ballast);
    
    // Draw rails (the metal tracks)
    painter.setPen(Qt::NoPen);
    
    // Draw rail shadows for depth
    painter.setBrush(QColor(0, 0, 0, 80));
    QRectF rail1Shadow(0, -railGauge / 2 + 0.5, length, railWidth);
    QRectF rail2Shadow(0, railGauge / 2 + 0.5, length, railWidth);
    painter.drawRect(rail1Shadow);
    painter.drawRect(rail2Shadow);
    
    // Draw main rails (metallic steel color)
    painter.setBrush(QColor(192, 192, 192)); // Silver/steel color
    QRectF rail1(0, -railGauge / 2, length, railWidth);
    QRectF rail2(0, railGauge / 2, length, railWidth);
    painter.drawRect(rail1);
    painter.drawRect(rail2);
    
    // Add highlight to rails for metallic effect
    painter.setBrush(QColor(220, 220, 220, 150));
    QRectF rail1Highlight(0, -railGauge / 2, length, railWidth * 0.4);
    QRectF rail2Highlight(0, railGauge / 2, length, railWidth * 0.4);
    painter.drawRect(rail1Highlight);
    painter.drawRect(rail2Highlight);
    
    // Restore painter state
    painter.restore();
}

void MapWidget::drawStations(QPainter &painter)
{
    // Draw railway tracks connecting stations
    for (int i = 0; i < stations.size() - 1; ++i) {
        drawRailwayTrack(painter, stations[i].screenPos, stations[i + 1].screenPos);
    }
    
    // Draw stations with modern styling
    QFont font = painter.font();
    font.setPointSize(9);
    font.setBold(true);
    painter.setFont(font);
    
    for (const auto &station : stations) {
        // Draw station marker with gradient effect
        painter.setPen(QPen(QColor(255, 87, 34), 2)); // Deep orange border
        painter.setBrush(QColor(255, 152, 0));          // Orange fill
        
        // Draw outer circle (shadow)
        painter.setBrush(QColor(0, 0, 0, 50));
        painter.setPen(Qt::NoPen);
        painter.drawEllipse(station.screenPos + QPointF(1, 1), 8, 8);
        
        // Draw main station marker
        painter.setPen(QPen(QColor(255, 87, 34), 2));
        painter.setBrush(QColor(255, 152, 0));
        painter.drawEllipse(station.screenPos, 8, 8);
        
        // Draw inner white dot
        painter.setPen(Qt::NoPen);
        painter.setBrush(Qt::white);
        painter.drawEllipse(station.screenPos, 3, 3);
        
        // Draw station name with background (only if zoom level is high enough)
        if (scale > 1.5) {
            QFontMetrics fm(font);
            QRect textRect = fm.boundingRect(station.name);
            QPointF textPos = station.screenPos + QPointF(12, -8);
            
            // Draw text background
            painter.setBrush(QColor(255, 255, 255, 200));
            painter.setPen(QPen(QColor(100, 100, 100), 1));
            painter.drawRoundedRect(textRect.translated(textPos.toPoint()).adjusted(-2, -1, 2, 1), 3, 3);
            
            // Draw text
            painter.setPen(QColor(33, 33, 33));
            painter.drawText(textPos, station.name);
        }
    }
}

void MapWidget::drawZoomControls(QPainter &painter)
{
    // Position zoom controls in top-right corner with attractive styling
    int margin = 15;
    int buttonSize = 40;
    int spacing = 5;
    
    zoomInRect = QRect(width() - buttonSize - margin, margin, buttonSize, buttonSize);
    zoomOutRect = QRect(width() - buttonSize - margin, margin + buttonSize + spacing, buttonSize, buttonSize);
    recenterRect = QRect(width() - buttonSize - margin, margin + 2 * (buttonSize + spacing), buttonSize, buttonSize);
    
    // Set up font for buttons
    QFont buttonFont = painter.font();
    buttonFont.setPixelSize(20);
    buttonFont.setBold(true);
    painter.setFont(buttonFont);
    
    // Draw zoom in button with modern styling
    painter.setPen(QPen(QColor(70, 130, 180), 2)); // Steel blue border
    painter.setBrush(QColor(255, 255, 255, 230));   // Semi-transparent white
    painter.drawRoundedRect(zoomInRect, 6, 6);      // Rounded corners
    
    // Add shadow effect
    painter.setPen(QPen(QColor(0, 0, 0, 50), 1));
    painter.drawRoundedRect(zoomInRect.adjusted(1, 1, 1, 1), 6, 6);
    
    // Draw plus sign
    painter.setPen(QPen(QColor(70, 130, 180), 3));
    painter.drawText(zoomInRect, Qt::AlignCenter, "+");
    
    // Draw zoom out button with same styling
    painter.setPen(QPen(QColor(70, 130, 180), 2));
    painter.setBrush(QColor(255, 255, 255, 230));
    painter.drawRoundedRect(zoomOutRect, 6, 6);
    
    // Add shadow effect
    painter.setPen(QPen(QColor(0, 0, 0, 50), 1));
    painter.drawRoundedRect(zoomOutRect.adjusted(1, 1, 1, 1), 6, 6);
    
    // Draw minus sign
    painter.setPen(QPen(QColor(70, 130, 180), 3));
    painter.drawText(zoomOutRect, Qt::AlignCenter, "−");
    
    // Draw recenter button with same styling
    painter.setPen(QPen(QColor(76, 175, 80), 2)); // Green border
    painter.setBrush(QColor(255, 255, 255, 230));
    painter.drawRoundedRect(recenterRect, 6, 6);
    
    // Add shadow effect
    painter.setPen(QPen(QColor(0, 0, 0, 50), 1));
    painter.drawRoundedRect(recenterRect.adjusted(1, 1, 1, 1), 6, 6);
    
    // Draw home/recenter icon (⌂)
    QFont iconFont = painter.font();
    iconFont.setPixelSize(22);
    painter.setFont(iconFont);
    painter.setPen(QPen(QColor(76, 175, 80), 3));
    painter.drawText(recenterRect, Qt::AlignCenter, "⌂");
    
    // Draw trip planner button
    tripPlannerRect = QRect(width() - buttonSize - margin, margin + 3 * (buttonSize + spacing), buttonSize, buttonSize);
    
    painter.setPen(QPen(QColor(255, 152, 0), 2)); // Orange border
    painter.setBrush(QColor(255, 255, 255, 230));
    painter.drawRoundedRect(tripPlannerRect, 6, 6);
    
    // Add shadow effect
    painter.setPen(QPen(QColor(0, 0, 0, 50), 1));
    painter.drawRoundedRect(tripPlannerRect.adjusted(1, 1, 1, 1), 6, 6);
    
    // Draw train icon (🚂)
    iconFont.setPixelSize(24);
    painter.setFont(iconFont);
    painter.setPen(QPen(QColor(255, 152, 0), 3));
    painter.drawText(tripPlannerRect, Qt::AlignCenter, "🚂");
}

void MapWidget::drawZoomMeter(QPainter &painter)
{
    // Position zoom meter in bottom-left corner
    int margin = 15;
    int meterWidth = 150;
    int meterHeight = 60;
    
    QRect meterRect(margin, height() - meterHeight - margin, meterWidth, meterHeight);
    
    // Draw background with shadow
    painter.setPen(Qt::NoPen);
    painter.setBrush(QColor(0, 0, 0, 100));
    painter.drawRoundedRect(meterRect.adjusted(2, 2, 2, 2), 8, 8);
    
    // Draw main background
    painter.setBrush(QColor(255, 255, 255, 240));
    painter.setPen(QPen(QColor(70, 130, 180), 2));
    painter.drawRoundedRect(meterRect, 8, 8);
    
    // Calculate approximate scale in meters
    // At equator, 1 degree longitude ≈ 111 km = 111000 meters
    // Screen width represents certain degrees of longitude divided by scale
    double degreesPerPixel = 1.0 / scale;
    double metersPerPixel = degreesPerPixel * 111000.0; // Approximate
    double referencePixels = 100.0; // Show scale for 100 pixels
    double scaleMeters = metersPerPixel * referencePixels;
    
    // Format the distance nicely
    QString scaleText;
    if (scaleMeters < 1000) {
        scaleText = QString::number(static_cast<int>(scaleMeters)) + " m";
    } else if (scaleMeters < 10000) {
        scaleText = QString::number(scaleMeters / 1000.0, 'f', 1) + " km";
    } else {
        scaleText = QString::number(static_cast<int>(scaleMeters / 1000)) + " km";
    }
    
    // Draw title
    QFont titleFont = painter.font();
    titleFont.setPixelSize(10);
    titleFont.setBold(true);
    painter.setFont(titleFont);
    painter.setPen(QColor(70, 130, 180));
    painter.drawText(meterRect.adjusted(10, 5, -10, -35), Qt::AlignTop | Qt::AlignLeft, "Scale:");
    
    // Draw scale bar
    int barY = meterRect.top() + 28;
    int barLeft = meterRect.left() + 10;
    int barRight = barLeft + 100; // 100 pixels wide
    
    // Draw scale bar line
    painter.setPen(QPen(QColor(70, 130, 180), 3));
    painter.drawLine(barLeft, barY, barRight, barY);
    
    // Draw end ticks
    painter.drawLine(barLeft, barY - 5, barLeft, barY + 5);
    painter.drawLine(barRight, barY - 5, barRight, barY + 5);
    
    // Draw scale text
    QFont scaleFont = painter.font();
    scaleFont.setPixelSize(11);
    scaleFont.setBold(true);
    painter.setFont(scaleFont);
    painter.setPen(QColor(33, 33, 33));
    painter.drawText(meterRect.adjusted(10, 35, -10, -5), Qt::AlignTop | Qt::AlignLeft, scaleText);
    
    // Draw zoom level indicator
    QFont zoomFont = painter.font();
    zoomFont.setPixelSize(9);
    painter.setFont(zoomFont);
    painter.setPen(QColor(100, 100, 100));
    QString zoomText = QString("Zoom: %1×").arg(scale, 0, 'f', 1);
    painter.drawText(meterRect.adjusted(10, 0, -10, -5), Qt::AlignBottom | Qt::AlignRight, zoomText);
}

void MapWidget::mousePressEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        // Check if clicking on zoom controls FIRST (highest priority)
        if (zoomInRect.contains(event->pos())) {
            // Smooth zoom in
            if (zoomAnimation) {
                zoomAnimation->stop();
                delete zoomAnimation;
            }
            zoomAnimation = new QPropertyAnimation(this, "scale");
            zoomAnimation->setDuration(200);
            zoomAnimation->setStartValue(scale);
            zoomAnimation->setEndValue(qMin(scale * 1.5, MAX_SCALE));
            zoomAnimation->setEasingCurve(QEasingCurve::OutCubic);
            connect(zoomAnimation, &QPropertyAnimation::valueChanged, [this]() {
                updateStationPositions();
                update();
            });
            zoomAnimation->start();
            return;
        }
        
        if (zoomOutRect.contains(event->pos())) {
            // Smooth zoom out
            if (zoomAnimation) {
                zoomAnimation->stop();
                delete zoomAnimation;
            }
            zoomAnimation = new QPropertyAnimation(this, "scale");
            zoomAnimation->setDuration(200);
            zoomAnimation->setStartValue(scale);
            zoomAnimation->setEndValue(qMax(scale / 1.5, MIN_SCALE));
            zoomAnimation->setEasingCurve(QEasingCurve::OutCubic);
            connect(zoomAnimation, &QPropertyAnimation::valueChanged, [this]() {
                updateStationPositions();
                update();
            });
            zoomAnimation->start();
            return;
        }
        
        if (recenterRect.contains(event->pos())) {
            // Recenter map to initial view
            recenterMap();
            return;
        }
        
        if (tripPlannerRect.contains(event->pos())) {
            // Toggle drawer
            drawerOpen = !drawerOpen;
            if (drawerOpen) {
                updateStationComboBoxes();
                drawerWidget->setGeometry(width() - 300, 0, 300, height());
                drawerWidget->show();
                drawerWidget->raise();
            } else {
                drawerWidget->hide();
            }
            update();
            return;
        }
        
        // Check if clicking on a station
        int stationIndex = findStationAtPoint(event->pos());
        if (stationIndex >= 0) {
            // Toggle popup: if clicking same station, close it; otherwise show new one
            if (clickedStationIndex == stationIndex) {
                clickedStationIndex = -1;
            } else {
                clickedStationIndex = stationIndex;
                clickedStationPos = event->pos();
            }
            update(); // Redraw to show/hide popup
            return;
        }
        
        // Close popup if clicking elsewhere
        if (clickedStationIndex >= 0) {
            clickedStationIndex = -1;
            update();
        }
        
        // Start panning
        isPanning = true;
        lastPanPoint = event->pos();
        setCursor(Qt::ClosedHandCursor);
    }
}

void MapWidget::mouseMoveEvent(QMouseEvent *event)
{
    if (isPanning && (event->buttons() & Qt::LeftButton)) {
        QPoint delta = event->pos() - lastPanPoint;
        panOffset += delta;
        lastPanPoint = event->pos();
        updateStationPositions();
        update();
    } else {
        // Check for station hover
        int stationIndex = findStationAtPoint(event->pos());
        
        if (stationIndex != hoveredStationIndex) {
            hoveredStationIndex = stationIndex;
            update(); // Redraw to show/hide tooltip
        }
        
        // Change cursor over zoom controls or stations
        if (zoomInRect.contains(event->pos()) || zoomOutRect.contains(event->pos()) || 
            recenterRect.contains(event->pos()) || tripPlannerRect.contains(event->pos())) {
            setCursor(Qt::PointingHandCursor);
        } else if (stationIndex >= 0) {
            setCursor(Qt::PointingHandCursor);
            
            // Set tooltip with truncated name
            if (stationIndex >= 0 && stationIndex < stations.size()) {
                QString tooltipText = truncateStationName(stations[stationIndex].name);
                setToolTip(tooltipText);
            }
        } else {
            setCursor(Qt::ArrowCursor);
            setToolTip(""); // Clear tooltip
        }
    }
}

void MapWidget::wheelEvent(QWheelEvent *event)
{
    // Smooth wheel zoom
    double scaleFactor = event->angleDelta().y() > 0 ? 1.2 : 1.0 / 1.2;
    double newScale = qBound(MIN_SCALE, scale * scaleFactor, MAX_SCALE);
    
    if (zoomAnimation) {
        zoomAnimation->stop();
        delete zoomAnimation;
    }
    
    zoomAnimation = new QPropertyAnimation(this, "scale");
    zoomAnimation->setDuration(150);
    zoomAnimation->setStartValue(scale);
    zoomAnimation->setEndValue(newScale);
    zoomAnimation->setEasingCurve(QEasingCurve::OutQuad);
    connect(zoomAnimation, &QPropertyAnimation::valueChanged, [this]() {
        updateStationPositions();
        update();
    });
    zoomAnimation->start();
}

void MapWidget::mouseReleaseEvent(QMouseEvent *event)
{
    if (event->button() == Qt::LeftButton) {
        if (isPanning) {
            isPanning = false;
            setCursor(Qt::ArrowCursor);
        }
    } else if (event->button() == Qt::RightButton) {
        // Right click to close popup
        if (clickedStationIndex >= 0) {
            clickedStationIndex = -1;
            update();
        }
    }
}

void MapWidget::resizeEvent(QResizeEvent *event)
{
    Q_UNUSED(event)
    updateStationPositions();
    
    // Reposition drawer if open
    if (drawerOpen && drawerWidget) {
        drawerWidget->setGeometry(width() - 300, 0, 300, height());
    }
    
    update();
}

void MapWidget::updateAnimation()
{
    updateStationPositions();
    update();
}

void MapWidget::recenterMap()
{
    // Reset to initial view
    fitMapToView();
    update();
}

int MapWidget::findStationAtPoint(const QPoint &point)
{
    // Check if mouse is near any station (within 12 pixels)
    const double clickRadius = 12.0;
    
    for (int i = 0; i < stations.size(); ++i) {
        QPointF stationPos = stations[i].screenPos;
        double distance = QLineF(point, stationPos).length();
        
        if (distance <= clickRadius) {
            return i;
        }
    }
    
    return -1; // No station found
}

QString MapWidget::truncateStationName(const QString &name, int maxLength)
{
    if (name.length() <= maxLength) {
        return name;
    }
    return name.left(maxLength) + "...";
}

void MapWidget::setupDrawerUI()
{
    // Create drawer widget
    drawerWidget = new QWidget(this);
    drawerWidget->setGeometry(width() - 300, 0, 300, height());
    drawerWidget->setStyleSheet("background-color: rgba(255, 255, 255, 245); border-left: 2px solid #ccc;");
    drawerWidget->hide();
    
    QVBoxLayout *layout = new QVBoxLayout(drawerWidget);
    layout->setContentsMargins(20, 20, 20, 20);
    layout->setSpacing(15);
    
    // Title
    QLabel *titleLabel = new QLabel("Trip Planner", drawerWidget);
    QFont titleFont = titleLabel->font();
    titleFont.setPointSize(14);
    titleFont.setBold(true);
    titleLabel->setFont(titleFont);
    layout->addWidget(titleLabel);
    
    // Source station
    QLabel *sourceLabel = new QLabel("Source Station:", drawerWidget);
    layout->addWidget(sourceLabel);
    
    sourceComboBox = new QComboBox(drawerWidget);
    layout->addWidget(sourceComboBox);
    
    // Destination station
    QLabel *destLabel = new QLabel("Destination Station:", drawerWidget);
    layout->addWidget(destLabel);
    
    destinationComboBox = new QComboBox(drawerWidget);
    layout->addWidget(destinationComboBox);
    
    // Speed control
    QLabel *speedTitleLabel = new QLabel("Train Speed:", drawerWidget);
    layout->addWidget(speedTitleLabel);
    
    speedLabel = new QLabel("Medium", drawerWidget);
    speedLabel->setAlignment(Qt::AlignCenter);
    layout->addWidget(speedLabel);
    
    speedSlider = new QSlider(Qt::Horizontal, drawerWidget);
    speedSlider->setRange(1, 10);
    speedSlider->setValue(5);
    layout->addWidget(speedSlider);
    
    connect(speedSlider, &QSlider::valueChanged, [this](int value) {
        trainSpeed = value / 2.0;
        QString speedText;
        if (value <= 3) speedText = "Slow";
        else if (value <= 7) speedText = "Medium";
        else speedText = "Fast";
        speedLabel->setText(speedText);
    });
    
    // Start button
    startButton = new QPushButton("Start Trip", drawerWidget);
    startButton->setStyleSheet("QPushButton { background-color: #4CAF50; color: white; padding: 10px; border-radius: 5px; font-weight: bold; } QPushButton:hover { background-color: #45a049; }");
    connect(startButton, &QPushButton::clicked, this, &MapWidget::startTrip);
    layout->addWidget(startButton);
    
    // Stop button
    stopButton = new QPushButton("Stop Trip", drawerWidget);
    stopButton->setStyleSheet("QPushButton { background-color: #f44336; color: white; padding: 10px; border-radius: 5px; font-weight: bold; } QPushButton:hover { background-color: #da190b; }");
    stopButton->setEnabled(false);
    connect(stopButton, &QPushButton::clicked, this, &MapWidget::stopTrip);
    layout->addWidget(stopButton);
    
    layout->addStretch();
}

void MapWidget::updateStationComboBoxes()
{
    sourceComboBox->clear();
    destinationComboBox->clear();
    
    for (int i = 0; i < stations.size(); ++i) {
        sourceComboBox->addItem(stations[i].name, i);
        destinationComboBox->addItem(stations[i].name, i);
    }
    
    if (stations.size() > 1) {
        destinationComboBox->setCurrentIndex(stations.size() - 1);
    }
}

void MapWidget::startTrip()
{
    sourceStationIndex = sourceComboBox->currentData().toInt();
    destinationStationIndex = destinationComboBox->currentData().toInt();
    
    if (sourceStationIndex == destinationStationIndex) {
        qWarning() << "Source and destination cannot be the same!";
        return;
    }
    
    // Calculate path
    calculateTrainPath();
    
    // Start animation
    trainPosition = 0.0;
    trainMoving = true;
    trainTimer->start(30); // ~33 FPS
    
    startButton->setEnabled(false);
    stopButton->setEnabled(true);
    
    update();
}

void MapWidget::stopTrip()
{
    trainMoving = false;
    trainTimer->stop();
    
    startButton->setEnabled(true);
    stopButton->setEnabled(false);
    
    update();
}

void MapWidget::calculateTrainPath()
{
    trainPath.clear();
    
    if (sourceStationIndex < 0 || destinationStationIndex < 0 ||
        sourceStationIndex >= stations.size() || destinationStationIndex >= stations.size()) {
        return;
    }
    
    // Create path between source and destination through intermediate stations
    // Store geographic coordinates (lat/lon), not screen positions
    int start = qMin(sourceStationIndex, destinationStationIndex);
    int end = qMax(sourceStationIndex, destinationStationIndex);
    
    for (int i = start; i <= end; ++i) {
        // Store as QPointF(lon, lat) for geographic coordinates
        trainPath.append(QPointF(stations[i].lon, stations[i].lat));
    }
    
    // Reverse if going backwards
    if (sourceStationIndex > destinationStationIndex) {
        std::reverse(trainPath.begin(), trainPath.end());
    }
}

void MapWidget::updateTrainPosition()
{
    if (!trainMoving || trainPath.isEmpty()) {
        return;
    }
    
    // Calculate path length in geographic coordinates
    double pathLength = 0.0;
    for (int i = 0; i < trainPath.size() - 1; ++i) {
        QPointF p1 = trainPath[i];
        QPointF p2 = trainPath[i + 1];
        // Simple distance in degrees (good enough for visualization)
        double dx = p2.x() - p1.x();
        double dy = p2.y() - p1.y();
        pathLength += std::sqrt(dx * dx + dy * dy);
    }
    
    trainPosition += (trainSpeed / 10000.0); // Adjusted for geographic coordinates
    
    if (trainPosition >= 1.0) {
        // Trip completed
        trainPosition = 1.0;
        stopTrip();
    }
    
    // Calculate current train position in geographic coordinates
    double currentLength = 0.0;
    double targetLength = trainPosition * pathLength;
    
    for (int i = 0; i < trainPath.size() - 1; ++i) {
        QPointF p1 = trainPath[i];
        QPointF p2 = trainPath[i + 1];
        double dx = p2.x() - p1.x();
        double dy = p2.y() - p1.y();
        double segmentLength = std::sqrt(dx * dx + dy * dy);
        
        if (currentLength + segmentLength >= targetLength) {
            // Train is in this segment
            double t = (targetLength - currentLength) / segmentLength;
            
            // Current train position in geographic coordinates (lon, lat)
            double currentLon = p1.x() + t * (p2.x() - p1.x());
            double currentLat = p1.y() + t * (p2.y() - p1.y());
            
            currentTrainPos = QPointF(currentLon, currentLat);
            
            // Camera follow: smoothly adjust centerLat/centerLon to keep train visible
            if (cameraFollowTrain) {
                // Check where train appears on screen
                QPointF trainScreenPos = geoToScreen(currentLat, currentLon);
                
                // Define comfortable margin from edges (in pixels)
                double margin = 150.0;
                
                // Calculate screen center
                double screenCenterX = width() / 2.0;
                double screenCenterY = height() / 2.0;
                
                // Only adjust if train is approaching edges
                bool needsAdjustment = false;
                double adjustX = 0.0;
                double adjustY = 0.0;
                
                if (trainScreenPos.x() < margin) {
                    adjustX = (margin - trainScreenPos.x()) / scale * 0.05;
                    needsAdjustment = true;
                } else if (trainScreenPos.x() > width() - margin) {
                    adjustX = -((trainScreenPos.x() - (width() - margin)) / scale * 0.05);
                    needsAdjustment = true;
                }
                
                if (trainScreenPos.y() < margin) {
                    adjustY = (margin - trainScreenPos.y()) / scale * 0.05;
                    needsAdjustment = true;
                } else if (trainScreenPos.y() > height() - margin) {
                    adjustY = -((trainScreenPos.y() - (height() - margin)) / scale * 0.05);
                    needsAdjustment = true;
                }
                
                if (needsAdjustment) {
                    // Adjust center position in geographic coordinates
                    centerLon -= adjustX;
                    centerLat += adjustY;  // Y axis is inverted
                }
            }
            
            break;
        }
        
        currentLength += segmentLength;
    }
    
    update();
}

void MapWidget::drawTrain(QPainter &painter, const QPointF &position, double angle)
{
    painter.save();
    painter.translate(position);
    painter.rotate(angle);
    
    // Draw beautiful train engine
    painter.setRenderHint(QPainter::Antialiasing);
    
    // Engine body (main rectangle)
    QRectF engineBody(-20, -12, 40, 24);
    painter.setPen(QPen(QColor(50, 50, 50), 2));
    painter.setBrush(QColor(220, 50, 50)); // Red engine
    painter.drawRoundedRect(engineBody, 4, 4);
    
    // Cabin (front part)
    QRectF cabin(10, -8, 10, 16);
    painter.setBrush(QColor(180, 40, 40));
    painter.drawRoundedRect(cabin, 2, 2);
    
    // Windows
    painter.setBrush(QColor(135, 206, 250)); // Sky blue
    painter.drawRect(12, -6, 6, 5);
    painter.drawRect(12, 2, 6, 5);
    
    // Chimney
    QRectF chimney(-12, -20, 6, 8);
    painter.setBrush(QColor(80, 80, 80));
    painter.drawRect(chimney);
    
    // Smoke (if moving)
    if (trainMoving) {
        painter.setBrush(QColor(200, 200, 200, 150));
        painter.setPen(Qt::NoPen);
        painter.drawEllipse(QPointF(-9, -24), 4, 4);
        painter.drawEllipse(QPointF(-7, -28), 3, 3);
        painter.drawEllipse(QPointF(-5, -31), 2, 2);
    }
    
    // Wheels
    painter.setBrush(QColor(50, 50, 50));
    painter.setPen(QPen(QColor(30, 30, 30), 2));
    painter.drawEllipse(QPointF(-12, 12), 5, 5);
    painter.drawEllipse(QPointF(0, 12), 5, 5);
    painter.drawEllipse(QPointF(12, 12), 5, 5);
    
    // Wheel details
    painter.setBrush(QColor(150, 150, 150));
    painter.drawEllipse(QPointF(-12, 12), 2, 2);
    painter.drawEllipse(QPointF(0, 12), 2, 2);
    painter.drawEllipse(QPointF(12, 12), 2, 2);
    
    painter.restore();
}