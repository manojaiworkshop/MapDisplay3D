# Action Configuration System

## Overview

The application uses a **config-based action system** where all available map actions are defined in `backend/config.yaml` and implemented in the frontend UI. This architecture provides:

- ✅ **Single source of truth** - All actions defined in one place
- ✅ **Easy extensibility** - Add new actions by updating config + UI
- ✅ **Type safety** - Actions validated against config schema
- ✅ **Documentation** - Config serves as action documentation

## Architecture Flow

```
User Input (Chat)
    ↓
Backend /api/interpret-command (OpenAI + Regex)
    ↓
Parse to Action Objects (based on config.yaml actions)
    ↓
Return JSON: { actions: [...] }
    ↓
Frontend receives actions
    ↓
App.jsx handleAction() (switch statement)
    ↓
MapCanvas imperative methods (via ref)
    ↓
Map updates
```

## Configuration Structure

### Location
- **File**: `backend/config.yaml`
- **Section**: `actions:`

### Format
```yaml
actions:
  <action_name>:
    type: "<action_type>"
    modes: [...]           # Optional: for actions with modes
    parameters:            # List of required parameters
      - "param1"
      - "param2"
    examples:              # Natural language examples
      - "example 1"
      - "example 2"
```

## Available Actions

### 1. Zoom Action
**Config Definition**:
```yaml
zoom:
  type: "zoom"
  modes:
    - "to"  # Absolute zoom level
    - "by"  # Relative zoom factor
  parameters:
    - "value"  # Zoom level or factor
    - "mode"   # 'to' or 'by'
  examples:
    - "zoom to 10x"
    - "zoom in by 2x"
    - "zoom out by 0.5x"
```

**JSON Format**:
```json
{
  "type": "zoom",
  "mode": "to",      // "to" or "by"
  "value": 10        // number
}
```

**UI Implementation** (`App.jsx`):
```javascript
case 'zoom':
  if (action.mode === 'to') mapRef.current.zoomTo(action.value);
  else if (action.mode === 'by') mapRef.current.zoomBy(action.value);
  break;
```

**MapCanvas Methods**:
- `zoomTo(value)` - Set absolute zoom level
- `zoomBy(factor)` - Multiply current zoom by factor

---

### 2. Center Action
**Config Definition**:
```yaml
center:
  type: "center"
  parameters:
    - "lat"  # Latitude
    - "lon"  # Longitude
  examples:
    - "center 28.64, 77.22"
    - "center on coordinates 19.0760, 72.8777"
```

**JSON Format**:
```json
{
  "type": "center",
  "lat": 28.64,    // latitude (number)
  "lon": 77.22     // longitude (number)
}
```

**UI Implementation**:
```javascript
case 'center':
  mapRef.current.centerOn(action.lat, action.lon);
  break;
```

**MapCanvas Methods**:
- `centerOn(lat, lon)` - Move map center to coordinates

---

### 3. Pan Action
**Config Definition**:
```yaml
pan:
  type: "pan"
  parameters:
    - "lat"
    - "lon"
  examples:
    - "pan to 28.64, 77.22"
```

**JSON Format**:
```json
{
  "type": "pan",
  "lat": 28.64,
  "lon": 77.22
}
```

**UI Implementation**:
```javascript
case 'pan':
  mapRef.current.centerOn(action.lat, action.lon);
  break;
```

> **Note**: Pan uses the same implementation as center.

---

### 4. Go to Station Action
**Config Definition**:
```yaml
goto_station:
  type: "goto_station"
  parameters:
    - "name"  # Station name
  examples:
    - "goto station Mumbai"
    - "go to New Delhi station"
    - "show me Chennai Central"
```

**JSON Format**:
```json
{
  "type": "goto_station",
  "name": "Mumbai"    // station name (string)
}
```

**UI Implementation**:
```javascript
case 'goto_station':
  mapRef.current.gotoStationByName(action.name);
  break;
```

**MapCanvas Methods**:
- `gotoStationByName(name)` - Find station by name and center on it

---

### 5. Reset Action
**Config Definition**:
```yaml
reset:
  type: "reset"
  parameters: []
  examples:
    - "reset view"
    - "reset map"
    - "show full map"
```

**JSON Format**:
```json
{
  "type": "reset"
}
```

**UI Implementation**:
```javascript
case 'reset':
  loadData();  // Reload data and fit to India boundary
  break;
```

---

## Adding New Actions

### Step 1: Define in config.yaml
```yaml
actions:
  highlight:
    type: "highlight"
    parameters:
      - "stationName"
      - "color"
    examples:
      - "highlight Mumbai in red"
      - "mark Chennai Central as important"
```

### Step 2: Update Backend Parser (Optional)
If using regex fallback, add pattern in `backend/main.py`:
```python
# In parse_with_regex function
if re.search(r'highlight\s+(\w+)\s+in\s+(\w+)', text):
    match = re.search(r'highlight\s+(\w+)\s+in\s+(\w+)', text)
    return [{"type": "highlight", "stationName": match.group(1), "color": match.group(2)}]
```

