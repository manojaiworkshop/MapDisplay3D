"""
LLM Provider Abstraction Layer
Supports multiple LLM providers: OpenAI, Ollama, vLLM, Anthropic
"""

import logging
import json
import requests
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

logger = logging.getLogger("llm_provider")


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text from the LLM"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if the provider is available/configured"""
        pass
    
    def get_provider_name(self) -> str:
        """Get the name of the provider"""
        return self.__class__.__name__.replace("Provider", "")


class OpenAIProvider(LLMProvider):
    """OpenAI GPT Provider"""
    
    def is_available(self) -> bool:
        return bool(self.config.get('api_key'))
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            from openai import OpenAI
            
            if not self.is_available():
                raise ValueError("OpenAI API key not configured")
            
            client = OpenAI(api_key=self.config['api_key'])
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            response = client.chat.completions.create(
                model=self.config.get('model', 'gpt-4o-mini-2024-07-18'),
                messages=messages,
                max_tokens=self.config.get('max_tokens', 2048),
                temperature=self.config.get('temperature', 1.0),
                top_p=self.config.get('top_p', 1.0)
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"OpenAI generation failed: {e}")
            raise


class OllamaProvider(LLMProvider):
    """Ollama Local LLM Provider"""
    
    def is_available(self) -> bool:
        # Check if Ollama server is reachable
        try:
            api_url = self.config.get('api_url', 'http://localhost:11434/api/chat')
            base_url = api_url.rsplit('/api/', 1)[0]
            response = requests.get(f"{base_url}/api/tags", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            api_url = self.config.get('api_url', 'http://localhost:11434/api/chat')
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": self.config.get('model', 'mistral:latest'),
                "messages": messages,
                "stream": self.config.get('stream', False),
                "options": {
                    "temperature": self.config.get('temperature', 0.7),
                    "num_predict": self.config.get('max_tokens', 2048)
                }
            }
            
            response = requests.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result['message']['content'].strip()
            
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise


class VLLMProvider(LLMProvider):
    """vLLM OpenAI-compatible Provider"""
    
    def is_available(self) -> bool:
        # Check if vLLM server is reachable
        try:
            api_url = self.config.get('api_url', '')
            if not api_url:
                return False
            # Try to reach the server
            response = requests.get(api_url.rsplit('/v1/', 1)[0] + '/health', timeout=2)
            return response.status_code == 200
        except:
            # If health endpoint doesn't exist, try a simple request
            try:
                api_url = self.config.get('api_url', '')
                response = requests.post(
                    api_url,
                    json={
                        "model": self.config.get('model', '/models'),
                        "messages": [{"role": "user", "content": "test"}],
                        "max_tokens": 1
                    },
                    timeout=2
                )
                return response.status_code in [200, 400, 422]  # Server is responding
            except:
                return False
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            api_url = self.config.get('api_url')
            
            if not api_url:
                raise ValueError("vLLM API URL not configured")
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            payload = {
                "model": self.config.get('model', '/models'),
                "messages": messages,
                "max_tokens": self.config.get('max_tokens', 2048),
                "temperature": self.config.get('temperature', 0.7),
                "top_p": self.config.get('top_p', 1.0)
            }
            
            response = requests.post(api_url, json=payload, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
            
        except Exception as e:
            logger.error(f"vLLM generation failed: {e}")
            raise


class AnthropicProvider(LLMProvider):
    """Anthropic Claude Provider"""
    
    def is_available(self) -> bool:
        return bool(self.config.get('api_key'))
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        try:
            import anthropic
            
            if not self.is_available():
                raise ValueError("Anthropic API key not configured")
            
            client = anthropic.Anthropic(api_key=self.config['api_key'])
            
            # Anthropic uses system parameter separately
            kwargs = {
                "model": self.config.get('model', 'claude-3-5-sonnet-20241022'),
                "max_tokens": self.config.get('max_tokens', 2048),
                "temperature": self.config.get('temperature', 0.7),
                "messages": [{"role": "user", "content": prompt}]
            }
            
            if system_prompt:
                kwargs["system"] = system_prompt
            
            response = client.messages.create(**kwargs)
            
            return response.content[0].text.strip()
            
        except Exception as e:
            logger.error(f"Anthropic generation failed: {e}")
            raise


class LLMProviderManager:
    """Manages multiple LLM providers and handles switching"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.providers = {
            'openai': OpenAIProvider(config.get('openai', {})),
            'ollama': OllamaProvider(config.get('ollama', {})),
            'vllm': VLLMProvider(config.get('vllm', {})),
            'anthropic': AnthropicProvider(config.get('anthropic', {}))
        }
        
        # Get active provider from config
        llm_config = config.get('llm', {})
        self.active_provider_name = llm_config.get('provider', 'openai')
        self.fallback_to_rules = llm_config.get('fallback_to_rules', True)
        
        logger.info(f"LLM Provider Manager initialized with active provider: {self.active_provider_name}")
    
    def get_active_provider(self) -> LLMProvider:
        """Get the currently active provider"""
        provider = self.providers.get(self.active_provider_name)
        if not provider:
            raise ValueError(f"Unknown provider: {self.active_provider_name}")
        return provider
    
    def set_active_provider(self, provider_name: str) -> bool:
        """Switch to a different provider"""
        if provider_name not in self.providers:
            logger.error(f"Invalid provider name: {provider_name}")
            return False
        
        provider = self.providers[provider_name]
        if not provider.is_available():
            logger.error(f"Provider {provider_name} is not available")
            return False
        
        self.active_provider_name = provider_name
        logger.info(f"Switched to provider: {provider_name}")
        return True
    
    def get_available_providers(self) -> List[Dict[str, Any]]:
        """Get list of all providers with their availability status"""
        result = []
        for name, provider in self.providers.items():
            available = provider.is_available()
            result.append({
                "name": name,
                "available": available,
                "active": name == self.active_provider_name,
                "config": {
                    "model": self.config.get(name, {}).get('model', 'N/A'),
                    "api_url": self.config.get(name, {}).get('api_url', 'N/A') if name in ['ollama', 'vllm'] else 'N/A'
                }
            })
        return result
    
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text using the active provider"""
        provider = self.get_active_provider()
        
        if not provider.is_available():
            raise RuntimeError(f"Active provider {self.active_provider_name} is not available")
        
        return provider.generate(prompt, system_prompt)
    
    def should_fallback_to_rules(self) -> bool:
        """Check if should fallback to rule-based parsing on error"""
        return self.fallback_to_rules
