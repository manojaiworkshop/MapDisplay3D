# Multi-Provider LLM System - Complete Guide

## 🎯 Overview

The application now supports **4 LLM providers** that can be dynamically switched at runtime:

1. **OpenAI** (GPT-4o-mini) - Cloud-based, requires API key
2. **Ollama** (Mistral) - Local LLM, free, runs on your machine
3. **vLLM** - Custom deployment, OpenAI-compatible API
4. **Anthropic** (Claude) - Cloud-based, requires API key

## 🏗️ Architecture

```
Frontend (React)
    ↓
LLMProviderSelector Component
    ↓
Backend FastAPI
    ↓
LLMProviderManager
    ↓
[OpenAI | Ollama | vLLM | Anthropic] Provider Classes
    ↓
Rule-based Fallback (if enabled)
```

## 📁 Files Added/Modified

### Backend
- `llm_provider.py` - Provider abstraction layer
- `config.py` - Updated to load all provider configs
- `config.yaml` - Multi-provider configuration
- `main.py` - Updated to use provider manager
- `requirements.txt` - Added anthropic and requests

### Frontend
- `LLMProviderSelector.jsx` - UI component for switching providers
- `ChatPanel.jsx` - Integrated provider selector

## 🔧 Configuration (config.yaml)

```yaml
# Active provider selection
llm:
  provider: ollama  # Current: openai | ollama | vllm | anthropic
  fallback_to_rules: true  # Use regex if LLM fails

# OpenAI Configuration
openai:
  api_key: "sk-..."
  model: gpt-4o-mini-2024-07-18
  temperature: 1.0
  max_tokens: 2048
  top_p: 1.0

# Ollama (Local LLM)
ollama:
  api_url: http://localhost:11434/api/chat
  model: mistral:latest
  temperature: 0.7
  max_tokens: 2048
  stream: false

# vLLM (Custom Deployment)
vllm:
  api_url: http://10.35.118.246:8000/v1/chat/completions
  model: /models
  temperature: 0.7
  max_tokens: 2048
  top_p: 1.0

# Anthropic (Claude)
anthropic:
  api_key: ""  # Add your key
  model: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 2048
  top_p: 1.0
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd webapp/backend
pip install -r requirements.txt
```

### 2. Configure Providers

Edit `config.yaml` and:
- Add API keys for OpenAI/Anthropic
- Update Ollama/vLLM URLs if different
- Set default provider in `llm.provider`

### 3. Install Ollama (Optional - for local LLM)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Mistral model
ollama pull mistral:latest

# Start Ollama server (runs on localhost:11434)
ollama serve
```

### 4. Start Backend

```bash
cd webapp/backend
python main.py
```

Backend runs on: http://localhost:8088

### 5. Start Frontend

```bash
cd webapp/frontend
npm run dev
```

Frontend runs on: http://localhost:3000

## 🎮 Usage

### Frontend UI

1. **Open Chat Panel** - Look for "🤖 LLM Provider" section
2. **Click to Expand** - See all available providers
3. **Switch Provider** - Click on any available (green/white) provider
4. **View Status**:
   - ✅ **Green** = Active and ready
   - ⚪ **White** = Available but not active
   - ❌ **Red** = Offline or not configured

### API Endpoints

#### Get All Providers
```bash
curl http://localhost:8088/api/llm/providers
```

Response:
```json
{
  "providers": [
    {
      "name": "openai",
      "available": true,
      "active": false,
      "config": {
        "model": "gpt-4o-mini-2024-07-18",
        "api_url": "N/A"
      }
    },
    {
      "name": "ollama",
      "available": true,
      "active": true,
      "config": {
        "model": "mistral:latest",
        "api_url": "http://localhost:11434/api/chat"
      }
    }
  ],
  "active": "ollama",
  "fallback_enabled": true
}
```

#### Switch Provider
```bash
curl -X POST http://localhost:8088/api/llm/switch-provider \
  -H "Content-Type: application/json" \
  -d '{"provider": "ollama"}'
```

Response:
```json
{
  "success": true,
  "provider": "ollama",
  "message": "Switched to ollama provider"
}
```

#### Get Current Status
```bash
curl http://localhost:8088/api/llm/status
```

Response:
```json
{
  "active_provider": "ollama",
  "is_available": true,
  "fallback_enabled": true,
  "config": {
    "model": "mistral:latest",
    "temperature": 0.7
  }
}
```

#### Test Command Interpretation
```bash
curl -X POST http://localhost:8088/api/interpret-command \
  -H "Content-Type: application/json" \
  -d '{"text": "zoom to 10x"}'
