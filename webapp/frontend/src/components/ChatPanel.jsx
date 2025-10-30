import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_URL } from '../config/constants';
import LLMProviderSelector from './LLMProviderSelector';

const ChatPanel = ({ onSend }) => {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hi — ask me to control the map' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/actions')
      .then(res => res.json())
      .then(data => setActions(data.actions || {}))
      .catch(err => console.error('Failed to fetch actions:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch('/api/interpret-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await resp.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.error ? data.error : 'Done' }]);

      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          try {
            // Handle location details action - fetch data and show in 3D panel
            if (action.type === 'show_location_details') {
              const locationName = action.location || action.parameters?.location;
              const url = `${BACKEND_URL}/api/location/${locationName}?page=1&page_size=50`;
              
              const locationResp = await fetch(url);
              const locationData = await locationResp.json();
              
              
              // Use data field directly (backend returns flat array)
              const tableData = locationData.data || [];
              
              
              // Send to App.jsx with correct format
              await onSend({
                type: 'show_location_data',
                data: tableData,
                target: locationData.coordinates,
                altitude: action.altitude || 17000
              });
            } else {
              // Pass through other actions
              await onSend(action);
            }
          } catch (err) {
            console.error('Action failed', err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 bg-white shadow-lg">
      <div className="mb-3 pb-3 border-b">
        <h2 className="text-lg font-bold">🗨️ Map Assistant</h2>
      </div>
      
      {/* LLM Provider Selector */}
      <div className="mb-3">
        <LLMProviderSelector />
      </div>
      
      <div className="flex-1 overflow-y-auto mb-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
        rows={3}
        className="w-full p-2 border rounded-lg mb-2"
        disabled={loading}
      />
      <button onClick={sendMessage} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
        Send
      </button>
    </div>
  );
};

export default ChatPanel;
