#!/usr/bin/env python3
"""
Security configuration for chess puzzle application.
"""

import os
from typing import List

class Config:
    """Base configuration class."""
    
    # Security settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Server settings
    HOST = os.environ.get('HOST', '127.0.0.1')
    PORT = int(os.environ.get('PORT', 5000))
    
    # CORS settings
    ALLOWED_ORIGINS = [
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ]
    
    # Rate limiting
    RATE_LIMIT_DEFAULT = "200 per day"
    RATE_LIMIT_PUZZLE = "30 per minute"
    RATE_LIMIT_MOVE = "100 per minute"
    RATE_LIMIT_SCORE = "10 per minute"
    
    # Input validation
    MAX_PLAYER_NAME_LENGTH = 20
    MAX_SCORE_VALUE = 10000
    
    # File paths
    PUZZLE_DATABASE = os.environ.get('PUZZLE_DATABASE', 'puzzles_combined.json')
    LEADERBOARD_FILE = os.environ.get('LEADERBOARD_FILE', 'leaderboard.json')
    
    @staticmethod
    def init_app(app):
        """Initialize app with configuration."""
        pass

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    ALLOWED_ORIGINS = ['http://localhost:5000', 'http://127.0.0.1:5000']

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    
    @staticmethod
    def init_app(app):
        """Initialize production app."""
        # Force HTTPS in production
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 