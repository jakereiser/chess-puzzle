// Chess Puzzle Web App JavaScript

let board = null;
let game = null;
let currentPuzzle = null;
let currentMode = 'easy'; // 'easy', 'hard', or 'hikaru'
let hintUsedTotal = false; // Track if hint was used in hard mode (one total)
let hintCount = 0; // Track hint count for hard mode (max 3)
let currentStreak = 0; // Track current streak for leaderboard

// Global error handler to prevent uncaught exceptions
window.addEventListener('error', function(e) {
    // Filter out SES-related warnings from browser extensions
    if (e.message && e.message.includes('SES') || e.message.includes('lockdown')) {
        return false; // Silently ignore SES warnings
    }
    console.warn('Caught error:', e.message);
    return false; // Prevent default error handling
});

// Handle SES-related console warnings
const originalWarn = console.warn;
console.warn = function(...args) {
    // Filter out SES warnings from browser extensions
    const message = args.join(' ');
    if (message.includes('SES') || message.includes('dateTaming') || message.includes('mathTaming') || message.includes('lockdown')) {
        return; // Don't log SES warnings
    }
    originalWarn.apply(console, args);
};

// Also handle console.error for SES-related messages
const originalError = console.error;
console.error = function(...args) {
    // Filter out SES errors from browser extensions
    const message = args.join(' ');
    if (message.includes('SES') || message.includes('lockdown') || message.includes('SES_UNCAUGHT_EXCEPTION')) {
        return; // Don't log SES errors
    }
    originalError.apply(console, args);
};

