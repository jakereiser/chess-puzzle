#!/usr/bin/env python3
"""
Chess Puzzle Web Application
Flask-based web server for the chess puzzle game.
"""

from flask import Flask, render_template, request, jsonify, session, make_response
from flask_cors import CORS
import sys
import os
import re
import secrets
import random
from datetime import datetime

# Optional imports for rate limiting
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    RATE_LIMITING_AVAILABLE = True
except ImportError:
    print("Warning: flask-limiter not installed. Rate limiting disabled.")
    RATE_LIMITING_AVAILABLE = False

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.board import ChessBoard
    from src.puzzle import ChessPuzzle
except ImportError:
    # Fallback for direct imports
    from src.board import ChessBoard
    from src.puzzle import ChessPuzzle

# Import leaderboard
from leaderboard import Leaderboard

app = Flask(__name__)

# Use environment variable for secret key, fallback to random generation
app.secret_key = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

# Configure CORS more securely
CORS(app, origins=['https://yourdomain.com', 'http://localhost:5000'], 
     supports_credentials=True)

# Initialize rate limiter (optional)
if RATE_LIMITING_AVAILABLE:
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"]
    )
else:
    # Create a dummy limiter that does nothing
    class DummyLimiter:
        def limit(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator
    limiter = DummyLimiter()

# Global game state (in production, use a proper database)
game_state = {
    'current_puzzle': None,
    'consecutive_wins': 0,
    'total_puzzles_solved': 0
}

# Cache busting version - change this to force cache refresh
APP_VERSION = '1.37.0'  # Force version for fixed celebration display timing

# Initialize leaderboard with environment-specific filename
# Use different leaderboard files for local development vs production
if os.environ.get('FLASK_ENV') == 'development' or os.environ.get('FLASK_DEBUG') == 'True':
    # Local development - use a separate leaderboard file
    leaderboard_filename = 'leaderboard_local.json'
    print(f"Using local leaderboard: {leaderboard_filename}")
else:
    # Production - use the main leaderboard file
    leaderboard_filename = 'leaderboard.json'
    print(f"Using production leaderboard: {leaderboard_filename}")

leaderboard = Leaderboard(leaderboard_filename)

# Input validation functions
def validate_uci_move(move):
    """Validate UCI move format."""
    if not move or not isinstance(move, str):
        return False
    # UCI format: e2e4, e7e8q, etc.
    pattern = r'^[a-h][1-8][a-h][1-8][qrbn]?$'
    return bool(re.match(pattern, move))

def validate_difficulty(difficulty):
    """Validate difficulty parameter."""
    return difficulty in ['easy', 'hard', 'hikaru']

def sanitize_player_name(name):
    """Sanitize player name input."""
    if not name:
        return None
    # Remove any non-alphanumeric characters except spaces and hyphens
    sanitized = re.sub(r'[^a-zA-Z0-9\s\-]', '', str(name))
    return sanitized.strip()[:20]  # Limit to 20 characters

def generate_puzzle_description(original_description, player_color, puzzle_data):
    """Generate a better puzzle description based on player color and puzzle data."""
    # Convert player color to proper case
    color_name = player_color.capitalize()
    
    # Check if the original description has specific tactical themes
    original_lower = original_description.lower()
    
    # Define common tactical themes and their descriptions
    tactical_themes = {
        'fork': f"{color_name} to move and fork",
        'pin': f"{color_name} to move and pin",
        'skewer': f"{color_name} to move and skewer",
        'discovered attack': f"{color_name} to move with discovered attack",
        'double attack': f"{color_name} to move with double attack",
        'back rank': f"{color_name} to move and checkmate on back rank",
        'checkmate': f"{color_name} to move and checkmate",
        'mate': f"{color_name} to move and checkmate",
        'win material': f"{color_name} to move and win material",
        'capture': f"{color_name} to move and capture",
        'check': f"{color_name} to move and check",
        'promote': f"{color_name} to move and promote",
        'defend': f"{color_name} to move and defend",
        'block': f"{color_name} to move and block",
        'escape': f"{color_name} to move and escape",
        'sacrifice': f"{color_name} to move and sacrifice",
        'zugzwang': f"{color_name} to move and create zugzwang",
        'gain advantage': f"{color_name} to gain advantage",
        'advantage': f"{color_name} to gain advantage",
        'tactical advantage': f"{color_name} to gain tactical advantage",
        'positional advantage': f"{color_name} to gain positional advantage"
    }
    
    # Check for specific themes in the original description
    for theme, description in tactical_themes.items():
        if theme in original_lower:
            return description
    
    # Check for themes in puzzle data if available
    if 'themes' in puzzle_data and puzzle_data['themes']:
        themes = puzzle_data['themes']
        if isinstance(themes, list):
            themes = ' '.join(themes).lower()
        else:
            themes = str(themes).lower()
        
        # Check themes for specific tactical patterns
        for theme, description in tactical_themes.items():
            if theme in themes:
                return description
    
    # If no specific theme found, use a generic description
    return f"{color_name} to move"

@app.route('/')
def index():
    """Main game page."""
    print(f"DEBUG: APP_VERSION = {APP_VERSION}")  # Debug print
    response = make_response(render_template('index.html', version=APP_VERSION))
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/test')
def test():
    """Test page."""
    return render_template('test.html')



@app.route('/api/new-puzzle', methods=['POST'])
@limiter.limit("30 per minute")
def new_puzzle():
    """Generate a new puzzle for the player."""
    try:
        # Get difficulty mode from request
        data = request.get_json() or {}
        difficulty = data.get('difficulty', 'easy')  # Default to easy mode
        
        # Validate difficulty parameter
        if not validate_difficulty(difficulty):
            return jsonify({'success': False, 'error': 'Invalid difficulty parameter'}), 400
        
        # Load puzzles from JSON file
        import json
        
        try:
            with open('puzzles_combined.json', 'r') as f:
                puzzle_data = json.load(f)
            
            # Filter puzzles by difficulty
            if difficulty == 'easy':
                # Easy mode: puzzles rated 400-1500
                filtered_puzzles = [p for p in puzzle_data['puzzles'] 
                                 if 'rating' in p and 400 <= p['rating'] <= 1500]
            elif difficulty == 'hard':
                # Hard mode: puzzles rated 1500-2000
                filtered_puzzles = [p for p in puzzle_data['puzzles'] 
                                 if 'rating' in p and 1500 <= p['rating'] <= 2000]
            elif difficulty == 'hikaru':
                # Hikaru mode: puzzles rated 1800-3050
                filtered_puzzles = [p for p in puzzle_data['puzzles'] 
                                 if 'rating' in p and 1800 <= p['rating'] <= 3050]
            else:
                # Default to all puzzles if difficulty not specified
                filtered_puzzles = puzzle_data['puzzles']
            
            # If no puzzles found for the difficulty, fall back to all puzzles
            if not filtered_puzzles:
                filtered_puzzles = puzzle_data['puzzles']
            
            # Randomly select a puzzle from filtered list
            puzzle = random.choice(filtered_puzzles)
            
            initial_fen = puzzle['fen']
            solution_moves = puzzle['solution']
            original_description = puzzle['description']
            player_color = puzzle['player_color']
            
            # Generate better description based on player color and puzzle data
            description = generate_puzzle_description(original_description, player_color, puzzle)
            
            # Add puzzle rating to description if available
            if 'rating' in puzzle:
                rating = puzzle['rating']
                # Round to nearest 50
                rounded_rating = round(rating / 50) * 50
                description = f"{description} (Rated {rounded_rating})"
            
            # Keep coordinates consistent - no conversion needed
            # The frontend will handle the visual flip while maintaining coordinate consistency
            
            chess_puzzle = ChessPuzzle(initial_fen, solution_moves, description)
            game_state['current_puzzle'] = chess_puzzle
            game_state['player_color'] = player_color
            
            # Count moves for the player's color
            if player_color == "white":
                # Count white moves (every other move starting from index 0)
                player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 0])
            else:
                # Count black moves (every other move starting from index 0)
                player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 0])
            
            return jsonify({
                'success': True,
                'fen': initial_fen,
                'description': description,
                'moves_required': player_moves_count,
                'player_color': player_color
            })
            
        except Exception as e:
            # Fallback to original hardcoded puzzles if JSON fails
            user_plays_white = random.choice([True, False])
            
            if user_plays_white:
                initial_fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1"
                solution_moves = ["d2d4", "e5d4", "c4f7"]
                description = "White to move and win material"
                player_color = "white"
            else:
                initial_fen = "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
                solution_moves = ["f6e4", "d2d4", "e4c3"]
                description = "Black to move and fork"
                player_color = "black"
            
            chess_puzzle = ChessPuzzle(initial_fen, solution_moves, description)
            game_state['current_puzzle'] = chess_puzzle
            game_state['player_color'] = player_color
            
            # Count moves for the player's color
            if player_color == "white":
                player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 0])
            else:
                player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 0])
            
            return jsonify({
                'success': True,
                'fen': initial_fen,
                'description': description,
                'moves_required': player_moves_count,
                'player_color': player_color
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/make-move', methods=['POST'])
@limiter.limit("100 per minute")
def make_move():
    """Process a player's move."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid request data'}), 400
            
        move_uci = data.get('move')
        
        # Validate move format
        if not validate_uci_move(move_uci):
            return jsonify({'success': False, 'error': 'Invalid move format'}), 400
        
        if not game_state['current_puzzle']:
            return jsonify({'success': False, 'error': 'No active puzzle'}), 400
        
        puzzle = game_state['current_puzzle']
        player_color = game_state.get('player_color', 'white')
        
        # Check if move is valid
        is_valid = puzzle.board.is_valid_move(move_uci)
        
        if not is_valid:
            return jsonify({
                'success': False
            })
        
        # Make the move
        success = puzzle.board.make_move(move_uci)
        if not success:
            return jsonify({
                'success': False
            })
        
        # Check if this was the correct move
        expected_move = puzzle.solution_moves[puzzle.current_move_index]
        
        if move_uci == expected_move:
            puzzle.current_move_index += 1
            
            # Check if puzzle is complete
            if puzzle.is_complete():
                game_state['consecutive_wins'] += 1
                game_state['total_puzzles_solved'] += 1
                return jsonify({
                    'success': True,
                    'puzzle_complete': True,
                    'moves_required': 0,
                    'consecutive_wins': game_state['consecutive_wins']
                })
            else:
                # Make the automatic black response
                if puzzle.current_move_index < len(puzzle.solution_moves):
                    black_move = puzzle.solution_moves[puzzle.current_move_index]
                    success = puzzle.board.make_move(black_move)
                    puzzle.current_move_index += 1
                    
                    if success:
                        # Calculate remaining moves for the player's color
                        player_color = game_state.get('player_color', 'white')
                        if player_color == "white":
                            # Count remaining white moves (every other move starting from current index)
                            remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 0])
                            # White player, so Black responds
                            response_color = "Black"
                        else:
                            # Count remaining black moves (every other move starting from current index + 1)
                            remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 1]) + 1
                            # Black player, so White responds
                            response_color = "White"
                        
                        return jsonify({
                            'success': True,
                            'puzzle_complete': False,
                            'moves_required': remaining_player_moves,
                            'black_move': black_move,
                            'current_fen': puzzle.board.get_fen()
                        })
                    else:
                        return jsonify({
                            'success': False
                        })
                else:
                    # Calculate remaining moves for the player's color
                    player_color = game_state.get('player_color', 'white')
                    if player_color == "white":
                        # Count remaining white moves (every other move starting from current index)
                        remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 0])
                    else:
                        # Count remaining black moves (every other move starting from current index + 1)
                        remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 1]) + 1
                    
                    return jsonify({
                        'success': True,
                        'puzzle_complete': False,
                        'moves_required': remaining_player_moves
                    })
        else:
            # Wrong move - reset consecutive wins and reset puzzle board
            game_state['consecutive_wins'] = 0
            puzzle.reset()  # Reset the puzzle board to original position
            return jsonify({
                'success': False,
                'consecutive_wins': game_state['consecutive_wins'],
                'original_fen': puzzle.initial_fen,  # Send the original puzzle FEN
                'solution_moves': puzzle.solution_moves,  # Send the solution moves
                'description': puzzle.description  # Send the puzzle description
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/game-stats')
def game_stats():
    """Get current game statistics."""
    return jsonify({
        'consecutive_wins': game_state['consecutive_wins'],
        'total_puzzles_solved': game_state['total_puzzles_solved']
    })

@app.route('/api/reset-game', methods=['POST'])
def reset_game():
    """Reset the game state."""
    game_state['consecutive_wins'] = 0
    game_state['total_puzzles_solved'] = 0
    game_state['current_puzzle'] = None
    return jsonify({'success': True, 'message': 'Game reset!'})

@app.route('/api/get-hint', methods=['POST'])
def get_hint():
    """Get a hint for the current puzzle."""
    try:
        if not game_state['current_puzzle']:
            return jsonify({'success': False, 'message': 'No active puzzle'}), 400
        
        puzzle = game_state['current_puzzle']
        
        # Check if puzzle is already complete
        if puzzle.is_complete():
            return jsonify({'success': False, 'message': 'Puzzle already complete!'}), 400
        
        # Get the next move that should be made
        if puzzle.current_move_index < len(puzzle.solution_moves):
            next_move = puzzle.solution_moves[puzzle.current_move_index]
            
            # Extract the source square (first 2 characters of the move)
            source_square = next_move[:2]
            
            return jsonify({
                'success': True,
                'hint_square': source_square,
                'message': f'Try moving the piece on {source_square.upper()}'
            })
        else:
            return jsonify({'success': False, 'message': 'No more moves available'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    """Get leaderboard data for both modes."""
    try:
        data = leaderboard.get_leaderboard_data()
        response = jsonify({
            'success': True,
            'leaderboard': data
        })
        
        # Enhanced cache-busting headers for mobile browsers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate, private'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Last-Modified'] = datetime.now().strftime('%a, %d %b %Y %H:%M:%S GMT')
        response.headers['ETag'] = f'"{hash(str(data))}"'
        
        return response
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/check-high-score', methods=['POST'])
def check_high_score():
    """Check if a score would make it to the leaderboard."""
    try:
        data = request.get_json()
        mode = data.get('mode')
        score = data.get('score')
        
        if not mode or score is None:
            return jsonify({'success': False, 'error': 'Missing mode or score'}), 400
        
        is_high_score = leaderboard.check_if_high_score(mode, score)
        
        return jsonify({
            'success': True,
            'is_high_score': is_high_score
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/add-score', methods=['POST'])
@limiter.limit("10 per minute")
def add_score():
    """Add a score to the leaderboard."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Invalid request data'}), 400
            
        mode = data.get('mode')
        score = data.get('score')
        player_name = data.get('player_name')
        
        # Validate inputs
        if not validate_difficulty(mode):
            return jsonify({'success': False, 'error': 'Invalid mode parameter'}), 400
            
        if not isinstance(score, int) or score < 0 or score > 10000:
            return jsonify({'success': False, 'error': 'Invalid score value'}), 400
        
        # Sanitize player name
        sanitized_name = sanitize_player_name(player_name)
        
        result = leaderboard.add_score(mode, score, sanitized_name)
        
        return jsonify({
            'success': True,
            'position': result['position'],
            'is_new_high_score': result['is_new_high_score'],
            'top_scores': result['top_scores']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def convert_moves_for_flipped_board(moves):
    """Convert UCI moves from normal board coordinates to flipped board coordinates."""
    converted_moves = []
    
    for move in moves:
        if len(move) >= 4:
            # Convert from square to square
            from_square = move[:2]
            to_square = move[2:4]
            promotion = move[4:] if len(move) > 4 else ""
            
            # Convert coordinates: a1->h8, b1->g8, etc.
            converted_from = convert_square_coordinate(from_square)
            converted_to = convert_square_coordinate(to_square)
            
            converted_moves.append(converted_from + converted_to + promotion)
        else:
            converted_moves.append(move)
    
    return converted_moves



def convert_square_coordinate(square):
    """Convert a square coordinate from normal to flipped board."""
    if len(square) != 2:
        return square
    
    file = square[0]  # a-h
    rank = square[1]  # 1-8
    
    # Convert file: a->h, b->g, c->f, d->e, e->d, f->c, g->b, h->a
    file_map = {'a': 'h', 'b': 'g', 'c': 'f', 'd': 'e', 'e': 'd', 'f': 'c', 'g': 'b', 'h': 'a'}
    
    # Convert rank: 1->8, 2->7, 3->6, 4->5, 5->4, 6->3, 7->2, 8->1
    rank_map = {'1': '8', '2': '7', '3': '6', '4': '5', '5': '4', '6': '3', '7': '2', '8': '1'}
    
    new_file = file_map.get(file, file)
    new_rank = rank_map.get(rank, rank)
    
    return new_file + new_rank

if __name__ == '__main__':
    # Production configuration
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.environ.get('HOST', '0.0.0.0')  # Changed to 0.0.0.0 for production
    port = int(os.environ.get('PORT', 5000))
    
    app.run(debug=debug_mode, host=host, port=port) 