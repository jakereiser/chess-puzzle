#!/usr/bin/env python3
"""
Merge Lichess puzzles with existing puzzles and update the app.
"""

import json
import random

def merge_puzzles():
    """Merge Lichess puzzles with existing puzzles."""
    
    # Load existing puzzles
    with open('puzzles.json', 'r') as f:
        existing_data = json.load(f)
    
    existing_puzzles = existing_data['puzzles']
    print(f"Loaded {len(existing_puzzles)} existing puzzles")
    
    # Load Lichess puzzles
    with open('lichess_puzzles.json', 'r') as f:
        lichess_puzzles = json.load(f)
    
    print(f"Loaded {len(lichess_puzzles)} Lichess puzzles")
    
    # Convert Lichess puzzles to our format
    converted_puzzles = []
    
    for i, lichess_puzzle in enumerate(lichess_puzzles):
        # Convert to our format
        converted_puzzle = {
            "id": len(existing_puzzles) + i + 1,  # Continue numbering from existing puzzles
            "fen": lichess_puzzle['fen'],
            "solution": lichess_puzzle['solution_moves'],
            "description": lichess_puzzle['description'],
            "difficulty": get_difficulty_from_rating(lichess_puzzle['rating']),
            "rating": lichess_puzzle['rating'],
            "player_color": lichess_puzzle['player_color'],
            "popularity": lichess_puzzle['popularity'],
            "themes": lichess_puzzle['themes']
        }
        converted_puzzles.append(converted_puzzle)
    
    # Combine all puzzles
    all_puzzles = existing_puzzles + converted_puzzles
    
    # Shuffle for variety
    random.shuffle(all_puzzles)
    
    # Create new puzzles.json
    new_data = {
        "puzzles": all_puzzles
    }
    
    # Save to new file
    with open('puzzles_combined.json', 'w') as f:
        json.dump(new_data, f, indent=2)
    
    print(f"Created combined database with {len(all_puzzles)} puzzles")
    print("Saved to puzzles_combined.json")
    
    # Print statistics
    ratings = [p['rating'] for p in all_puzzles if 'rating' in p]
    if ratings:
        print(f"Rating range: {min(ratings)} - {max(ratings)}")
        print(f"Average rating: {sum(ratings) / len(ratings):.1f}")
    
    return all_puzzles

def get_difficulty_from_rating(rating):
    """Convert rating to difficulty level."""
    if rating < 1000:
        return "easy"
    elif rating < 1500:
        return "medium"
    elif rating < 2000:
        return "hard"
    else:
        return "expert"

def update_app_to_use_combined_puzzles():
    """Update app.py to use the combined puzzles file."""
    
    # Read current app.py
    with open('app.py', 'r') as f:
        app_content = f.read()
    
    # Replace puzzles.json with puzzles_combined.json
    updated_content = app_content.replace(
        'puzzles.json',
        'puzzles_combined.json'
    )
    
    # Write updated app.py
    with open('app.py', 'w') as f:
        f.write(updated_content)
    
    print("Updated app.py to use combined puzzles")

if __name__ == "__main__":
    print("Merging puzzles...")
    merge_puzzles()
    print("\nUpdating app...")
    update_app_to_use_combined_puzzles()
    print("Done! The app now uses the combined puzzle database.") 