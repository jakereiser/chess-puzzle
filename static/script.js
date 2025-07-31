// Chess Puzzle Web App JavaScript

let board = null;
let game = null;
let currentPuzzle = null;

// Initialize the application
$(document).ready(function() {
    initializeChessBoard();
    loadGameStats();
    setupEventListeners();
    
    // Handle window resize to keep board contained
    $(window).resize(function() {
        // Chessboard2 handles resizing automatically
    });
});

function initializeChessBoard() {
    const config = {
        draggable: false, // Start with no dragging until puzzle is loaded
        position: 'start',
        onDrop: onDrop,
        onDragStart: onDragStart,
        pieceTheme: '/static/img/chesspieces/wikipedia',
        orientation: 'white',
        showNotation: true
    };
    
    try {
        board = Chessboard2('chessboard', config);
        game = new Chess();
        
        // Simple board initialization
        setTimeout(function() {
            if (board) {
                board.setPosition('start');
            }
        }, 200);
    } catch (error) {
        console.error('Error initializing chessboard2:', error);
    }
}

// Removed complex styling functions to let chessboard.js handle styling naturally

function setupEventListeners() {
    $('#new-puzzle-btn').click(function() {
        loadNewPuzzle();
    });
    
    $('#reset-game-btn').click(function() {
        resetGame();
    });
}

function loadNewPuzzle() {
    $.ajax({
        url: '/api/new-puzzle',
        method: 'POST',
        success: function(response) {
            if (response.success) {
                currentPuzzle = {
                    fen: response.fen,
                    description: response.description,
                    movesRequired: response.moves_required
                };
                
                // Update the board position to the scrambled puzzle
                game = new Chess(response.fen);
                board.setPosition(response.fen);
                
                // Enable dragging for the puzzle
                console.log('Enabling dragging for puzzle');
                board.config({ draggable: true });
                
                // Ensure board is properly sized after position change
                setTimeout(function() {
                    if (board) {
                        console.log('Board updated, dragging should be enabled');
                    }
                }, 50);
                
                // Update UI
                $('#puzzle-description').text(response.description);
                $('#moves-required').text(`Moves required: ${response.moves_required}`);
                
                showFeedback('Puzzle loaded! Find the best moves! 🎯', 'success');
            } else {
                showFeedback('Failed to load puzzle. Try again!', 'error');
            }
        },
        error: function() {
            showFeedback('Error loading puzzle. Please try again.', 'error');
        }
    });
}

function onDragStart(data) {
    console.log('onDragStart called:', data);
    
    // Only allow dragging if there's an active puzzle
    if (!currentPuzzle) {
        console.log('No active puzzle, dragging disabled');
        return false;
    }
    
    // Only allow dragging pieces that belong to the current player
    // For now, we'll assume white always moves first in puzzles
    const pieceColor = data.piece.charAt(0);
    if (pieceColor !== 'w') {
        console.log('Not white piece, dragging disabled');
        return false;
    }
    
    console.log('Dragging allowed for piece:', data.piece, 'from square:', data.square);
    return true;
}

function onDrop(data) {
    console.log('onDrop called:', data);
    
    // Check if the move is legal according to chess rules
    const move = game.move({
        from: data.source,
        to: data.target,
        promotion: 'q' // Always promote to queen for simplicity
    });
    
    if (move === null) {
        console.log('Illegal move, snapping back');
        // Reset the game state to the current puzzle position
        if (currentPuzzle) {
            try {
                game = new Chess(currentPuzzle.fen);
                // Use a timeout to ensure the board is ready before setting position
                setTimeout(function() {
                    try {
                        board.setPosition(currentPuzzle.fen);
                    } catch (error) {
                        console.error('Error setting board position:', error);
                        // Fallback: reload the puzzle
                        loadNewPuzzle();
                    }
                }, 100);
            } catch (error) {
                console.error('Error resetting game state:', error);
                // Fallback: reload the puzzle
                loadNewPuzzle();
            }
        }
        return 'snapback'; // Illegal move - piece snaps back
    }
    
    console.log('Legal move made:', move);
    
    // Convert to UCI notation for API
    let moveUCI = data.source + data.target;
    if (move.promotion) {
        moveUCI += move.promotion;
    }
    
    console.log('Sending move to server:', moveUCI);
    console.log('Move details:', { source: data.source, target: data.target, moveUCI: moveUCI });
    
    // Send move to server for puzzle validation
    makeMove(moveUCI);
    
    return null; // Allow the move
}