### Step 3: Implement in Frontend
Add case to `App.jsx` `handleAction()`:
```javascript
case 'highlight':
  mapRef.current.highlightStation(action.stationName, action.color);
  break;
```

### Step 4: Add MapCanvas Method
Add method to `MapCanvas.jsx` `useImperativeHandle`:
```javascript
useImperativeHandle(ref, () => ({
  // ... existing methods
  highlightStation: (name, color) => {
    // Implementation
  }
}));
```

---

## Action Validation

### Backend
The backend validates actions against the config structure:
```python
from config import ACTIONS

@app.get("/api/actions")
async def get_actions():
    """Return available actions to frontend"""
    return {"actions": ACTIONS}
```

### Frontend
The frontend fetches and displays available actions:
```javascript
useEffect(() => {
  fetch('/api/actions')
    .then(res => res.json())
    .then(data => setActions(data.actions || {}))
    .catch(err => console.error('Failed to fetch actions:', err));
}, []);
```

---

## Natural Language Processing

### OpenAI Method
When `OPENAI_API_KEY` is configured:
1. User text sent to OpenAI GPT-4
2. Model instructed to parse into action JSON
3. Response validated against config schema
4. Actions returned to frontend

### Regex Fallback
When no OpenAI key:
1. User text matched against regex patterns
2. Patterns aligned with config actions
3. Action objects constructed manually
4. Actions returned to frontend

---

## UI Layout & Scrolling

### Screen Height Management

**App.jsx Container**:
```jsx
<div className="w-screen h-screen flex flex-col overflow-hidden">
  <header className="flex-shrink-0">...</header>
  <main className="flex-1 overflow-hidden">
    <div className="flex h-full overflow-hidden">
      <ChatPanel />  {/* Fixed width, scroll inside */}
      <MapCanvas />  {/* Flex-1, fills remaining space */}
    </div>
  </main>
  <footer className="flex-shrink-0">...</footer>
</div>
```

**ChatPanel Scroll**:
```jsx
// Messages area with calculated height
<div 
  className="flex-1 overflow-y-auto"
  style={{ 
    maxHeight: 'calc(100vh - 320px)',  // Calculated from screen height
    minHeight: '200px'
  }}
>
  {messages.map(...)}
</div>
```

**MapCanvas Full Height**:
```jsx
// Uses parent's full height, no vertical scroll
useEffect(() => {
  const handleResize = () => {
    if (canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      setDimensions({
        width: parent.clientWidth,
        height: parent.clientHeight  // Full height
      });
    }
  };
  // ...
}, []);
```

### Key CSS Classes
- `overflow-hidden` - Prevents scroll on containers
- `flex-shrink-0` - Prevents header/footer from shrinking
- `overflow-y-auto` - Enables vertical scroll for chat messages
- `flex-1` - Fills remaining space

---

## Testing Actions

### Via Chat
```
User: "zoom to 10x"
→ {"type": "zoom", "mode": "to", "value": 10}

User: "goto station Mumbai"
→ {"type": "goto_station", "name": "Mumbai"}

User: "center 28.64, 77.22"
→ {"type": "center", "lat": 28.64, "lon": 77.22}
```

### Via API
```bash
curl -X POST http://localhost:8000/api/interpret-command \
  -H "Content-Type: application/json" \
  -d '{"text": "zoom to 15x"}'
```

**Response**:
```json
{
  "actions": [
    {"type": "zoom", "mode": "to", "value": 15}
  ]
}
```

---

## Error Handling

### Unknown Action Type
```javascript
default:
  console.warn('Unknown action type:', action.type);
```

### Missing Parameters
OpenAI should include all required parameters. If missing:
```javascript
if (!action.lat || !action.lon) {
  console.error('Missing coordinates for center action');
  return;
}
```

### Backend Validation
```python
if action.type not in ACTIONS:
    return {"error": f"Unknown action type: {action.type}"}
```

---

## Benefits

1. **Centralized Definition** - All actions in `config.yaml`
2. **Self-Documenting** - Examples included in config
3. **Easy Maintenance** - Change config without code changes
4. **Extensible** - Add actions with minimal code
5. **Validated** - Actions checked against schema
6. **Discoverable** - Frontend can list available actions

---

## API Endpoints

### GET /api/actions
Returns available actions from config.

**Response**:
```json
{
  "actions": {
    "zoom": {...},
    "center": {...},
    "pan": {...},
    "goto_station": {...},
    "reset": {...}
  }
}
```

### POST /api/interpret-command
Interprets natural language command and returns actions.

**Request**:
```json
{"text": "zoom to 10x and goto station Mumbai"}
```

**Response**:
```json
{
  "actions": [
    {"type": "zoom", "mode": "to", "value": 10},
    {"type": "goto_station", "name": "Mumbai"}
  ]
}
```

---

## Summary

The config-based action system provides a clean, maintainable architecture where:
1. **Backend** defines actions in YAML
2. **NLP interpreter** parses user intent to actions
3. **Frontend** implements actions as UI operations
4. **MapCanvas** provides imperative API methods
5. **Layout** uses calculated heights with proper scrolling

All actions flow through the config, ensuring consistency and documentation.
