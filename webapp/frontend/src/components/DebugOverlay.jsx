import { useState, useEffect } from 'react';

/**
 * Debug overlay to show zoom and keyboard control status
 */
export const DebugOverlay = ({ logs = [], maxLogs = 10 }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '80px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: '#00ff00',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'monospace',
      maxWidth: '500px',
      maxHeight: '300px',
      overflowY: 'auto',
      border: '2px solid rgba(0, 255, 0, 0.3)',
      zIndex: 1000
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '10px', 
        fontSize: '13px',
        color: '#00ffff',
        borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
        paddingBottom: '5px'
      }}>
        🐛 Debug Console
      </div>
      {logs.length === 0 && (
        <div style={{ color: '#888' }}>No logs yet... Scroll or press keys to see debug info</div>
      )}
      {logs.slice(-maxLogs).map((log, idx) => (
        <div key={idx} style={{ 
          marginBottom: '5px',
          padding: '3px 5px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '3px',
          color: log.type === 'error' ? '#ff6b6b' : 
                 log.type === 'warn' ? '#ffd43b' : 
                 log.type === 'success' ? '#51cf66' : '#00ff00'
        }}>
          <span style={{ opacity: 0.6 }}>{log.time}</span> {log.message}
        </div>
      ))}
    </div>
  );
};

export default DebugOverlay;
