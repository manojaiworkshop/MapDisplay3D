import os
import yaml
from pathlib import Path

# Backend configuration for multi-provider LLM integration

# Load config from YAML file
CONFIG_FILE = Path(__file__).parent / "config.yaml"
config_data = {}

if CONFIG_FILE.exists():
    try:
        with open(CONFIG_FILE, 'r') as f:
            config_data = yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Could not load config.yaml: {e}")

# LLM Configuration - All providers
LLM_CONFIG = config_data.get('llm', {})
ACTIVE_PROVIDER = LLM_CONFIG.get('provider', 'openai')
FALLBACK_TO_RULES = LLM_CONFIG.get('fallback_to_rules', True)

# OpenAI Configuration (priority: config.yaml > env vars > defaults)
OPENAI_CONFIG = config_data.get('openai', {})
OPENAI_API_KEY = OPENAI_CONFIG.get('api_key') or os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = OPENAI_CONFIG.get('model', 'gpt-4o-mini-2024-07-18')
OPENAI_TEMPERATURE = OPENAI_CONFIG.get('temperature', 1.0)
OPENAI_MAX_TOKENS = OPENAI_CONFIG.get('max_tokens', 2048)
OPENAI_TOP_P = OPENAI_CONFIG.get('top_p', 1.0)

# Ollama Configuration
OLLAMA_CONFIG = config_data.get('ollama', {})

# vLLM Configuration
VLLM_CONFIG = config_data.get('vllm', {})

# Anthropic Configuration
ANTHROPIC_CONFIG = config_data.get('anthropic', {})

# Action Definitions (loaded from config.yaml)
ACTIONS = config_data.get('actions', {})

# CORS Origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
# Example output from NLP: {"action": "zoom", "type": "to", "value": 10}