function makeMove(moveUCI) {
    $.ajax({
        url: '/api/make-move',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ move: moveUCI }),
        success: function(response) {
            if (response.success) {
                if (response.puzzle_complete) {
                    // Puzzle solved!
                    showFeedback(response.message, 'success');
                    updateStats();
                    
                    // Auto-load new puzzle after a delay
                    setTimeout(function() {
                        loadNewPuzzle();
                    }, 2000);
                } else {
                    // Good move, continue
                    showFeedback(response.message, 'success');
                    $('#moves-required').text(`Moves remaining: ${response.moves_remaining}`);
                    
                    // Update board position if black made a move
                    if (response.black_move && response.current_fen) {
                        console.log('Black made move:', response.black_move);
                        console.log('New position:', response.current_fen);
                        
                        // Update the chess.js game state
                        game = new Chess(response.current_fen);
                        
                        // Update the board display
                        board.setPosition(response.current_fen);
                        
                        // Update the current puzzle FEN
                        if (currentPuzzle) {
                            currentPuzzle.fen = response.current_fen;
                        }
                    }
                }
            } else {
                // Wrong move
                showFeedback(response.message, 'error');
                updateStats();
                
                // Reset the board to the original puzzle position
                if (response.original_fen) {
                    try {
                        game = new Chess(response.original_fen);
                        setTimeout(function() {
                            try {
                                board.setPosition(response.original_fen);
                                // Update the current puzzle FEN to the original
                                if (currentPuzzle) {
                                    currentPuzzle.fen = response.original_fen;
                                }
                            } catch (error) {
                                console.error('Error resetting board after wrong move:', error);
                                // Fallback: reload the puzzle
                                loadNewPuzzle();
                            }
                        }, 100);
                    } catch (error) {
                        console.error('Error resetting game state after wrong move:', error);
                        // Fallback: reload the puzzle
                        loadNewPuzzle();
                    }
                } else {
                    // Fallback if no original_fen provided
                    if (currentPuzzle) {
                        try {
                            game = new Chess(currentPuzzle.fen);
                            setTimeout(function() {
                                try {
                                    board.setPosition(currentPuzzle.fen);
                                } catch (error) {
                                    console.error('Error resetting board after wrong move:', error);
                                    // Fallback: reload the puzzle
                                    loadNewPuzzle();
                                }
                            }, 100);
                        } catch (error) {
                            console.error('Error resetting game state after wrong move:', error);
                            // Fallback: reload the puzzle
                            loadNewPuzzle();
                        }
                    }
                }
            }
        },
        error: function() {
            showFeedback('Error processing move. Please try again.', 'error');
            // Reset board position on error
            if (currentPuzzle) {
                try {
                    game = new Chess(currentPuzzle.fen);
                    setTimeout(function() {
                        try {
                            board.setPosition(currentPuzzle.fen);
                        } catch (error) {
                            console.error('Error resetting board on AJAX error:', error);
                            // Fallback: reload the puzzle
                            loadNewPuzzle();
                        }
                    }, 100);
                } catch (error) {
                    console.error('Error resetting game state on AJAX error:', error);
                    // Fallback: reload the puzzle
                    loadNewPuzzle();
                }
            }
        }
    });
}

function showFeedback(message, type) {
    const feedbackElement = $('#feedback-message');
    feedbackElement.text(message);
    feedbackElement.removeClass('success error show');
    feedbackElement.addClass(type + ' show');
    
    // Auto-hide after 3 seconds
    setTimeout(function() {
        feedbackElement.removeClass('show');
    }, 3000);
}

function loadGameStats() {
    $.ajax({
        url: '/api/game-stats',
        method: 'GET',
        success: function(response) {
            $('#consecutive-wins').text(response.consecutive_wins);
            $('#total-solved').text(response.total_puzzles_solved);
        }
    });
}

function updateStats() {
    loadGameStats();
}

function resetGame() {
    $.ajax({
        url: '/api/reset-game',
        method: 'POST',
        success: function(response) {
            if (response.success) {
                showFeedback(response.message, 'success');
                updateStats();
                
                // Reset the board to standard starting position
                game = new Chess();
                board.setPosition('start');
                board.config({ draggable: false }); // Disable dragging
                currentPuzzle = null;
                
                $('#puzzle-description').text('Ready to start?');
                $('#moves-required').text('Click "New Puzzle" to begin!');
            }
        },
        error: function() {
            showFeedback('Error resetting game. Please try again.', 'error');
        }
    });
}

// Add some fun celebration messages
const celebrationMessages = [
    "Brilliant! You're a chess master! 🏆",
    "Excellent move! Keep it up! ⭐",
    "You're on fire! 🔥",
    "Outstanding play! 🌟",
    "You're unstoppable! 💪",
    "Chess genius in action! 🧠",
    "Perfect execution! 🎯",
    "You're making chess look easy! 😎"
];

const encouragementMessages = [
    "Don't give up! You've got this! 💪",
    "Every master was once a beginner! 🌱",
    "Learn from mistakes and keep going! 📚",
    "You're getting better with each puzzle! 📈",
    "Stay focused, you can do it! 🎯",
    "Chess is a game of patience! ⏳",
    "Your next move could be the winning one! 🎲"
];

// Helper function to safely reset the board
function safeResetBoard() {
    if (currentPuzzle) {
        try {
            game = new Chess(currentPuzzle.fen);
            setTimeout(function() {
                try {
                    board.setPosition(currentPuzzle.fen);
                } catch (error) {
                    console.error('Error in safeResetBoard:', error);
                    // If we can't reset, reload the puzzle
                    loadNewPuzzle();
                }
            }, 100);
        } catch (error) {
            console.error('Error creating new Chess instance:', error);
            // If we can't create a new game, reload the puzzle
            loadNewPuzzle();
        }
    }
}

// Add some variety to the feedback
function getRandomMessage(type) {
    if (type === 'success') {
        return celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
    } else {
        return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    }
} 