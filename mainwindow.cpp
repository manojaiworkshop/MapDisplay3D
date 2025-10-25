#include "mainwindow.h"
#include <QVBoxLayout>
#include <QWidget>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    // Create the map widget
    mapWidget = new MapWidget(this);
    setCentralWidget(mapWidget);

    // Set window properties
    setWindowTitle("Indian Railway Stations Map - Lightweight");
    resize(1000, 700);
    
    // Set minimum size for better usability
    setMinimumSize(600, 400);
    
    // Remove menu bar and status bar to eliminate any default styling
    setMenuBar(nullptr);
    setStatusBar(nullptr);
    
    // Set window and central widget background to white
    setStyleSheet("QMainWindow { background-color: white; }");
    
    // Ensure the central widget fills the entire window
    if (centralWidget()) {
        centralWidget()->setStyleSheet("background-color: white;");
    }
}

MainWindow::~MainWindow()
{
}
