#!/usr/bin/env python3
"""
Development runner for chess puzzle game.
Automatically sets up the development environment and runs the app.
"""

import os
import sys
import subprocess

def run_development_server():
    """Run the Flask app in development mode."""
    print("Starting chess puzzle app in development mode...")
    
    # Set development environment variables
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = 'True'
    
    # Ensure local leaderboard exists
    if not os.path.exists('leaderboard_local.json'):
        print("Setting up local development environment...")
        subprocess.run([sys.executable, 'setup_dev.py'], check=True)
    
    print("✓ Using local leaderboard: leaderboard_local.json")
    print("✓ Development mode enabled")
    print("✓ Server will be available at: http://localhost:5000")
    print("\nStarting server... (Press Ctrl+C to stop)")
    
    # Run the Flask app
    from app import app
    app.run(debug=True, host='127.0.0.1', port=5000)

if __name__ == '__main__':
    run_development_server() 