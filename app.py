#!/usr/bin/env python3
"""
Chess Puzzle Web Application
Flask-based web server for the chess puzzle game.
"""

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import sys
import os

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from src.board import ChessBoard
    from src.puzzle import ChessPuzzle
except ImportError:
    # Fallback for direct imports
    from src.board import ChessBoard
    from src.puzzle import ChessPuzzle

app = Flask(__name__)
app.secret_key = 'chess-puzzle-secret-key-2024'  # For session management
CORS(app)  # Enable CORS for all routes

# Global game state (in production, use a proper database)
game_state = {
    'current_puzzle': None,
    'consecutive_wins': 0,
    'total_puzzles_solved': 0
}

@app.route('/')
def index():
    """Main game page."""
    return render_template('index.html')

@app.route('/test')
def test():
    """Test page."""
    return render_template('test.html')



@app.route('/api/new-puzzle', methods=['POST'])
def new_puzzle():
    """Generate a new puzzle for the player."""
    try:
        # Randomly choose whether user plays white or black
        import random
        user_plays_white = random.choice([True, False])
        
        if user_plays_white:
            # White to move puzzle
            initial_fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1"
            solution_moves = ["d2d4", "e5d4", "c4f7"]  # 3-move tactical puzzle
            description = "White to move and win material"
            player_color = "white"
        else:
            # Black to move puzzle
            initial_fen = "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
            solution_moves = ["e5e4", "d2d4", "e4d4", "c2c4"]  # Black plays e5, White responds d4, Black captures, White plays c4
            description = "Black to move and gain advantage"
            player_color = "black"
        
        puzzle = ChessPuzzle(initial_fen, solution_moves, description)
        game_state['current_puzzle'] = puzzle
        game_state['player_color'] = player_color
        
        # Count moves for the player's color
        if player_color == "white":
            # Count white moves (every other move starting from index 0)
            player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 0])
        else:
            # Count black moves (every other move starting from index 1)
            player_moves_count = len([move for i, move in enumerate(solution_moves) if i % 2 == 1])
        
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
def make_move():
    """Process a player's move."""
    try:
        data = request.get_json()
        move_uci = data.get('move')
        
        print(f"Received move: {move_uci}")
        print(f"Current puzzle FEN: {game_state['current_puzzle'].board.get_fen() if game_state['current_puzzle'] else 'None'}")
        
        if not game_state['current_puzzle']:
            return jsonify({'success': False, 'error': 'No active puzzle'}), 400
        
        puzzle = game_state['current_puzzle']
        
        # Check if move is valid
        is_valid = puzzle.board.is_valid_move(move_uci)
        print(f"Move {move_uci} is valid: {is_valid}")
        
        if not is_valid:
            legal_moves = puzzle.board.get_legal_moves()
            print(f"Legal moves: {legal_moves[:10]}...")  # Show first 10 moves
            return jsonify({
                'success': False,
                'message': 'Invalid move!',
                'type': 'error'
            })
        
        # Make the move
        success = puzzle.board.make_move(move_uci)
        if not success:
            return jsonify({
                'success': False,
                'message': 'Move failed!',
                'type': 'error'
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
                    'message': 'Puzzle solved! 🎉',
                    'type': 'success',
                    'puzzle_complete': True,
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
                        else:
                            # Count remaining black moves (every other move starting from current index + 1)
                            remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 1])
                        
                        return jsonify({
                            'success': True,
                            'message': f'Good move! Black responds with {black_move}',
                            'type': 'success',
                            'puzzle_complete': False,
                            'moves_required': remaining_player_moves,
                            'black_move': black_move,
                            'current_fen': puzzle.board.get_fen()
                        })
                    else:
                        return jsonify({
                            'success': False,
                            'message': 'Error making black move!',
                            'type': 'error'
                        })
                else:
                    # Calculate remaining moves for the player's color
                    player_color = game_state.get('player_color', 'white')
                    if player_color == "white":
                        # Count remaining white moves (every other move starting from current index)
                        remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 0])
                    else:
                        # Count remaining black moves (every other move starting from current index + 1)
                        remaining_player_moves = len([move for i, move in enumerate(puzzle.solution_moves[puzzle.current_move_index:]) if i % 2 == 1])
                    
                    return jsonify({
                        'success': True,
                        'message': 'Good move! Keep going!',
                        'type': 'success',
                        'puzzle_complete': False,
                        'moves_required': remaining_player_moves
                    })
        else:
            # Wrong move - reset consecutive wins and reset puzzle board
            game_state['consecutive_wins'] = 0
            puzzle.reset()  # Reset the puzzle board to original position
            return jsonify({
                'success': False,
                'message': 'Wrong move! Try again!',
                'type': 'error',
                'consecutive_wins': game_state['consecutive_wins'],
                'original_fen': puzzle.initial_fen  # Send the original puzzle FEN
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

@app.route('/api/reset-game')
def reset_game():
    """Reset the game state."""
    game_state['consecutive_wins'] = 0
    game_state['total_puzzles_solved'] = 0
    game_state['current_puzzle'] = None
    return jsonify({'success': True, 'message': 'Game reset!'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 