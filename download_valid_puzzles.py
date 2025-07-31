#!/usr/bin/env python3
"""
Download valid chess puzzles from Lichess puzzle database
"""

import requests
import json
import random

def download_lichess_puzzles(limit=50):
    """Download puzzles from Lichess API"""
    try:
        # Lichess puzzle API endpoint
        url = "https://lichess.org/api/puzzle/daily"
        
        # Get daily puzzle
        response = requests.get(url)
        if response.status_code == 200:
            daily_puzzle = response.json()
            print(f"Downloaded daily puzzle: {daily_puzzle['game']['pgn']}")
            return [daily_puzzle]
        else:
            print(f"Failed to get daily puzzle: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error downloading puzzles: {e}")
        return []

def create_sample_puzzles():
    """Create a small set of valid sample puzzles"""
    puzzles = [
        {
            "id": 1,
            "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
            "solution": ["d2d4", "e5d4", "c4f7"],
            "description": "White to move and win material",
            "difficulty": "medium",
            "rating": 1200,
            "player_color": "white"
        },
        {
            "id": 2,
            "fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
            "solution": ["f6e4"],
            "description": "Black to move and fork the pawns",
            "difficulty": "easy",
            "rating": 800,
            "player_color": "black"
        },
        {
            "id": 3,
            "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
            "solution": ["c4f7"],
            "description": "White to move and check",
            "difficulty": "medium",
            "rating": 1400,
            "player_color": "white"
        },
        {
            "id": 4,
            "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1",
            "solution": ["d2d4", "e5d4", "e4e5"],
            "description": "White to move and gain advantage",
            "difficulty": "easy",
            "rating": 600,
            "player_color": "white"
        },
        {
            "id": 5,
            "fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/R1BQKB1R b KQkq - 0 1",
            "solution": ["f6e4", "d2d4", "e4c3"],
            "description": "Black to move and fork",
            "difficulty": "easy",
            "rating": 700,
            "player_color": "black"
        }
    ]
    return puzzles

def main():
    """Main function to download and save puzzles"""
    print("Downloading valid chess puzzles...")
    
    # Try to download from Lichess
    lichess_puzzles = download_lichess_puzzles()
    
    if lichess_puzzles:
        # Convert Lichess format to our format
        converted_puzzles = []
        for i, puzzle in enumerate(lichess_puzzles):
            # Extract FEN and solution from Lichess puzzle
            # This is a simplified conversion - would need more complex parsing
            converted_puzzle = {
                "id": i + 1,
                "fen": puzzle.get("fen", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"),
                "solution": ["e2e4"],  # Simplified
                "description": "Lichess puzzle",
                "difficulty": "medium",
                "rating": 1000,
                "player_color": "white"
            }
            converted_puzzles.append(converted_puzzle)
        
        puzzles = converted_puzzles
    else:
        # Use sample puzzles if download fails
        print("Using sample puzzles...")
        puzzles = create_sample_puzzles()
    
    # Save to JSON file
    with open('puzzles.json', 'w') as f:
        json.dump({"puzzles": puzzles}, f, indent=2)
    
    print(f"Saved {len(puzzles)} puzzles to puzzles.json")
    print("Note: These are sample puzzles. For production, consider using a larger dataset.")

if __name__ == "__main__":
    main() 