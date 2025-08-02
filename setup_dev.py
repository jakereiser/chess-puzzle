#!/usr/bin/env python3
"""
Development setup script for chess puzzle game.
This script helps set up the local development environment.
"""

import os
import json

def setup_development_environment():
    """Set up the local development environment."""
    print("Setting up local development environment...")
    
    # Set Flask environment variables for local development
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = 'True'
    
    # Create a local leaderboard file if it doesn't exist
    local_leaderboard_file = 'leaderboard_local.json'
    if not os.path.exists(local_leaderboard_file):
        # Create a sample local leaderboard with some test data
        local_leaderboard = {
            'easy': [
                {
                    'name': 'Local Dev',
                    'score': 5,
                    'date': '2025-01-01T00:00:00.000000',
                    'timestamp': 1735689600.0
                }
            ],
            'hard': [],
            'hikaru': []
        }
        
        with open(local_leaderboard_file, 'w') as f:
            json.dump(local_leaderboard, f, indent=2)
        
        print(f"✓ Created local leaderboard file: {local_leaderboard_file}")
        print("  This file contains test data and will not be committed to Git.")
    else:
        print(f"✓ Local leaderboard file already exists: {local_leaderboard_file}")
    
    print("\nDevelopment environment setup complete!")
    print("\nTo run the app in development mode:")
    print("  python app.py")
    print("\nOr set these environment variables:")
    print("  FLASK_ENV=development")
    print("  FLASK_DEBUG=True")
    print("\nThe app will now use 'leaderboard_local.json' for local development")
    print("and 'leaderboard.json' for production.")

if __name__ == '__main__':
    setup_development_environment() 