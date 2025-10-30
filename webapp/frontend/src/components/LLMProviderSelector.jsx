import React, { useState, useEffect } from 'react';
import { BACKEND_URL } from '../config/constants';

/**
 * LLM Provider Selector Component
 * Allows users to view and switch between different LLM providers
 */
const LLMProviderSelector = () => {
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState('');
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState(null);

  // Fetch provider list
  const fetchProviders = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/llm/providers`);
      const data = await response.json();
      setProviders(data.providers || []);
      setActiveProvider(data.active || '');
      setFallbackEnabled(data.fallback_enabled || false);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  };

  // Fetch current status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/llm/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  // Switch provider
  const switchProvider = async (providerName) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/llm/switch-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActiveProvider(providerName);
        await fetchProviders();
        await fetchStatus();
        console.log(`✅ Switched to ${providerName}`);
      } else {
        console.error(`❌ Failed to switch: ${data.error}`);
        alert(data.error);
      }
    } catch (error) {
      console.error('Error switching provider:', error);
      alert('Failed to switch provider');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchProviders();
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Provider status indicators
  const getStatusColor = (provider) => {
    if (!provider.available) return 'bg-red-500';
    if (provider.active) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusIcon = (provider) => {
    if (!provider.available) return '❌';
    if (provider.active) return '✅';
    return '⚪';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 cursor-pointer hover:bg-blue-100 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-semibold text-sm text-gray-800">LLM Provider</h3>
            <p className="text-xs text-gray-600">
              {activeProvider ? 
                <span className="capitalize font-medium">{activeProvider}</span> : 
                'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {status && (
            <div className={`w-2 h-2 rounded-full ${status.is_available ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          )}
          <span className="text-xs text-gray-500">
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-3 space-y-3 bg-gray-50">
          {/* Current Status */}
          {status && (
            <div className="bg-white p-2 rounded border border-gray-200 text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-medium text-gray-600">Model:</span>
                <span className="text-gray-800">{status.config?.model || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Temp:</span>
                <span className="text-gray-800">{status.config?.temperature || 'N/A'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-medium text-gray-600">Fallback:</span>
                <span className={`${fallbackEnabled ? 'text-green-600' : 'text-red-600'} font-medium`}>
                  {fallbackEnabled ? 'Enabled ✓' : 'Disabled ✗'}
                </span>
              </div>
            </div>
          )}

          {/* Provider List */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600 mb-2">Available Providers:</p>
            {providers.map((provider) => (
              <div
                key={provider.name}
                className={`flex items-center justify-between p-2 rounded-lg border transition ${
                  provider.active
                    ? 'bg-blue-50 border-blue-300 shadow-sm'
                    : provider.available
                    ? 'bg-white border-gray-200 hover:border-blue-200 cursor-pointer'
                    : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (provider.available && !provider.active && !loading) {
                    switchProvider(provider.name);
                  }
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(provider)}`} />
                  <div>
                    <p className="text-sm font-medium capitalize text-gray-800">
                      {provider.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {provider.config?.model !== 'N/A' ? provider.config.model : 'Not configured'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {provider.active && (
                    <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                  {!provider.available && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                      Offline
                    </span>
                  )}
                  <span className="text-sm">{getStatusIcon(provider)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center space-x-2 p-2 bg-blue-50 rounded">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-xs text-blue-600 font-medium">Switching provider...</span>
            </div>
          )}

          {/* Legend */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
            <p className="mb-1 font-medium">Status:</p>
            <div className="flex justify-between text-xs">
              <span>✅ Active & Ready</span>
              <span>⚪ Available</span>
              <span>❌ Offline/Not configured</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMProviderSelector;
