/**
 * Debug component to test multi-level data rendering
 * Add this temporarily to Map3D to verify data flow
 */

import React, { useEffect } from 'react';

export const MultiLevelDebugger = ({ multiLevelData, zoomDistance }) => {
  useEffect(() => {
  }, [multiLevelData, zoomDistance]);

  return (
    <div style={{
      position: 'absolute',
      top: '100px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <div>🐛 Multi-Level Data Debugger</div>
      <div>States: {multiLevelData?.states?.length || 0}</div>
      <div>Cities: {multiLevelData?.cities?.length || 0}</div>
      <div>Districts: {multiLevelData?.districts?.length || 0}</div>
      <div>Assets: {multiLevelData?.assets?.length || 0}</div>
      <div>Zoom: {zoomDistance?.toFixed(2) || 0}</div>
    </div>
  );
};

export default MultiLevelDebugger;