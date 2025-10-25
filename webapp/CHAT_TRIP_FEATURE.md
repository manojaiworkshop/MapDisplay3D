# Chat-Based Trip Animation Feature

## Overview
Added the ability to start trip animations directly from the chat interface using natural language commands. Users can type "start trip from NDLS to Howrah" and the trip will automatically start with a default speed.

## Feature Summary

### Natural Language Commands
Users can now control trip animations using chat commands like:
- "start trip from NDLS to Howrah"
- "trip from Mumbai to Delhi"
- "start journey from Chennai to Bangalore"
- "start trip from Pune to Kolkata at 5x speed"

### Default Behavior
- **Default Speed**: 3.0x (if not specified)
- **Auto-opens Drawer**: Trip drawer automatically opens when trip starts
- **Intelligent Parsing**: Works with station names, codes, or common names

## Implementation

### Backend Changes

#### 1. Config.yaml
Added `start_trip` action definition:
```yaml
start_trip:
  type: "start_trip"
  parameters:
    - "source"       # Source station name
    - "destination"  # Destination station name
    - "speed"        # Optional speed (default: 3.0)
  examples:
    - "start trip from NDLS to Howrah"
    - "trip from Mumbai to Delhi"
    - "start journey from Chennai to Kolkata"
```

#### 2. main.py - OpenAI Prompt
Updated prompt to include `start_trip` action:
```python
prompt = (
    "Actions supported: "
    "start_trip (source: station name, destination: station name, "
    "speed: optional number default 3.0) - animates trip from source to destination. "
)
```

#### 3. main.py - Regex Parser
Added regex pattern to parse trip commands:
```python
trip_pattern = r"(?:start\s+)?(?:trip|journey)\s+from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+at\s+(\d+(?:\.\d+)?)x?\s*speed)?(?:\s|$)"
```

**Pattern Explanation**:
- `(?:start\s+)?` - Optional "start" keyword
- `(?:trip|journey)` - Matches "trip" or "journey"
- `\s+from\s+` - " from "
- `([a-zA-Z\s]+?)` - Capture source station name
- `\s+to\s+` - " to "
- `([a-zA-Z\s]+?)` - Capture destination station name
- `(?:\s+at\s+(\d+(?:\.\d+)?)x?\s*speed)?` - Optional speed like "at 5x speed"

**Response Format**:
```json
{
  "actions": [
    {
      "type": "start_trip",
      "source": "NDLS",
      "destination": "Howrah",
      "speed": 3.0
    }
  ]
}
```

### Frontend Changes

#### App.jsx - handleAction()
Added case for `start_trip` action:
```javascript
case 'start_trip':
  const speed = action.speed || 3.0; // Default speed 3.0x
  setIsTripDrawerOpen(true); // Auto-open drawer
  await mapRef.current.startTrip({ 
    source: action.source, 
    destination: action.destination, 
    speed 
  });
  break;
```

**Behavior**:
1. Extracts speed (defaults to 3.0x)
2. Opens trip drawer automatically
3. Calls MapCanvas.startTrip() method
4. Trip begins immediately

## Usage Examples

### Basic Trip (Default Speed)
**User Input**: "start trip from NDLS to Howrah"

**Backend Response**:
```json
{
  "actions": [
    {
      "type": "start_trip",
      "source": "NDLS",
      "destination": "Howrah",
      "speed": 3.0
    }
  ]
}
```

**Result**:
- Trip drawer opens
- Engine moves from NDLS to Howrah at 3x speed
- Map follows engine
- All intermediate stations highlighted

### Trip with Custom Speed
**User Input**: "start trip from Mumbai to Delhi at 5x speed"

**Backend Response**:
```json
{
  "actions": [
    {
      "type": "start_trip",
      "source": "Mumbai",
      "destination": "Delhi",
      "speed": 5.0
    }
  ]
}
```

**Result**:
- Same as above but moves faster (5x speed)

### Alternative Phrasings
All of these work:
- "trip from Chennai to Bangalore"
- "start journey from Pune to Kolkata"
- "start trip from Kolkata to Mumbai at 2x speed"
- "journey from Delhi to Chennai"

## Station Name Matching

### Flexible Matching
The system is case-insensitive and matches station names flexibly:
- "NDLS" → New Delhi
- "Howrah" → Howrah Junction
- "Mumbai" → Mumbai CST
- "Delhi" → New Delhi
- "Chennai" → Chennai Central

### Multiple Names
Stations can be referenced by:
- **Official names**: "New Delhi", "Mumbai Central"
- **Short names**: "Delhi", "Mumbai"
- **Station codes**: "NDLS", "BCT", "MAS"

