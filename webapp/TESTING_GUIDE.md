# Quick Test Guide

## Start the Application

### Terminal 1 - Backend
```bash
cd /home/manoj/Downloads/sample/webapp/backend
source venv/bin/activate
python main.py
```
Expected output: `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2 - Frontend
```bash
cd /home/manoj/Downloads/sample/webapp/frontend
npm run dev
```
Expected output: `Local: http://localhost:3000`

### Open Browser
Navigate to: `http://localhost:3000`

---

## Test Checklist

### ✅ Layout & Scrolling

1. **Chat Panel Scroll**
   - Type many messages in chat
   - Messages area should scroll independently
   - Input box should stay fixed at bottom
   - No horizontal scroll

2. **Map Canvas Height**
   - Map should fill entire right side
   - No vertical scroll on map
   - Map should resize when window resizes
   - Canvas should use full available height

3. **Responsive Design**
   - Desktop: Chat left, Map right (side-by-side)
   - Mobile: Chat top, Map bottom (stacked)
   - Header stays on top
   - Footer stays on bottom

### ✅ Config-Based Actions

1. **Check Available Actions**
   - Open DevTools Console
   - Look for "X actions available" in chat footer
   - Should show "5 actions available"

2. **Test Each Action**

   **Zoom Actions:**
   ```
   zoom to 10x
   zoom in by 2x
   zoom out by 0.5x
   ```
   Expected: Map should zoom accordingly

   **Center Actions:**
   ```
   center 28.64, 77.22
   center on coordinates 19.0760, 72.8777
   ```
   Expected: Map should center on Delhi/Mumbai

   **Pan Actions:**
   ```
   pan to 23.0, 78.0
   ```
   Expected: Map should pan to center of India

   **Go to Station:**
   ```
   goto station Mumbai
   go to New Delhi station
   show me Chennai Central
   ```
   Expected: Map should center on station

   **Reset:**
   ```
   reset view
   reset map
   show full map
   ```
   Expected: Map should reset to India boundary view

3. **Check Action Feedback**
   - After each command, assistant should reply
   - Should show "✓ Executed X action(s)"
   - No raw JSON should be visible

### ✅ Backend API

1. **Test Actions Endpoint**
   ```bash
   curl http://localhost:8000/api/actions | jq '.actions | keys'
   ```
   Expected output:
   ```json
   [
     "center",
     "goto_station",
     "pan",
     "reset",
     "zoom"
   ]
   ```

2. **Test Interpret Command**
   ```bash
   curl -X POST http://localhost:8000/api/interpret-command \
     -H "Content-Type: application/json" \
     -d '{"text": "zoom to 15x"}'
   ```
   Expected output:
   ```json
   {
     "actions": [
       {"type": "zoom", "mode": "to", "value": 15}
     ]
   }
   ```

3. **Test Multiple Commands**
   ```bash
   curl -X POST http://localhost:8000/api/interpret-command \
     -H "Content-Type: application/json" \
     -d '{"text": "zoom to 10x and goto station Mumbai"}'
   ```
   Expected: Two actions in response

### ✅ Console Checks

Open Browser DevTools Console and verify:

1. **No Errors**
   - No red error messages
   - No failed network requests

2. **Action Fetching**
   - Should see successful GET request to `/api/actions`
   - Actions object should be populated

3. **Command Processing**
   - Each chat message should trigger POST to `/api/interpret-command`
   - Response should contain actions array

---

## Common Issues & Solutions

### Issue: Chat messages overflow bottom
**Solution**: Check that ChatPanel has `maxHeight: calc(100vh - 320px)` and `overflow-y-auto`

### Issue: Map has vertical scroll
**Solution**: 
- Check parent has `overflow-hidden`
- Check map container has `flex-1 overflow-hidden`

### Issue: "0 actions available"
**Solution**: 
- Check backend is running
- Check `/api/actions` endpoint returns data
- Check browser console for network errors

### Issue: OpenAI errors in backend
**Solution**: OpenAI API v1.0+ is now used. Errors fall back to regex parser automatically.

### Issue: Actions not executing
**Solution**:
- Check browser console for errors
- Verify `handleAction()` switch statement has case for action type
- Verify mapRef.current is not null

---

## Performance Checks

### Memory
- Chat should not leak memory with many messages
- Map should maintain 60 FPS during pan/zoom

### Responsiveness
- Chat input should be immediately responsive
- Map should update smoothly
- No UI freezing during actions

### Network
- Actions endpoint called once on mount
- Interpret endpoint called once per message
- No unnecessary API calls

---

## Browser Compatibility

Test in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

All modern browsers should work with Canvas API.

---

## Mobile Testing

If testing on mobile:
1. Chat panel should be on top
2. Map should be below chat
3. Both should use full width
4. Touch interactions should work
5. Scroll should work independently

---

## Success Criteria

✅ Chat messages scroll independently  
✅ Map uses full height without scroll  
✅ All 5 actions work correctly  
✅ Action count displays (5 actions)  
✅ No console errors  
✅ Layout is responsive  
✅ Config loads from YAML  
✅ OpenAI v1.0 API works  

If all checks pass: **Implementation successful!** 🎉

---

## Documentation

- **Complete Guide**: See `ACTIONS_CONFIG.md`
- **Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Quick Start**: See `QUICKSTART.md`
- **Full Docs**: See `README.md`
