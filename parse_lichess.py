#!/usr/bin/env python3
"""
Parse Lichess puzzle CSV file into efficient data structures.
"""

import csv
import json
import chess
import random
from typing import List, Dict, Any
from dataclasses import dataclass
import time

@dataclass
class LichessPuzzle:
    """Data class for a Lichess puzzle."""
    puzzle_id: str
    fen: str
    uci_moves: str
    rating: int
    rating_deviation: int
    popularity: int
    nb_plays: int
    themes: str
    game_url: str
    opening_tags: str
    
    # Derived fields
    position_fen: str = ""
    solution_moves: List[str] = None
    player_color: str = ""
    moves_required: int = 0
    description: str = ""

def parse_lichess_csv(filename: str, max_puzzles: int = 1000, min_popularity: int = 0) -> List[LichessPuzzle]:
    """Parse the Lichess CSV file into puzzle objects."""
    puzzles = []
    
    print(f"Parsing {filename}...")
    start_time = time.time()
    
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for i, row in enumerate(reader):
            if i % 1000 == 0:
                print(f"Processed {i} rows...")
            
            try:
                # Parse basic fields
                puzzle = LichessPuzzle(
                    puzzle_id=row['PuzzleId'],
                    fen=row['FEN'],
                    uci_moves=row['Moves'],
                    rating=int(row['Rating']),
                    rating_deviation=int(row['RatingDeviation']),
                    popularity=int(row['Popularity']),
                    nb_plays=int(row['NbPlays']),
                    themes=row['Themes'],
                    game_url=row['GameUrl'],
                    opening_tags=row['OpeningTags']
                )
                
                # Filter by popularity
                if puzzle.popularity < min_popularity:
                    continue
                
                # Process the puzzle to get derived fields
                process_puzzle(puzzle)
                
                puzzles.append(puzzle)
                
                if len(puzzles) >= max_puzzles:
                    break
                    
            except Exception as e:
                print(f"Error processing row {i}: {e}")
                continue
    
    end_time = time.time()
    print(f"Parsed {len(puzzles)} puzzles in {end_time - start_time:.2f} seconds")
    
    return puzzles

def process_puzzle(puzzle: LichessPuzzle):
    """Process a puzzle to calculate derived fields."""
    try:
        # Get the position after the first move (opponent's move)
        board = chess.Board(puzzle.fen)
        uci_move_list = puzzle.uci_moves.strip().split()
        
        if uci_move_list:
            # Apply the first move (opponent's move)
            first_move = chess.Move.from_uci(uci_move_list[0])
            board.push(first_move)
            puzzle.position_fen = board.fen()
            
            # Get solution moves (skip the first move)
            puzzle.solution_moves = uci_move_list[1:] if len(uci_move_list) > 1 else []
            puzzle.moves_required = len(puzzle.solution_moves)
            
            # Determine player color
            puzzle.player_color = 'white' if board.turn else 'black'
            
            # Create description
            puzzle.description = create_description(puzzle)
            
    except Exception as e:
        print(f"Error processing puzzle {puzzle.puzzle_id}: {e}")

def create_description(puzzle: LichessPuzzle) -> str:
    """Create a human-readable description for the puzzle."""
    themes = puzzle.themes.lower()
    
    if 'mate' in themes:
        return f"Checkmate in {puzzle.moves_required} moves (Rating: {puzzle.rating})"
    elif 'advantage' in themes:
        return f"Gain advantage (Rating: {puzzle.rating})"
    elif 'tactics' in themes:
        return f"Tactical combination (Rating: {puzzle.rating})"
    else:
        return f"Find the best move (Rating: {puzzle.rating})"

def convert_to_game_format(puzzles: List[LichessPuzzle]) -> List[Dict[str, Any]]:
    """Convert puzzles to our game's JSON format."""
    game_puzzles = []
    
    for puzzle in puzzles:
        game_puzzle = {
            'id': puzzle.puzzle_id,
            'fen': puzzle.position_fen,
            'description': puzzle.description,
            'solution_moves': puzzle.solution_moves,
            'player_color': puzzle.player_color,
            'moves_required': puzzle.moves_required,
            'rating': puzzle.rating,
            'popularity': puzzle.popularity,
            'themes': puzzle.themes
        }
        game_puzzles.append(game_puzzle)
    
    return game_puzzles

def save_puzzles(puzzles: List[Dict[str, Any]], filename: str):
    """Save puzzles to JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(puzzles, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(puzzles)} puzzles to {filename}")

def main():
    """Main function to parse and process Lichess puzzles."""
    # Parse puzzles with filtering
    puzzles = parse_lichess_csv(
        filename='lichess_db_puzzle.csv',
        max_puzzles=10000, # Limit to 10000 puzzles
        min_popularity=50  # Only puzzles with popularity >= 50
    )
    
    if not puzzles:
        print("No puzzles found!")
        return
    
    # Convert to game format
    game_puzzles = convert_to_game_format(puzzles)
    
    # Shuffle for variety
    random.shuffle(game_puzzles)
    
    # Save to JSON
    save_puzzles(game_puzzles, 'lichess_puzzles.json')
    
    # Print statistics
    ratings = [p['rating'] for p in game_puzzles]
    popularities = [p['popularity'] for p in game_puzzles]
    
    print(f"\nStatistics:")
    print(f"Rating range: {min(ratings)} - {max(ratings)}")
    print(f"Popularity range: {min(popularities)} - {max(popularities)}")
    print(f"Average rating: {sum(ratings) / len(ratings):.1f}")
    print(f"Average popularity: {sum(popularities) / len(popularities):.1f}")

if __name__ == "__main__":
    main() 