#!/usr/bin/env python3
"""
Security middleware for chess puzzle application.
"""

from flask import request, make_response
from functools import wraps
import re

def add_security_headers(response):
    """Add security headers to response."""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
    return response

def validate_json_content_type(f):
    """Decorator to validate JSON content type."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'POST':
            content_type = request.headers.get('Content-Type', '')
            if not content_type.startswith('application/json'):
                return make_response({'error': 'Content-Type must be application/json'}, 400)
        return f(*args, **kwargs)
    return decorated_function

def sanitize_input(data):
    """Sanitize input data."""
    if isinstance(data, dict):
        return {k: sanitize_input(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    elif isinstance(data, str):
        # Remove potentially dangerous characters
        return re.sub(r'[<>"\']', '', data)
    return data

def validate_request_size(max_size=1024*1024):  # 1MB default
    """Decorator to validate request size."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            content_length = request.headers.get('Content-Length')
            if content_length and int(content_length) > max_size:
                return make_response({'error': 'Request too large'}, 413)
            return f(*args, **kwargs)
        return decorated_function
    return decorator 