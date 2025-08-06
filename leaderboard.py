#!/usr/bin/env python3
"""
Leaderboard system for chess puzzle game.
Handles high scores for Easy and Hard modes separately.
Supports both local file storage and GitHub API storage.
"""

import json
import os
import tempfile
import shutil
import platform
import base64
import requests
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
        self.github_token = os.environ.get('GITHUB_TOKEN')
        self.github_repo = os.environ.get('GITHUB_REPO', 'jakereiser/chess-puzzle')
        self.use_github = bool(self.github_token and self.github_repo)
        
        # Debug logging
        if self.use_github:
            print(f"GitHub integration enabled for repo: {self.github_repo}")
        else:
            print(f"GitHub integration disabled. Token: {'Yes' if self.github_token else 'No'}, Repo: {self.github_repo}")
        
        self.leaderboard = self._load_leaderboard()
    
    def _load_leaderboard(self) -> Dict:
        """Load leaderboard from file or GitHub, or create default structure."""
        # Try to load from GitHub first if configured
        if self.use_github:
            try:
                github_data = self._load_from_github()
                if github_data:
                    print("Loaded leaderboard from GitHub")
                    return github_data
            except Exception as e:
                print(f"Failed to load from GitHub: {e}")
        
        # Fallback to local file
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
    
    def _load_from_github(self) -> Optional[Dict]:
        """Load leaderboard data from GitHub repository."""
        try:
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # Get the current content of the file
            url = f'https://api.github.com/repos/{self.github_repo}/contents/{self.filename}'
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                content = response.json()
                # Decode the content
                file_content = base64.b64decode(content['content']).decode('utf-8')
                return json.loads(file_content)
            elif response.status_code == 404:
                # File doesn't exist on GitHub, return None to use default
                return None
            else:
                print(f"GitHub API error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"Error loading from GitHub: {e}")
            return None
    
    def _save_to_github(self) -> bool:
        """Save leaderboard data to GitHub repository."""
        try:
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            # Get the current file to get the SHA
            url = f'https://api.github.com/repos/{self.github_repo}/contents/{self.filename}'
            print(f"Checking existing file at: {url}")
            response = requests.get(url, headers=headers)
            
            sha = None
            if response.status_code == 200:
                sha = response.json()['sha']
                print(f"Found existing file with SHA: {sha[:8]}...")
            elif response.status_code == 404:
                print("File doesn't exist on GitHub, will create new file")
            else:
                print(f"Unexpected response when checking file: {response.status_code} - {response.text}")
            
            # Prepare the content
            content = json.dumps(self.leaderboard, indent=2)
            encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            
            # Create the commit
            data = {
                'message': f'Update leaderboard - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
                'content': encoded_content,
                'branch': 'master'
            }
            
            if sha:
                data['sha'] = sha
            
            print(f"Attempting to save to GitHub with data size: {len(content)} characters")
            response = requests.put(url, headers=headers, json=data)
            
            if response.status_code in [200, 201]:
                print("Successfully saved leaderboard to GitHub")
                return True
            else:
                print(f"Failed to save to GitHub: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"Error saving to GitHub: {e}")
            return False
    
    def _save_leaderboard(self):
        """Save leaderboard to file and/or GitHub using atomic write operation."""
        # Try to save to GitHub first if configured
        if self.use_github:
            print("Attempting to save to GitHub...")
            if self._save_to_github():
                print("Successfully saved to GitHub, also saving locally as backup")
                # Also save locally as backup
                self._save_to_local_file()
                return
            else:
                print("GitHub save failed, falling back to local file")
        
        # Fallback to local file only
        print("Saving to local file only")
        self._save_to_local_file()
    
    def _save_to_local_file(self):
        """Save leaderboard to local file using atomic write operation."""
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
                # Last resort: try to save to a different location
                try:
                    emergency_filename = f"{self.filename}.emergency"
                    with open(emergency_filename, 'w') as f:
                        json.dump(self.leaderboard, f, indent=2)
                    print(f"Emergency save to {emergency_filename}")
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
        
        # Reload leaderboard to get latest data from file/GitHub
        self.leaderboard = self._load_leaderboard()
        
        # Add to appropriate leaderboard
        self.leaderboard[mode].append(score_entry)
        
        # Sort by score (highest first), then by timestamp (earliest first for ties)
        # This ensures that when scores are tied, the first person to achieve that score gets the higher rank
        self.leaderboard[mode].sort(key=lambda x: (x['score'], -x['timestamp']), reverse=True)
        
        # Keep only top 5 scores
        self.leaderboard[mode] = self.leaderboard[mode][:5]
        
        # Save to file and/or GitHub
        self._save_leaderboard()
        
        # Check if this is a new high score
        position = self._get_score_position(mode, score, score_entry['timestamp'])
        is_new_high_score = position == 1
        
        return {
            'position': position,
            'is_new_high_score': is_new_high_score,
            'top_scores': self.get_top_scores(mode)
        }
    
    def _get_score_position(self, mode: str, score: int, timestamp: float = None) -> int:
        """
        Get the position of a score in the leaderboard.
        For tied scores, earlier timestamps get higher positions.
        """
        if timestamp is None:
            # If no timestamp provided, find the position of the first occurrence of this score
            for i, entry in enumerate(self.leaderboard[mode]):
                if entry['score'] == score:
                    return i + 1
            return len(self.leaderboard[mode]) + 1
        
        # Find the position based on the specific timestamp
        for i, entry in enumerate(self.leaderboard[mode]):
            if entry['score'] == score and entry['timestamp'] == timestamp:
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