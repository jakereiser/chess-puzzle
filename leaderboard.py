#!/usr/bin/env python3
"""
Leaderboard system for chess puzzle game.
Handles high scores for Easy and Hard modes separately.
"""

import json
import os
import tempfile
import shutil
import platform
from datetime import datetime
from typing import List, Dict, Optional

# Cross-platform file locking
try:
    if platform.system() == 'Windows':
        import msvcrt
        def lock_file(f):
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        def unlock_file(f):
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
    else:
        import fcntl
        def lock_file(f):
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        def unlock_file(f):
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)
except ImportError:
    # Fallback if locking is not available
    def lock_file(f):
        pass
    def unlock_file(f):
        pass

class Leaderboard:
    def __init__(self, filename: str = 'leaderboard.json'):
        self.filename = filename
        self.leaderboard = self._load_leaderboard()
    
    def _load_leaderboard(self) -> Dict:
        """Load leaderboard from file or create default structure."""
        if os.path.exists(self.filename):
            try:
                # Use file locking to prevent concurrent reads during writes
                with open(self.filename, 'r') as f:
                    # Try to acquire a shared lock (read-only)
                    try:
                        lock_file(f)
                        data = json.load(f)
                        unlock_file(f)
                        return data
                    except (OSError, IOError):
                        # If we can't get a lock, try reading anyway
                        f.seek(0)
                        return json.load(f)
            except (json.JSONDecodeError, FileNotFoundError, OSError) as e:
                print(f"Warning: Could not load leaderboard file: {e}")
                # Try to load from backup
                backup_filename = f"{self.filename}.backup"
                if os.path.exists(backup_filename):
                    try:
                        with open(backup_filename, 'r') as f:
                            data = json.load(f)
                            print("Loaded leaderboard from backup file")
                            return data
                    except Exception as backup_error:
                        print(f"Could not load from backup either: {backup_error}")
                pass
        
        # Default structure
        return {
            'easy': [],
            'hard': [],
            'hikaru': []
        }
    
    def _save_leaderboard(self):
        """Save leaderboard to file using atomic write operation."""
        try:
            # Create backup of existing file if it exists
            if os.path.exists(self.filename):
                backup_filename = f"{self.filename}.backup"
                try:
                    shutil.copy2(self.filename, backup_filename)
                except Exception as e:
                    print(f"Warning: Could not create backup: {e}")
            
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, dir=os.path.dirname(self.filename))
            
            try:
                # Write data to temporary file
                json.dump(self.leaderboard, temp_file, indent=2)
                temp_file.flush()
                os.fsync(temp_file.fileno())  # Ensure data is written to disk
                temp_file.close()
                
                # Atomic move operation (rename is atomic on most filesystems)
                shutil.move(temp_file.name, self.filename)
                
                # Clean up old backup if save was successful
                backup_filename = f"{self.filename}.backup"
                if os.path.exists(backup_filename):
                    try:
                        os.unlink(backup_filename)
                    except OSError:
                        pass  # Ignore backup cleanup errors
                
            except Exception as e:
                # Clean up temp file if something went wrong
                try:
                    os.unlink(temp_file.name)
                except OSError:
                    pass
                
                # Try to restore from backup if available
                backup_filename = f"{self.filename}.backup"
                if os.path.exists(backup_filename):
                    try:
                        shutil.copy2(backup_filename, self.filename)
                        print("Restored leaderboard from backup")
                    except Exception as restore_error:
                        print(f"Failed to restore from backup: {restore_error}")
                
                raise e
                
        except Exception as e:
            print(f"Error saving leaderboard: {e}")
            # Fallback to direct write if atomic operation fails
            try:
                with open(self.filename, 'w') as f:
                    json.dump(self.leaderboard, f, indent=2)
            except Exception as fallback_error:
                print(f"Critical error: Could not save leaderboard: {fallback_error}")
                # Last resort: try to save to a different filename
                try:
                    emergency_filename = f"{self.filename}.emergency"
                    with open(emergency_filename, 'w') as f:
                        json.dump(self.leaderboard, f, indent=2)
                    print(f"Saved emergency backup to {emergency_filename}")
                except Exception as emergency_error:
                    print(f"Emergency save also failed: {emergency_error}")
    
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
        
        # Reload leaderboard to get latest data from file
        self.leaderboard = self._load_leaderboard()
        
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