#!/usr/bin/env python3
"""
Leaderboard system for chess puzzle game.
Handles high scores for Easy and Hard modes separately.
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional

class Leaderboard:
    def __init__(self, filename: str = 'leaderboard.json'):
        self.filename = filename
        self.leaderboard = self._load_leaderboard()
    
    def _load_leaderboard(self) -> Dict:
        """Load leaderboard from file or create default structure."""
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError):
                pass
        
        # Default structure
        return {
            'easy': [],
            'hard': [],
            'hikaru': []
        }
    
    def _save_leaderboard(self):
        """Save leaderboard to file."""
        with open(self.filename, 'w') as f:
            json.dump(self.leaderboard, f, indent=2)
    
    def add_score(self, mode: str, score: int, player_name: Optional[str] = None) -> Dict:
        """
        Add a score to the leaderboard.
        
        Args:
            mode: 'easy' or 'hard'
            score: consecutive wins score
            player_name: player's name (optional)
        
        Returns:
            Dict with info about the score placement
        """
        if mode not in ['easy', 'hard', 'hikaru']:
            raise ValueError("Mode must be 'easy', 'hard', or 'hikaru'")
        
        # Generate anonymous name if none provided
        if not player_name:
            player_name = f"Anonymous_{datetime.now().strftime('%m%d%H%M')}"
        
        # Create score entry
        score_entry = {
            'name': player_name,
            'score': score,
            'date': datetime.now().isoformat(),
            'timestamp': datetime.now().timestamp()
        }
        
        # Add to appropriate leaderboard
        self.leaderboard[mode].append(score_entry)
        
        # Sort by score (highest first)
        self.leaderboard[mode].sort(key=lambda x: x['score'], reverse=True)
        
        # Keep only top 5 scores
        self.leaderboard[mode] = self.leaderboard[mode][:5]
        
        # Save to file
        self._save_leaderboard()
        
        # Check if this is a new high score
        position = self._get_score_position(mode, score)
        is_new_high_score = position == 1
        
        return {
            'position': position,
            'is_new_high_score': is_new_high_score,
            'top_scores': self.get_top_scores(mode)
        }
    
    def _get_score_position(self, mode: str, score: int) -> int:
        """Get the position of a score in the leaderboard."""
        for i, entry in enumerate(self.leaderboard[mode]):
            if entry['score'] == score:
                return i + 1
        return len(self.leaderboard[mode]) + 1
    
    def get_top_scores(self, mode: str) -> List[Dict]:
        """Get top 5 scores for a mode."""
        return self.leaderboard.get(mode, [])
    
    def check_if_high_score(self, mode: str, score: int) -> bool:
        """Check if a score would make it to the top 5."""
        if mode not in ['easy', 'hard', 'hikaru']:
            return False
        
        current_scores = self.leaderboard[mode]
        
        # If less than 5 scores, it's automatically a high score
        if len(current_scores) < 5:
            return True
        
        # Check if score is higher than the lowest score
        lowest_score = min(entry['score'] for entry in current_scores)
        return score > lowest_score
    
    def get_leaderboard_data(self) -> Dict:
        """Get complete leaderboard data for all modes."""
        return {
            'easy': self.get_top_scores('easy'),
            'hard': self.get_top_scores('hard'),
            'hikaru': self.get_top_scores('hikaru')
        } 