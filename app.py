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
        # Load puzzles from JSON file
        import json
        import random
        
        try:
            with open('puzzles.json', 'r') as f:
                puzzle_data = json.load(f)
            
            # Randomly select a puzzle
            puzzle = random.choice(puzzle_data['puzzles'])
            
            initial_fen = puzzle['fen']
            solution_moves = puzzle['solution']
            description = puzzle['description']
            player_color = puzzle['player_color']
            
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
                # Count black moves (all moves in solution for black puzzles)
                player_moves_count = len(solution_moves)
            
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
                player_moves_count = len(solution_moves)
            
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
        player_color = game_state.get('player_color', 'white')
        
        print(f"Received move: {move_uci} for player color: {player_color}")
        
        # Check if move is valid
        is_valid = puzzle.board.is_valid_move(move_uci)
        print(f"Move {move_uci} is valid: {is_valid}")
        
        if not is_valid:
            legal_moves = puzzle.board.get_legal_moves()
            print(f"Legal moves: {legal_moves[:10]}...")  # Show first 10 moves
            print(f"Current FEN: {puzzle.board.get_fen()}")
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
        print(f"Expected move: {expected_move}")
        print(f"Actual move: {move_uci}")
        print(f"Move index: {puzzle.current_move_index}")
        
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
                            # Count remaining black moves (all remaining moves for black puzzles)
                            remaining_player_moves = len(puzzle.solution_moves[puzzle.current_move_index:])
                            # Black player, so White responds
                            response_color = "White"
                        
                        return jsonify({
                            'success': True,
                            'message': f'Good move! {response_color} responds with {black_move}',
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
                        # Count remaining black moves (all remaining moves for black puzzles)
                        remaining_player_moves = len(puzzle.solution_moves[puzzle.current_move_index:])
                    
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
    
    print(f"Converting square {square}: file={file}->{new_file}, rank={rank}->{new_rank}")
    
    return new_file + new_rank

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 