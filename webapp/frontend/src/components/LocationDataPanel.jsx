import React, { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

/**
 * LocationDataPanel - Beautiful 3D-styled data panel in Three.js scene
 * Displays location details with pagination and search
 */
const LocationDataPanel = ({
  data = [],
  visible = false,
  onClose,
  position = [35, 30, 0], // Top-right in 3D space
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsPerPage] = useState(10);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Get column names from first item
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  if (!visible || data.length === 0) return null;

  return (
    <Html
      position={position}
      center
      distanceFactor={10}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: `${window.innerWidth * 0.8}px`,
          maxHeight: '600px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '2px solid rgba(100, 181, 246, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(100, 181, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          padding: '20px',
          fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.5s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(100, 181, 246, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)',
              animation: 'pulse 2s infinite',
            }}></div>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.5px',
            }}>
              Location Details
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.4)';
              e.target.style.transform = 'scale(1.1) rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              e.target.style.transform = 'scale(1) rotate(0deg)';
            }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="🔍 Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(100, 181, 246, 0.3)',
              borderRadius: '12px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s ease',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(100, 181, 246, 0.6)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 0 3px rgba(100, 181, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(100, 181, 246, 0.3)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3)';
            }}
          />
        </div>

        {/* Data Count */}
        <div style={{
          fontSize: '12px',
          color: '#94a3b8',
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} results
          </span>
          <span style={{
            background: 'rgba(59, 130, 246, 0.2)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            {data.length} total
          </span>
        </div>

        {/* Table Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          marginBottom: '15px',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(100, 181, 246, 0.2)',
          maxHeight: '350px',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(51, 65, 85, 0.98) 100%)',
              zIndex: 10,
            }}>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '2px solid rgba(100, 181, 246, 0.3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((item, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: '#cbd5e1',
                      borderBottom: '1px solid rgba(100, 181, 246, 0.1)',
                      whiteSpace: 'nowrap',
                    }}>
                      {typeof item[col] === 'object' ? JSON.stringify(item[col]) : String(item[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '15px',
          borderTop: '1px solid rgba(100, 181, 246, 0.2)',
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              background: currentPage === 1 
                ? 'rgba(71, 85, 105, 0.3)' 
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))',
              border: '1px solid rgba(100, 181, 246, 0.3)',
              borderRadius: '10px',
              color: currentPage === 1 ? '#64748b' : '#e2e8f0',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: currentPage === 1 ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5))';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1) {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            ← Previous
          </button>

          <div style={{
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
          }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: currentPage === pageNum
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : 'rgba(71, 85, 105, 0.3)',
                    border: currentPage === pageNum
                      ? '1px solid rgba(100, 181, 246, 0.6)'
                      : '1px solid rgba(100, 181, 246, 0.2)',
                    borderRadius: '8px',
                    color: currentPage === pageNum ? '#fff' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: currentPage === pageNum ? '700' : '500',
                    transition: 'all 0.3s ease',
                    boxShadow: currentPage === pageNum
                      ? '0 4px 12px rgba(59, 130, 246, 0.5)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== pageNum) {
                      e.target.style.background = 'rgba(100, 181, 246, 0.2)';
                      e.target.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== pageNum) {
                      e.target.style.background = 'rgba(71, 85, 105, 0.3)';
                      e.target.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              background: currentPage === totalPages
                ? 'rgba(71, 85, 105, 0.3)'
                : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))',
              border: '1px solid rgba(100, 181, 246, 0.3)',
              borderRadius: '10px',
              color: currentPage === totalPages ? '#64748b' : '#e2e8f0',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: currentPage === totalPages ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(139, 92, 246, 0.5))';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages) {
                e.target.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            Next →
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(50px) translateY(-50%);
            }
            to {
              opacity: 1;
              transform: translateX(0) translateY(-50%);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.2);
            }
          }

          /* Custom scrollbar */
          div::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }

          div::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.4);
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(139, 92, 246, 0.6));
            border-radius: 4px;
          }

          div::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8));
          }
        `}
      </style>
    </Html>
  );
};

export default LocationDataPanel;