```

Response:
```json
{
  "actions": [
    {
      "type": "zoom",
      "mode": "to",
      "value": 10
    }
  ],
  "provider": "ollama",
  "method": "llm"
}
```

## 🔍 Provider Comparison

| Feature | OpenAI | Ollama | vLLM | Anthropic |
|---------|--------|--------|------|-----------|
| **Cost** | Paid | Free | Varies | Paid |
| **Speed** | Fast | Medium | Fast | Fast |
| **Privacy** | Cloud | Local | Custom | Cloud |
| **Quality** | Excellent | Good | Varies | Excellent |
| **Setup** | Easy | Medium | Complex | Easy |
| **Offline** | ❌ | ✅ | Depends | ❌ |

## 🐛 Troubleshooting

### Ollama Not Available

**Problem:** Ollama shows as offline (red indicator)

**Solutions:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Check if model is pulled
ollama list

# Pull model if missing
ollama pull mistral:latest
```

### OpenAI/Anthropic Not Available

**Problem:** Cloud providers show as offline

**Solution:**
- Check API key in `config.yaml`
- Verify API key is valid
- Check internet connection

### vLLM Not Available

**Problem:** vLLM server unreachable

**Solution:**
- Verify `api_url` in config.yaml
- Check if vLLM server is running
- Test connection: `curl http://your-vllm-url/health`

### JSON Parsing Errors

**Problem:** Log shows "LLM parsing failed: Expecting value"

**Cause:** LLM returned non-JSON or malformed JSON

**Solution:** 
- Fallback parser automatically activates
- Tune prompt in `main.py` for better JSON output
- Adjust temperature (lower = more consistent)
- Use a different model/provider

### Fallback Not Working

**Problem:** Errors instead of falling back to rules

**Solution:**
- Set `fallback_to_rules: true` in config.yaml
- Restart backend server

## 📊 Monitoring

### Backend Logs

Watch logs for provider activity:
```bash
# In terminal where backend is running
# Look for these log indicators:

🚀 LLM Provider Manager initialized - Active: ollama
🔍 Interpreting command: ... (Provider: ollama)
✅ LLM parsed successfully: [...]
❌ LLM parsing failed: ...
📋 Using rule-based parser as fallback
✅ Successfully switched to provider: vllm
```

### Frontend Console

Open browser DevTools (F12) and watch for:
- Provider switch confirmations
- API call responses
- Error messages

## 🎨 Customization

### Add a New Provider

1. Create provider class in `llm_provider.py`:

```python
class MyCustomProvider(LLMProvider):
    def is_available(self) -> bool:
        # Check if provider is ready
        return True
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        # Implement generation logic
        return "generated text"
```

2. Add config to `config.yaml`:

```yaml
mycustom:
  api_url: http://localhost:8000
  model: custom-model
  temperature: 0.7
```

3. Register in `LLMProviderManager`:

```python
self.providers = {
    'openai': OpenAIProvider(...),
    'ollama': OllamaProvider(...),
    'mycustom': MyCustomProvider(config.get('mycustom', {}))
}
```

### Adjust Prompt Template

Edit `main.py`, find the `interpret_command` function:

```python
prompt = (
    "Convert the following user instruction into a JSON array..."
    # Customize this prompt for better results
)
```

### Change Default Provider

Edit `config.yaml`:

```yaml
llm:
  provider: openai  # Change this
  fallback_to_rules: true
```

## 🔐 Security Notes

1. **API Keys** - Never commit API keys to git
2. **Environment Variables** - Use `.env` for production
3. **CORS** - Configure properly for production
4. **Rate Limiting** - Add rate limiting for API endpoints
5. **Authentication** - Add auth for production deployments

## 📈 Performance Tips

1. **Ollama**:
   - Use GPU acceleration for faster inference
   - Choose smaller models for speed (e.g., `mistral:7b`)
   - Adjust `num_predict` for faster responses

2. **OpenAI/Anthropic**:
   - Lower temperature for consistent JSON
   - Use smaller models (gpt-4o-mini, claude-haiku)
   - Cache common queries

3. **General**:
   - Enable fallback for instant responses
   - Adjust `max_tokens` based on needs
   - Monitor response times in logs

## 🧪 Testing

Test all providers:

```bash
# Test provider listing
curl http://localhost:8088/api/llm/providers | jq

# Test each provider
for provider in openai ollama vllm anthropic; do
  echo "Testing $provider..."
  curl -X POST http://localhost:8088/api/llm/switch-provider \
    -H "Content-Type: application/json" \
    -d "{\"provider\": \"$provider\"}" | jq
  
  curl -X POST http://localhost:8088/api/interpret-command \
    -H "Content-Type: application/json" \
    -d '{"text": "zoom to 10x"}' | jq
done
```

## 📚 Additional Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Ollama Documentation](https://ollama.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [vLLM Documentation](https://docs.vllm.ai)

## 🎉 Success!

Your multi-provider LLM system is now configured! Users can:
- ✅ Switch between providers in real-time
- ✅ See provider availability status
- ✅ Get automatic fallback to rule-based parsing
- ✅ Choose between cloud and local LLMs
- ✅ Control costs by using free Ollama
