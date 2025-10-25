# Quick Start Guide - Indian Railway Stations Map Web App

## 🚀 Quick Start

### Backend (Terminal 1)

```bash
cd /home/manoj/Downloads/sample/webapp/backend
source venv/bin/activate
python main.py
```

The API will start on `http://localhost:8000`

### Frontend (Terminal 2)

```bash
cd /home/manoj/Downloads/sample/webapp/frontend
npm run dev
```

The app will open on `http://localhost:3000`

---

## 🎮 How to Use the Chat Interface

### Example Commands

**Zoom Commands:**
- `zoom to 10x` - Zoom to exact scale
- `zoom in by 2x` - Zoom in by factor
- `zoom out by 2x` - Zoom out by factor

**Navigation Commands:**
- `goto station New Delhi` - Go to a specific station
- `center 28.64,77.22` - Center on coordinates (lat,lon)
- `zoom to lat:28.64, lon:77.22` - Center on specific location

**Examples:**
```
zoom to 50x
goto station Mumbai
zoom in by 3x
center 23.0, 78.0
```

---

## ⚙️ OpenAI Configuration

The backend uses `config.yaml` for OpenAI settings:

```yaml
openai:
  api_key: "your-api-key-here"
  model: gpt-4o-mini-2024-07-18
  temperature: 1.0
  max_tokens: 2048
  top_p: 1.0
```

**Configuration Priority:**
1. `config.yaml` (highest priority)
2. Environment variables (`OPENAI_API_KEY`, etc.)
3. Defaults (fallback to rule-based parser)

**With OpenAI:** The system uses GPT to understand natural language and convert it to map actions.

**Without OpenAI:** Falls back to regex-based command parsing (still works!).

---

## 📱 Responsive Design

- **Desktop:** Chat panel on left (320-384px), map on right
- **Mobile:** Chat on top, map below (vertical stack)

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd backend
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd frontend
npm install
```

### Commands not working
- Check backend logs for parsing errors
- Try simpler commands: `zoom to 10x`
- Check that backend is running on port 8000

### OpenAI not working
- Verify API key in `config.yaml` is valid
- Check backend logs for OpenAI errors
- System falls back to rule-based parser automatically

---

## 📊 API Endpoints

- `POST /api/interpret-command` - Parse natural language command
- `GET /api/stations?dataset=default|full` - Get stations
- `GET /api/india-boundary?detailed=true` - Get boundary
- `GET /api/states` - Get state boundaries

---

## 🎯 Features

✅ Chat-based map control  
✅ Natural language understanding (with OpenAI)  
✅ Rule-based fallback parser  
✅ Canvas-based rendering  
✅ Zoom, pan, goto station  
✅ 22 or 90+ station datasets  
✅ Mobile responsive  
✅ No external map dependencies  

---

## 📝 Configuration Files

### Backend
- `config.yaml` - OpenAI and app settings
- `config.py` - Configuration loader
- `main.py` - FastAPI server
- `data/` - GeoJSON files

### Frontend
- `src/App.jsx` - Main application
- `src/components/MapCanvas.jsx` - Canvas map widget
- `src/components/ChatPanel.jsx` - Chat interface
- `src/utils/api.js` - Backend API client

---

## 🔧 Environment Variables

```bash
# Optional - can use config.yaml instead
export OPENAI_API_KEY="your-key-here"
export OPENAI_MODEL="gpt-4o-mini-2024-07-18"
```

---

**Ready to go!** Open the frontend at http://localhost:3000 and start chatting with your map! 🗺️💬
