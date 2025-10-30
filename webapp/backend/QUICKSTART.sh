#!/bin/bash
# Quick reference guide for the multi-provider LLM system

cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║          🤖 Multi-Provider LLM System - Quick Guide            ║
╔════════════════════════════════════════════════════════════════╝

📋 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Implementation: COMPLETE
✅ 4 Providers: OpenAI | Ollama | vLLM | Anthropic
✅ Dynamic Switching: Yes (runtime, no restart needed)
✅ UI Component: Beautiful selector with status indicators
✅ Fallback System: Auto-regex parser on LLM failure
✅ API Endpoints: 3 new endpoints for provider management

🚀 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  RESTART BACKEND (Important!)
   cd webapp/backend
   # Stop current backend (Ctrl+C in python terminal)
   python main.py

2️⃣  START FRONTEND
   cd webapp/frontend
   npm run dev

3️⃣  OPEN BROWSER
   http://localhost:3000

4️⃣  FIND LLM SELECTOR
   Look for "🤖 LLM Provider" in chat panel
   Click to expand → See all providers
   Click any available provider to switch

📡 API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GET  /api/llm/providers
     → List all providers with status

POST /api/llm/switch-provider
     Body: {"provider": "ollama"}
     → Switch active provider

GET  /api/llm/status
     → Current provider status

POST /api/interpret-command
     Body: {"text": "zoom to 10x"}
     → Parse command (now with provider info)

🧪 TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 1: Simple Test (After restarting backend)
   ./test_simple.sh

Option 2: Full Test (After restarting backend)
   ./test_llm_providers.sh

Option 3: Manual cURL
   curl http://localhost:8088/api/llm/providers
   curl -X POST http://localhost:8088/api/llm/switch-provider \
     -H "Content-Type: application/json" \
     -d '{"provider": "ollama"}'

⚙️  CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Edit: config.yaml

llm:
  provider: ollama        # Default provider
  fallback_to_rules: true # Use regex if LLM fails

ollama:
  api_url: http://localhost:11434/api/chat
  model: mistral:latest
  
openai:
  api_key: "sk-..."
  model: gpt-4o-mini-2024-07-18

📦 PROVIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────┬──────────┬─────────┬──────────┬──────────┐
│ Provider    │ Cost     │ Speed   │ Privacy  │ Quality  │
├─────────────┼──────────┼─────────┼──────────┼──────────┤
│ OpenAI      │ Paid     │ Fast    │ Cloud    │ Excellent│
│ Ollama      │ FREE ✓   │ Medium  │ Local ✓  │ Good     │
│ vLLM        │ Varies   │ Fast    │ Custom   │ Varies   │
│ Anthropic   │ Paid     │ Fast    │ Cloud    │ Excellent│
└─────────────┴──────────┴─────────┴──────────┴──────────┘

🎨 UI FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status Indicators:
  🟢 Green  → Active and ready
  ⚪ White  → Available but inactive
  🔴 Red    → Offline/not configured

Auto-refresh: Every 30 seconds
One-click switching: No confirmation needed
Collapse/expand: Click header to toggle

🔧 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Not Found" errors?
   → Backend needs restart! Stop and run: python main.py

❌ Ollama not available?
   → ollama serve
   → ollama pull mistral:latest

❌ OpenAI not available?
   → Check API key in config.yaml

❌ JSON parsing errors?
   → Fallback parser activates automatically
   → Commands still work!

📚 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LLM_PROVIDER_GUIDE.md       → Complete guide
MULTI_PROVIDER_README.md    → Quick start
IMPLEMENTATION_COMPLETE.md  → Technical summary

🎉 SUCCESS CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Dependencies installed (pip install -r requirements.txt)
✅ Backend restarted with new code
✅ Frontend running (npm run dev)
✅ Can see provider selector in UI
✅ Can switch providers
✅ Commands work with different providers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIP: The backend MUST be restarted to load the new endpoints!
     Press Ctrl+C in the python terminal, then run: python main.py

╚════════════════════════════════════════════════════════════════╝
EOF