## Flow Diagram

```
User types in chat: "start trip from NDLS to Howrah"
           ↓
ChatPanel sends to backend: POST /api/interpret-command
           ↓
Backend (OpenAI or Regex) parses command
           ↓
Returns action: {"type": "start_trip", "source": "NDLS", "destination": "Howrah", "speed": 3.0}
           ↓
ChatPanel calls: onSend(action)
           ↓
App.jsx handleAction() receives action
           ↓
Opens trip drawer: setIsTripDrawerOpen(true)
           ↓
Calls: mapRef.current.startTrip({ source, destination, speed })
           ↓
MapCanvas finds station path through intermediate stations
           ↓
Animates engine along route at specified speed
           ↓
Map pans to follow engine
```

## Integration with Existing Trip UI

### Drawer Auto-Open
When a trip is started via chat:
1. Drawer automatically opens
2. Start/Stop buttons become active
3. Speed slider shows current speed
4. User can still adjust speed or stop trip manually

### Manual vs Chat Control
**Manual** (via drawer):
- User clicks Trip button
- Selects source/destination from dropdowns
- Adjusts speed slider
- Clicks Start Trip

**Chat** (via natural language):
- User types command
- Drawer opens automatically
- Trip starts immediately
- Can still use manual controls

Both methods work together seamlessly!

## Error Handling

### Station Not Found
If source or destination station doesn't exist:
```javascript
console.warn('Trip start failed: stations not found', source, destination);
```

### Invalid Command
If command doesn't match pattern:
```json
{
  "actions": [],
  "error": "Could not parse command"
}
```

### Missing Speed
Speed is optional and defaults to 3.0x:
```javascript
const speed = action.speed || 3.0;
```

## Testing

### Test Commands
```bash
# Start backend
cd /home/manoj/Downloads/sample/webapp/backend
python main.py

# Start frontend
cd /home/manoj/Downloads/sample/webapp/frontend
npm run dev

# Open browser: http://localhost:3000
```

### Test Cases
1. **Basic trip**: "start trip from NDLS to Howrah"
   - ✅ Should start trip with default speed 3.0x
   - ✅ Drawer should open
   - ✅ Engine should move along route

2. **Custom speed**: "trip from Mumbai to Delhi at 5x speed"
   - ✅ Should start at 5x speed
   - ✅ Should move faster than default

3. **Alternative phrasing**: "journey from Chennai to Bangalore"
   - ✅ Should recognize "journey" keyword
   - ✅ Should start trip normally

4. **Case insensitive**: "TRIP FROM DELHI TO MUMBAI"
   - ✅ Should work with any case

5. **Multiple words**: "start trip from New Delhi to Mumbai Central"
   - ✅ Should handle multi-word station names

## Configuration

### Speed Settings
- **Minimum**: 1.0x (slowest)
- **Default**: 3.0x (medium)
- **Maximum**: 5.0x (fastest)

### Action Configuration
Located in `backend/config.yaml`:
```yaml
start_trip:
  type: "start_trip"
  parameters:
    - "source"
    - "destination"
    - "speed"
  examples:
    - "start trip from NDLS to Howrah"
    - "trip from Mumbai to Delhi"
```

## Benefits

### For Users
✅ **Natural interaction** - Just type what you want
✅ **No UI hunting** - Don't need to find buttons
✅ **Faster workflow** - Type faster than clicking
✅ **Flexible syntax** - Multiple ways to say same thing

### For Developers
✅ **Config-based** - Action defined in YAML
✅ **Regex fallback** - Works without OpenAI
✅ **Extensible** - Easy to add more trip commands
✅ **Well-integrated** - Works with existing trip system

## Future Enhancements

### Possible Additions
1. **Stop command**: "stop trip"
2. **Pause command**: "pause trip"
3. **Resume command**: "resume trip"
4. **Speed change**: "set speed to 5x"
5. **Via stations**: "trip from Delhi to Mumbai via Jaipur"
6. **Multiple trips**: "trip 1 from X to Y, trip 2 from A to B"

## Summary

Chat-based trip control adds a powerful natural language interface to the trip animation feature:

- ✅ **Natural commands** like "start trip from NDLS to Howrah"
- ✅ **Default speed** (3.0x) if not specified
- ✅ **Auto-opens drawer** for full control
- ✅ **Flexible parsing** via OpenAI + regex
- ✅ **Case-insensitive** station matching
- ✅ **Multiple phrasings** supported
- ✅ **Config-based** action system
- ✅ **Seamless integration** with manual controls

Users can now control trip animations using either the chat interface or the manual drawer controls - whichever is more convenient!
