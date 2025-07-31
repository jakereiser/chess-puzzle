"""
Chess Board Module
Handles chess board representation and basic operations.
"""

import chess

class ChessBoard:
    """Represents a chess board and handles board operations."""
    
    def __init__(self, fen=None):
        """Initialize a chess board with optional FEN string."""
        self.board = chess.Board(fen) if fen else chess.Board()
    
    def get_board_state(self):
        """Return the current board state as a string."""
        return str(self.board)
    
    def get_fen(self):
        """Return the current board state in FEN notation."""
        return self.board.fen()
    
    def is_valid_move(self, move_uci):
        """Check if a move is valid in UCI notation."""
        try:
            move = chess.Move.from_uci(move_uci)
            return move in self.board.legal_moves
        except ValueError:
            return False
    
    def make_move(self, move_uci):
        """Make a move on the board."""
        if self.is_valid_move(move_uci):
            move = chess.Move.from_uci(move_uci)
            self.board.push(move)
            return True
        return False
    
    def is_checkmate(self):
        """Check if the current position is checkmate."""
        return self.board.is_checkmate()
    
    def is_stalemate(self):
        """Check if the current position is stalemate."""
        return self.board.is_stalemate()
    
    def get_legal_moves(self):
        """Get all legal moves in UCI notation."""
        return [move.uci() for move in self.board.legal_moves] 