// Initialize the application
$(document).ready(function() {
    try {
        initializeChessBoard();
        loadGameStats();
        loadLeaderboard();
        setupEventListeners();
        
        // Handle window resize to keep board contained
        $(window).resize(function() {
            // Chessboard2 handles resizing automatically
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function initializeChessBoard() {
    console.log('Initializing chessboard...');
    
    // Check if chessboard element exists
    const chessboardElement = document.getElementById('chessboard');
    if (!chessboardElement) {
        console.error('Chessboard element not found!');
        return;
    }
    
    // Check if Chessboard2 is available
    if (typeof Chessboard2 === 'undefined') {
        console.error('Chessboard2 library not loaded!');
        return;
    }
    
    const config = {
        draggable: false, // Start with no dragging until puzzle is loaded
        position: 'start',
        onDrop: onDrop,
        onDragStart: onDragStart,
        pieceTheme: '/static/img/chesspieces/wikipedia',
        orientation: 'white',
        showNotation: true,
        moveSpeed: 200,
        snapbackSpeed: 200,
        trashSpeed: 0 // Hide piece immediately when dragging starts
    };
    
    try {
        console.log('Creating chessboard with config:', config);
        board = Chessboard2('chessboard', config);
        game = new Chess();
        
        console.log('Chessboard created successfully:', board);
        
        // Simple board initialization
        setTimeout(function() {
            if (board) {
                console.log('Setting board position to start');
                board.setPosition('start');
                console.log('Board position set successfully');
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
    
    $('#hint-btn').click(function() {
        getHint();
    });
    
    // Mode selector event listeners
    $('#easy-mode-btn').click(function() {
        setMode('easy');
    });
    
    $('#hard-mode-btn').click(function() {
        setMode('hard');
    });
    
    $('#hikaru-mode-btn').click(function() {
        setMode('hikaru');
    });
    
    // Leaderboard tab buttons
    $('.leaderboard-tab').click(function() {
        const mode = $(this).data('mode');
        
        // Update active tab
        $('.leaderboard-tab').removeClass('active');
        $(this).addClass('active');
        
        // Show corresponding leaderboard
        $('.leaderboard-list').removeClass('active');
        $(`#${mode}-leaderboard`).addClass('active');
    });
    
    // High score modal buttons
    $('#save-score-btn').click(function() {
        saveHighScore();
    });
    
    $('#cancel-score-btn').click(function() {
        hideHighScoreModal();
    });
    
    // Close modal when clicking outside
    $('#high-score-modal').click(function(e) {
        if (e.target === this) {
            hideHighScoreModal();
        }
    });
    
    // Enter key to save score
    $('#player-name-input').keypress(function(e) {
        if (e.which === 13) { // Enter key
            saveHighScore();
        }
    });
    
    // Solution modal event listeners
    $('#new-puzzle-after-solution-btn').click(function() {
        hideSolutionModal();
        loadNewPuzzle();
    });
    
    $('#close-solution-btn').click(function() {
        hideSolutionModal();
    });
    
    // Close solution modal when clicking outside
    $('#solution-modal').click(function(e) {
        if (e.target === this) {
            hideSolutionModal();
        }
    });
}

function loadNewPuzzle() {
    $.ajax({
        url: '/api/new-puzzle',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            difficulty: currentMode
        }),
        success: function(response) {
            if (response.success) {
                currentPuzzle = {
                    fen: response.fen,
                    description: response.description,
                    movesRequired: response.moves_required,
                    playerColor: response.player_color || 'white'
                };
                
                // Update the board position to the scrambled puzzle
                game = new Chess(response.fen);
                board.setPosition(response.fen);
                
                // Set board orientation based on player color
                if (response.player_color === 'black') {
                    board.config({ orientation: 'black' });
                    // Flip coordinate labels for black orientation
                    flipCoordinateLabels();
                } else {
                    board.config({ orientation: 'white' });
                    // Reset coordinate labels for white orientation
                    resetCoordinateLabels();
                }
                
                // Enable dragging for the puzzle with proper animation settings
                console.log('Enabling dragging for puzzle');
                board.config({ 
                    draggable: true,
                    moveSpeed: 200,
                    snapbackSpeed: 200,
                    trashSpeed: 0 // Hide piece immediately when dragging starts
                });
                
                // Ensure board is properly sized after position change
                setTimeout(function() {
                    if (board) {
                        console.log('Board updated, dragging should be enabled');
                    }
                }, 50);
                
                                    // Update UI
                    $('#puzzle-description').text(response.description);
                    $('#moves-required').text(`Moves required: ${response.moves_required}`);
                    
                    // Clear any hint highlighting and persistent messages
                    clearHintHighlight();
                    $('#feedback-message').removeClass('show');
                    
                    // Update hint button state for new puzzle
                    updateHintButtonState();
                    
                    showFeedback('Puzzle loaded! Good luck! 🎯', 'success');
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
    const pieceColor = data.piece.charAt(0);
    const expectedColor = currentPuzzle.playerColor === 'white' ? 'w' : 'b';
    if (pieceColor !== expectedColor) {
        console.log(`Not ${currentPuzzle.playerColor} piece, dragging disabled`);
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
    // Keep coordinates consistent - no conversion needed since backend handles coordinate mapping
    let source = data.source;
    let target = data.target;
    
    // For debugging, log the coordinates being sent
    console.log('Coordinates being sent to server:', { source: source, target: target });
    
    let moveUCI = source + target;
    if (move.promotion) {
        moveUCI += move.promotion;
    }
    
    console.log('Sending move to server:', moveUCI);
    console.log('Move details:', { source: source, target: target, moveUCI: moveUCI });
    
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
                    // Puzzle solved! Get enhanced celebration message
                    const consecutiveWins = response.consecutive_wins || 0;
                    const celebrationMessage = getRandomMessage('success', consecutiveWins);
                    showFeedback(celebrationMessage, 'success', false, consecutiveWins);
                    updateStats();
                    
                    // Update current streak (don't check for high score yet)
                    currentStreak = consecutiveWins;
                    
                    // Update moves required to 0 when puzzle is complete
                    $('#moves-required').text(`Moves required: ${response.moves_required || 0}`);
                    
                    // Auto-load new puzzle after a delay
                    setTimeout(function() {
                        loadNewPuzzle();
                    }, 2000);
                } else {
                    // Good move, continue
                    showFeedback('Good move! Keep going!', 'success');
                    $('#moves-required').text(`Moves required: ${response.moves_required}`);
                    
                    // Clear any hint highlighting when a move is made
                    clearHintHighlight();
                    
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
                // Wrong move - streak is broken
                const encouragementMessage = getRandomMessage('error');
                showFeedback(encouragementMessage, 'error');
                updateStats();
                
                // Check for high score when streak is broken
                if (currentStreak > 0) {
                    checkHighScore(currentMode, currentStreak);
                }
                
                // Reset current streak
                currentStreak = 0;
                
                // Clear any hint highlighting when a wrong move is made
                clearHintHighlight();
                
                // Show solution modal if solution data is provided
                if (response.solution_moves && response.description) {
                    showSolutionModal(response.solution_moves, response.description);
                }
                
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

function showFeedback(message, type, persistent = false, consecutiveWins = 0) {
    const feedbackElement = $('#feedback-message');
    feedbackElement.text(message);
    feedbackElement.removeClass('success error show consecutive-win');
    feedbackElement.addClass(type + ' show');
    
    // Add special styling for consecutive wins
    if (type === 'success' && consecutiveWins >= 2) {
        feedbackElement.addClass('consecutive-win');
    }
    
    // Only auto-hide if not persistent
    if (!persistent) {
        setTimeout(function() {
            feedbackElement.removeClass('show');
        }, 5000); // Increased from 3 seconds to 5 seconds
    }
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
                board.config({ 
                    draggable: false, // Disable dragging
                    orientation: 'white' // Reset to white orientation
                });
                currentPuzzle = null;
                
                // Reset coordinate labels to default
                resetCoordinateLabels();
                
                // Reset hint usage and mode for game reset
                hintUsedTotal = false;
                currentMode = 'easy';
                currentStreak = 0; // Reset current streak
                $('.btn-mode').removeClass('btn-mode-active btn-mode-disabled');
                $('#easy-mode-btn').addClass('btn-mode-active');
                updateHintButtonState();
                
                // Clear any hint highlighting and persistent messages
                clearHintHighlight();
                $('#feedback-message').removeClass('show');
                
                $('#puzzle-description').text('Ready to start?');
                $('#moves-required').text('Click "New Puzzle" to begin!');
            }
        },
        error: function() {
            showFeedback('Error resetting game. Please try again.', 'error');
        }
    });
}

function setMode(mode) {
    // Prevent switching from Hard/Hikaru back to Easy
    if ((currentMode === 'hard' || currentMode === 'hikaru') && mode === 'easy') {
        showFeedback('Cannot switch back to Easy Mode once Hard or Hikaru Mode is selected!', 'error');
        return;
    }
    
    // Prevent switching from Hikaru to Hard mode
    if (currentMode === 'hikaru' && mode === 'hard') {
        showFeedback('Cannot switch from Hikaru Mode to Hard Mode! Reset the game first.', 'error');
        return;
    }
    
    currentMode = mode;
    if (mode === 'easy') {
        hintUsedTotal = false; // Reset hint usage when switching to easy
        hintCount = 0; // Reset hint count
    }
    
    // Update button styling
    $('.btn-mode').removeClass('btn-mode-active btn-mode-disabled');
    $(`#${mode}-mode-btn`).addClass('btn-mode-active');
    
    // Disable Easy button if Hard or Hikaru mode is selected
    if (mode === 'hard' || mode === 'hikaru') {
        $('#easy-mode-btn').addClass('btn-mode-disabled');
    }
    
    // Disable Hard button if Hikaru mode is selected
    if (mode === 'hikaru') {
        $('#hard-mode-btn').addClass('btn-mode-disabled');
    }
    
    // Update hint button state
    updateHintButtonState();
    
    // Show feedback about mode change
    let modeText, message;
    if (mode === 'easy') {
        modeText = 'Easy Mode';
        message = `${modeText} - Unlimited hints available! 💡`;
    } else if (mode === 'hard') {
        modeText = 'Hard Mode';
        message = `${modeText} - Max 3 hints (resets streak)! ⚠️`;
    } else if (mode === 'hikaru') {
        modeText = 'Hikaru Mode';
        message = `${modeText} - No hints allowed! 🏆`;
    }
    showFeedback(message, 'success');
}

function updateHintButtonState() {
    const hintBtn = $('#hint-btn');
    if (currentMode === 'hikaru') {
        hintBtn.prop('disabled', true);
        hintBtn.text('💡 Hint (Not Allowed)');
    } else if (currentMode === 'hard' && hintCount >= 3) {
        hintBtn.prop('disabled', true);
        hintBtn.text('💡 Hint (Max Used)');
    } else if (currentMode === 'hard') {
        hintBtn.prop('disabled', false);
        hintBtn.text(`💡 Hint (${3 - hintCount} left)`);
    } else {
        hintBtn.prop('disabled', false);
        hintBtn.text('💡 Hint');
    }
}

function getHint() {
    if (!currentPuzzle) {
        showFeedback('No active puzzle. Load a puzzle first!', 'error');
        return;
    }
    
    // Check mode restrictions
    if (currentMode === 'hikaru') {
        showFeedback('No hints allowed in Hikaru Mode!', 'error');
        return;
    }
    
    if (currentMode === 'hard' && hintCount >= 3) {
        showFeedback('You\'ve used all 3 hints in Hard Mode!', 'error');
        return;
    }
    
    $.ajax({
        url: '/api/get-hint',
        method: 'POST',
        success: function(response) {
            if (response.success) {
                showFeedback(response.message, 'success', true); // Persistent message
                highlightSquare(response.hint_square);
                
                // Update hint count for hard mode
                if (currentMode === 'hard') {
                    hintCount++;
                    updateHintButtonState();
                }
            } else {
                showFeedback(response.message, 'error');
            }
        },
        error: function() {
            showFeedback('Error getting hint. Please try again.', 'error');
        }
    });
}

function highlightSquare(square) {
    // Clear any existing highlights
    clearHintHighlight();
    
    // Add highlight class to the square
    const squareElement = $(`.square-${square}`);
    if (squareElement.length) {
        squareElement.addClass('hint-highlight');
        
        // Remove highlight after 3 seconds
        setTimeout(function() {
            clearHintHighlight();
        }, 3000);
    }
}

function clearHintHighlight() {
    $('.hint-highlight').removeClass('hint-highlight');
}

// Enhanced celebration messages with chess jokes and positive feedback
const celebrationMessages = [
    "Brilliant! You're a chess master! 🏆",
    "Excellent move! Keep it up! ⭐",
    "You're on fire! 🔥",
    "Outstanding play! 🌟",
    "You're unstoppable! 💪",
    "Chess genius in action! 🧠",
    "Perfect execution! 🎯",
    "You're making chess look easy! 😎",
    "Checkmate! You're crushing it! ♔",
    "Queen's gambit accepted - and won! 👑",
    "Knight to remember! ♞",
    "Bishop's blessing on your play! ♝",
    "Rook and roll! ♜",
    "Pawn to the future! ♟️",
    "Castle your way to victory! 🏰",
    "En passant - you're passing the test! 🎯"
];

const chessJokes = [
    "Why did the chess piece go to the doctor? It had a bad case of knight sweats! 😄",
    "What do you call a chess player who's always late? A slow-pawn! ⏰",
    "Why did the queen go to the pawn shop? She was looking for a good deal! 👑",
    "What's a chess player's favorite dance? The bishop shuffle! 💃",
    "Why did the rook feel lonely? Because it couldn't castle! 🏰",
    "What do you call a chess piece that's always tired? A knight owl! 🦉",
    "Why did the pawn go to therapy? It had too many issues! ♟️",
    "What's a chess player's favorite drink? Check-mate! ☕",
    "Why did the king go to the gym? To work on his royal fitness! 💪",
    "What do you call a chess piece that's always happy? A joy-stick! 😊"
];

const consecutiveWinMessages = [
    "🔥 Hot streak! You're on fire!",
    "⚡ Lightning strikes twice! Keep going!",
    "🎯 Three in a row! You're unstoppable!",
    "🏆 Four wins! You're a chess legend!",
    "👑 Five consecutive wins! Royal performance!",
    "🌟 Six wins! You're a star player!",
    "💎 Seven wins! Diamond-level play!",
    "🚀 Eight wins! You're reaching new heights!",
    "🎪 Nine wins! You're putting on a show!",
    "🏅 Ten wins! You're a chess champion!"
];

const encouragementMessages = [
    "Don't give up! You've got this! 💪",
    "Every master was once a beginner! 🌱",
    "Learn from mistakes and keep going! 📚",
    "You're getting better with each puzzle! 📈",
    "Stay focused, you can do it! 🎯",
    "Chess is a game of patience! ⏳",
    "Your next move could be the winning one! 🎲",
    "Remember: even grandmasters make mistakes! ♟️",
    "Every puzzle solved makes you stronger! 💪",
    "Chess is 99% tactics and 1% strategy! 🧠"
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

// Enhanced feedback system with chess jokes and consecutive win celebrations
function getRandomMessage(type, consecutiveWins = 0) {
    if (type === 'success') {
        // For consecutive wins, show special messages
        if (consecutiveWins >= 2 && consecutiveWins <= 10) {
            return consecutiveWinMessages[consecutiveWins - 2];
        }
        
        // Randomly choose between celebration message and chess joke
        const useJoke = Math.random() < 0.3; // 30% chance for a joke
        if (useJoke) {
            return chessJokes[Math.floor(Math.random() * chessJokes.length)];
        } else {
            return celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
        }
    } else {
        return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
    }
}

// Coordinate label functions
function flipCoordinateLabels() {
    // Flip file labels (H-A from left to right for black perspective)
    const fileLabels = document.querySelectorAll('.coordinate-bottom span');
    const fileOrder = ['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
    fileLabels.forEach((span, index) => {
        span.textContent = fileOrder[index];
    });
    
    // Flip rank labels (1-8 from top to bottom for black perspective)
    const rankLabels = document.querySelectorAll('.coordinate-left span');
    const rankOrder = ['1', '2', '3', '4', '5', '6', '7', '8'];
    rankLabels.forEach((span, index) => {
        span.textContent = rankOrder[index];
    });
    
    console.log('Coordinate labels flipped for black puzzle');
}

function resetCoordinateLabels() {
    // Reset to standard coordinate labels
    const fileLabels = document.querySelectorAll('.coordinate-bottom span');
    const fileOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    fileLabels.forEach((span, index) => {
        span.textContent = fileOrder[index];
    });

    const rankLabels = document.querySelectorAll('.coordinate-left span');
    const rankOrder = ['8', '7', '6', '5', '4', '3', '2', '1'];
    rankLabels.forEach((span, index) => {
        span.textContent = rankOrder[index];
    });
}

// Leaderboard Functions
function loadLeaderboard() {
    $.ajax({
        url: '/api/leaderboard',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                updateLeaderboardDisplay(response.leaderboard);
            }
        },
        error: function() {
            console.error('Failed to load leaderboard');
        }
    });
}

function updateLeaderboardDisplay(leaderboardData) {
    // Update Easy mode leaderboard
    updateLeaderboardList('easy', leaderboardData.easy);
    
    // Update Hard mode leaderboard
    updateLeaderboardList('hard', leaderboardData.hard);
    
    // Update Hikaru mode leaderboard
    updateLeaderboardList('hikaru', leaderboardData.hikaru);
}

function updateLeaderboardList(mode, scores) {
    const listElement = $(`#${mode}-leaderboard`);
    
    if (scores.length === 0) {
        listElement.html('<div class="leaderboard-placeholder">No scores yet. Be the first!</div>');
        return;
    }
    
    let html = '';
    scores.forEach((score, index) => {
        const position = index + 1;
        const date = new Date(score.date).toLocaleDateString();
        const positionIcon = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}.`;
        
        html += `
            <div class="leaderboard-entry">
                <span class="leaderboard-position">${positionIcon}</span>
                <span class="leaderboard-name">${score.name}</span>
                <span class="leaderboard-score">${score.score}</span>
                <span class="leaderboard-date">${date}</span>
            </div>
        `;
    });
    
    listElement.html(html);
}

function checkHighScore(mode, score) {
    $.ajax({
        url: '/api/check-high-score',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            mode: mode,
            score: score
        }),
        success: function(response) {
            if (response.success && response.is_high_score) {
                showHighScoreModal(mode, score);
            }
        },
        error: function() {
            console.error('Failed to check high score');
        }
    });
}

function showHighScoreModal(mode, score) {
    $('#player-name-input').val('');
    $('#high-score-modal').show();
    
    // Store the score data for when user saves
    $('#high-score-modal').data('score-data', { mode: mode, score: score });
}

function hideHighScoreModal() {
    $('#high-score-modal').hide();
}

function saveHighScore() {
    const scoreData = $('#high-score-modal').data('score-data');
    const playerName = $('#player-name-input').val().trim();
    
    $.ajax({
        url: '/api/add-score',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            mode: scoreData.mode,
            score: scoreData.score,
            player_name: playerName || null
        }),
        success: function(response) {
            if (response.success) {
                hideHighScoreModal();
                loadLeaderboard(); // Refresh leaderboard
                
                const message = response.is_new_high_score 
                    ? `🏆 New #1 High Score! (${response.position}${getOrdinalSuffix(response.position)})` 
                    : `🏆 High Score! (${response.position}${getOrdinalSuffix(response.position)})`;
                
                showFeedback(message, 'success');
            }
        },
        error: function() {
            showFeedback('Failed to save high score', 'error');
        }
    });
}

function getOrdinalSuffix(num) {
    if (num >= 11 && num <= 13) return 'th';
    switch (num % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Solution Modal Functions
function showSolutionModal(solutionMoves, description) {
    // Set the description
    $('#solution-description').text(description);
    
    // Clear previous moves
    $('#solution-moves-list').empty();
    
    // Add each move to the list
    solutionMoves.forEach((move, index) => {
        const moveElement = $(`<div class="solution-move">${index + 1}. ${move.toUpperCase()}</div>`);
        $('#solution-moves-list').append(moveElement);
    });
    
    // Show the modal
    $('#solution-modal').addClass('show');
}

function hideSolutionModal() {
    $('#solution-modal').removeClass('show');
}

function convertUCIToSAN(uciMove) {
    // Simple conversion for display purposes
    // This is a basic implementation - in a real app you'd use a chess library
    if (uciMove.length >= 4) {
        const from = uciMove.substring(0, 2).toUpperCase();
        const to = uciMove.substring(2, 4).toUpperCase();
        return `${from}-${to}`;
    }
    return uciMove.toUpperCase();
} 