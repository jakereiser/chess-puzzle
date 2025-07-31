"""
Tests for the chess board module.
"""

import pytest
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from board import ChessBoard

class TestChessBoard:
    """Test cases for ChessBoard class."""
    
    def test_board_initialization(self):
        """Test that a board can be initialized."""
        board = ChessBoard()
        assert board is not None
        assert board.board is not None
    
    def test_initial_fen(self):
        """Test that board starts with standard chess position."""
        board = ChessBoard()
        expected_start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
        assert board.get_fen().startswith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR")
    
    def test_valid_move(self):
        """Test that valid moves are recognized."""
        board = ChessBoard()
        # Test a valid opening move (e2e4)
        assert board.is_valid_move("e2e4")
    
    def test_invalid_move(self):
        """Test that invalid moves are rejected."""
        board = ChessBoard()
        # Test an invalid move (e2e5 - pawn can't move 3 squares)
        assert not board.is_valid_move("e2e5")
    
    def test_make_move(self):
        """Test that moves can be made on the board."""
        board = ChessBoard()
        initial_fen = board.get_fen()
        
        # Make a move
        success = board.make_move("e2e4")
        assert success
        assert board.get_fen() != initial_fen
    
    def test_legal_moves(self):
        """Test that legal moves can be retrieved."""
        board = ChessBoard()
        legal_moves = board.get_legal_moves()
        assert isinstance(legal_moves, list)
        assert len(legal_moves) > 0
        assert "e2e4" in legal_moves  # Common opening move 