import os
import yaml
from pathlib import Path

# Backend configuration for optional OpenAI integration

# Try to load config from YAML file first
CONFIG_FILE = Path(__file__).parent / "config.yaml"
config_data = {}

if CONFIG_FILE.exists():
    try:
        with open(CONFIG_FILE, 'r') as f:
            config_data = yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Could not load config.yaml: {e}")

import os
import yaml

# Load config from YAML file
config_data = {}
config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        config_data = yaml.safe_load(f) or {}

# OpenAI Configuration (priority: config.yaml > env vars > defaults)
OPENAI_API_KEY = config_data.get('openai', {}).get('api_key') or os.getenv('OPENAI_API_KEY')
OPENAI_MODEL = config_data.get('openai', {}).get('model', 'gpt-4o-mini-2024-07-18')
OPENAI_TEMPERATURE = config_data.get('openai', {}).get('temperature', 1.0)
OPENAI_MAX_TOKENS = config_data.get('openai', {}).get('max_tokens', 2048)
OPENAI_TOP_P = config_data.get('openai', {}).get('top_p', 1.0)

# Action Definitions (loaded from config.yaml)
ACTIONS = config_data.get('actions', {})

# CORS Origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]

# Allowed origins for frontend
ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173'
]

# Simple command schema
# Example output from NLP: {"action": "zoom", "type": "to", "value": 10}
