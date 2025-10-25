import React, { useState, useEffect } from 'react';

const TripDrawer = ({ stations = [], isOpen = false, onClose = () => {}, onStart = () => {}, onStop = () => {} }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [speed, setSpeed] = useState(1); // multiplier: 0.5x .. 5x
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // reset local state when closing
      setRunning(false);
    }
  }, [isOpen]);

  const handleStart = () => {
    if (!source || !destination) return;
    setRunning(true);
    onStart({ source, destination, speed });
  };

  const handleStop = () => {
    setRunning(false);
    onStop();
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl transform transition-transform z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plan Trip</h3>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-800">✕</button>
      </div>

      <div className="p-4 space-y-4 overflow-auto h-full">
        <div>
          <label className="block text-sm font-medium text-gray-700">Source Station</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
            <option value="">Select source</option>
            {stations.map((s, i) => (
              <option key={i} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Destination Station</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300">
            <option value="">Select destination</option>
            {stations.map((s, i) => (
              <option key={i} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Speed</label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">Speed: {speed}x</div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleStart} disabled={!source || !destination || running} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            Start
          </button>
          <button onClick={handleStop} disabled={!running} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
            Stop
          </button>
        </div>

        <div className="text-xs text-gray-500">
          The engine will follow the rail tracks between source and destination. The screen will follow the engine automatically.
        </div>
      </div>
    </div>
  );
};

export default TripDrawer;
