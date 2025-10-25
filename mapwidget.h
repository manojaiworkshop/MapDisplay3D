#ifndef MAPWIDGET_H
#define MAPWIDGET_H

#include <QWidget>
#include <QPainter>
#include <QMouseEvent>
#include <QWheelEvent>
#include <QPoint>
#include <QTimer>
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QPropertyAnimation>
#include <QEasingCurve>
#include <QTimer>
#include <QComboBox>
#include <QPushButton>
#include <QSlider>
#include <QLabel>
#include <QVBoxLayout>

struct Station {
    QString name;
    double lat;
    double lon;
    QPointF screenPos;
};

class MapWidget : public QWidget
{
    Q_OBJECT
    Q_PROPERTY(double scale READ getScale WRITE setScale)

public:
    explicit MapWidget(QWidget *parent = nullptr);
    void loadStations(const QString &filename = "stations.geojson");
    void loadIndiaBoundary();
    void loadStateBoundaries();
    
    // Property for animation
    void setScale(double newScale) { scale = newScale; update(); }
    double getScale() const { return scale; }

protected:
    void paintEvent(QPaintEvent *event) override;
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void wheelEvent(QWheelEvent *event) override;
    void resizeEvent(QResizeEvent *event) override;

private slots:
    void updateAnimation();
    void updateTrainPosition();
    void startTrip();
    void stopTrip();

private:
    // Map data structures
    struct StateFeature {
        QString name;
        QString type; // "state_border" or "river"
        double minZoom; // Minimum zoom level to display (0 = always show)
        QVector<QPolygonF> polygons; // For Polygon/MultiPolygon
        QVector<QPointF> lineString; // For LineString (rivers)
    };
    
    QVector<Station> stations;
    QVector<QPolygonF> indiaBoundary;
    QVector<StateFeature> stateBoundaries; // State borders and rivers with metadata
    
    // View parameters
    double centerLat, centerLon;
    double scale;
    QPointF panOffset;
    
    // Mouse interaction
    bool isPanning;
    QPoint lastPanPoint;
    int hoveredStationIndex;
    int clickedStationIndex;
    QPoint clickedStationPos;
    
    // Animation
    QPropertyAnimation *zoomAnimation;
    QPropertyAnimation *panAnimation;
    
    // Helper functions
    QPointF geoToScreen(double lat, double lon);
    void screenToGeo(const QPointF &screen, double &lat, double &lon);
    QPointF worldToScreen(const QPointF &worldPos);
    void updateStationPositions();
    void fitMapToView();
    int findStationAtPoint(const QPoint &point);
    QString truncateStationName(const QString &name, int maxLength = 10);
    
    // Drawing functions
    void drawIndiaBoundary(QPainter &painter);
    void drawStateBoundaries(QPainter &painter);
    void drawStations(QPainter &painter);
    void drawRailwayTrack(QPainter &painter, const QPointF &start, const QPointF &end);
    void drawZoomControls(QPainter &painter);
    void drawZoomMeter(QPainter &painter);
    void drawRightDrawer(QPainter &painter);
    void drawTrain(QPainter &painter, const QPointF &position, double angle);
    
    // Map control functions
    void recenterMap();
    void calculateTrainPath();
    void setupDrawerUI();
    void updateStationComboBoxes();
    
    // Constants
    static const double MIN_SCALE;
    static const double MAX_SCALE;
    
    // Zoom control areas
    QRect zoomInRect;
    QRect zoomOutRect;
    QRect recenterRect;
    QRect tripPlannerRect;
    
    // Trip planner
    bool drawerOpen;
    int sourceStationIndex;
    int destinationStationIndex;
    double trainSpeed; // Pixels per frame
    bool trainMoving;
    double trainPosition; // 0.0 to 1.0 along the path
    QTimer *trainTimer;
    QVector<QPointF> trainPath;
    bool cameraFollowTrain;
    QPointF currentTrainPos;
    
    // Drawer UI components
    QComboBox *sourceComboBox;
    QComboBox *destinationComboBox;
    QSlider *speedSlider;
    QLabel *speedLabel;
    QPushButton *startButton;
    QPushButton *stopButton;
    QWidget *drawerWidget;
};

#endif // MAPWIDGET_H