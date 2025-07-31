"""
Chess Puzzle Module
Handles puzzle creation, validation, and solving.
"""

from .board import ChessBoard

class ChessPuzzle:
    """Represents a chess puzzle with solution and validation."""
    
    def __init__(self, initial_fen, solution_moves, description=""):
        """
        Initialize a chess puzzle.
        
        Args:
            initial_fen: FEN string of the initial position
            solution_moves: List of moves in UCI notation that solve the puzzle
            description: Description of the puzzle
        """
        self.initial_fen = initial_fen
        self.solution_moves = solution_moves
        self.description = description
        self.board = ChessBoard(initial_fen)
        self.current_move_index = 0
    
    def reset(self):
        """Reset the puzzle to the initial position."""
        self.board = ChessBoard(self.initial_fen)
        self.current_move_index = 0
    
    def check_solution(self, player_moves):
        """Check if the provided moves match the solution."""
        if len(player_moves) != len(self.solution_moves):
            return False
        
        for i, move in enumerate(player_moves):
            if move != self.solution_moves[i]:
                return False
        
        return True
    
    def get_hint(self):
        """Get the next move in the solution as a hint."""
        if self.current_move_index < len(self.solution_moves):
            return self.solution_moves[self.current_move_index]
        return None
    
    def is_complete(self):
        """Check if the puzzle has been solved."""
        return self.current_move_index >= len(self.solution_moves)
    
    def get_difficulty(self):
        """Estimate puzzle difficulty based on solution length."""
        if len(self.solution_moves) <= 2:
            return "Easy"
        elif len(self.solution_moves) <= 4:
            return "Medium"
        else:
            return "Hard"
    
    def get_progress(self):
        """Get the current progress in the puzzle."""
        return f"{self.current_move_index}/{len(self.solution_moves)} moves completed" 