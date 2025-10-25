"""
CORS Configuration for Railway Stations API
Handles Cross-Origin Resource Sharing settings for development and production
"""

import os

# Environment detection
ENV = os.getenv('ENVIRONMENT', 'development')

# Development CORS settings - Allow all origins
DEVELOPMENT_CORS = {
    "allow_origins": ["*"],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
    "expose_headers": ["*"],
}

# Production CORS settings - Specific allowed origins
PRODUCTION_CORS = {
    "allow_origins": [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://your-production-domain.com",  # Replace with actual production domain
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    "expose_headers": ["Content-Length", "Content-Type"],
}

# Select configuration based on environment
CORS_CONFIG = DEVELOPMENT_CORS if ENV == 'development' else PRODUCTION_CORS

# Additional CORS settings
MAX_AGE = 3600  # Preflight request cache time in seconds

def get_cors_config():
    """
    Get CORS configuration based on environment
    
    Returns:
        dict: CORS configuration dictionary
    """
    config = CORS_CONFIG.copy()
    config["max_age"] = MAX_AGE
    return config

def is_origin_allowed(origin: str) -> bool:
    """
    Check if an origin is allowed
    
    Args:
        origin (str): Origin URL to check
        
    Returns:
        bool: True if origin is allowed, False otherwise
    """
    if CORS_CONFIG["allow_origins"] == ["*"]:
        return True
    
    return origin in CORS_CONFIG["allow_origins"]

# Print current CORS configuration on import
if __name__ != "__main__":
    print(f"🔐 CORS Configuration loaded for {ENV} environment")
    print(f"   Allowed Origins: {CORS_CONFIG['allow_origins']}")
