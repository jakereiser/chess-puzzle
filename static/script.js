// Chess Puzzle Web App JavaScript

let board = null;
let game = null;
let currentPuzzle = null;
let currentMode = 'easy'; // 'easy', 'hard', or 'hikaru'
let hintUsedTotal = false; // Track if hint was used in hard mode (one total)
let hintCount = 0; // Track hint count for hard mode (max 3)
let currentStreak = 0; // Track current streak for leaderboard

// Click-to-select variables
let selectedPiece = null;
let selectedSquare = null;

// Game state tracking
let puzzleFailed = false; // Track if current puzzle has been failed

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
    
    // Calculate responsive board size
    const boardSize = calculateBoardSize();
    
    const config = {
        draggable: true, // Enable dragging alongside click-to-select
        position: 'start',
        onDrop: onDrop,
        onDragStart: onDragStart,
        onMouseoverSquare: onMouseoverSquare,
        onMouseoutSquare: onMouseoutSquare,
        onMouseupSquare: onMouseupSquare,
        pieceTheme: '/static/img/chesspieces/wikipedia',
        orientation: 'white',
        showNotation: true,
        moveSpeed: 200,
        snapbackSpeed: 200,
        trashSpeed: 0, // Hide piece immediately when dragging starts
        width: boardSize,
        height: boardSize,
        // Mobile-specific settings
        showErrors: false,
        trashSpeed: 0,
        appearSpeed: 200,
        moveSpeed: 200,
        snapbackSpeed: 200
    };
    
    try {
        board = Chessboard2('chessboard', config);
        game = new Chess();
        
        // Simple board initialization
        setTimeout(function() {
            if (board) {
                board.setPosition('start');
                
                // Force initial resize to ensure proper sizing
                handleResize();
                
                // Also force Chessboard2 spacing override after board is ready
                setTimeout(function() {
                    forceChessboard2Spacing(calculateBoardSize());
                }, 100);
                
                // Add custom click event listeners to board squares
                setupCustomClickHandlers();
            }
        }, 200);
    } catch (error) {
        console.error('Error initializing chessboard2:', error);
    }
}

// Calculate responsive board size based on screen width
function calculateBoardSize() {
    const windowWidth = window.innerWidth;
    
    let size;
    // Desktop: 500px
    if (windowWidth > 768) {
        size = 500;
    }
    // Tablet: 280px
    else if (windowWidth > 480) {
        size = 280;
    }
    // Mobile: 250px
    else {
        size = 250;
    }
    
    return size;
}



// Force override Chessboard2 notation spacing with JavaScript
function forceChessboard2Spacing(boardSize) {
    // Calculate proportional spacing based on board size
    const bottomSpacing = Math.max(6, Math.floor(boardSize * 0.02)); // 2% of board size, minimum 6px
    const sideSpacing = Math.max(4, Math.floor(boardSize * 0.01)); // 1% of board size, minimum 4px
    
    // Force override the notation elements directly
    const notationFiles = document.querySelector('.notation-files-c3c0a');
    const notationRanks = document.querySelector('.notation-ranks-d3f97');
    
    if (notationFiles) {
        notationFiles.style.bottom = '-' + bottomSpacing + 'px';
        notationFiles.style.setProperty('bottom', '-' + bottomSpacing + 'px', 'important');
    }
    
    if (notationRanks) {
        notationRanks.style.right = '-' + sideSpacing + 'px';
        notationRanks.style.top = sideSpacing + 'px';
        notationRanks.style.setProperty('right', '-' + sideSpacing + 'px', 'important');
        notationRanks.style.setProperty('top', sideSpacing + 'px', 'important');
    }
    
}

// Handle window resize for responsive chessboard
function handleResize() {
    if (board) {
        const newSize = calculateBoardSize();
        
        // Force resize with explicit dimensions
        board.resize(newSize, newSize);
        
        // Also update the container CSS to ensure it matches
        const container = document.querySelector('.chess-board-container');
        if (container) {
            container.style.width = newSize + 'px';
            container.style.height = newSize + 'px';
            container.style.maxWidth = newSize + 'px';
            container.style.maxHeight = newSize + 'px';
        }
        
        // Update the coordinate labels container to match board size
        const coordinateLabels = document.querySelector('.coordinate-labels');
        if (coordinateLabels) {
            coordinateLabels.style.minHeight = newSize + 'px';
            coordinateLabels.style.height = newSize + 'px';
        }
        
        // Update the chessboard element itself
        const chessboardElement = document.getElementById('chessboard');
        if (chessboardElement) {
            chessboardElement.style.width = newSize + 'px';
            chessboardElement.style.height = newSize + 'px';
        }
        
        // Force override Chessboard2 notation spacing
        forceChessboard2Spacing(newSize);
        

    }
}

function setupEventListeners() {
    $('#new-puzzle-btn').click(function() {
        // Check if we need confirmation before loading new puzzle
        if (currentStreak > 0 && !puzzleFailed) {
            showConfirmationModal();
        } else {
            loadNewPuzzle();
        }
    });
    
    // Add debug button for testing
    if (typeof $ !== 'undefined') {
        $('<button id="debug-btn" class="btn btn-secondary" style="margin-left: 10px;">Debug Board</button>').insertAfter('#reset-game-btn');
        $('#debug-btn').click(function() {
            console.log('=== DEBUG BOARD STATE ===');
            console.log('Current puzzle:', currentPuzzle);
            console.log('Selected piece:', selectedPiece);
            console.log('Selected square:', selectedSquare);
            console.log('Game state:', game ? game.fen() : 'No game');
            console.log('Board position:', board ? board.position() : 'No board');
            console.log('Is mobile device:', 'ontouchstart' in window);
            console.log('========================');
        });
    }
    
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
    
    // Clear saved name button
    $('#clear-name-btn').click(function() {
        clearSavedPlayerName();
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
        
        // Confirmation modal event listeners
        $('#confirm-reset-btn').click(function() {
            hideConfirmationModal();
            // Reset the streak before loading new puzzle
            currentStreak = 0;
            $('#consecutive-wins').text('0');
            showFeedback('Streak reset! Starting fresh... 🔄', 'info');
            loadNewPuzzle();
        });
        
        $('#cancel-reset-btn').click(function() {
            hideConfirmationModal();
        });
        
        // Close confirmation modal when clicking outside
        $('#confirmation-modal').click(function(e) {
            if (e.target === this) {
                hideConfirmationModal();
            }
        });
        
        // Handle window resize for responsive chessboard
        $(window).resize(function() {
            handleResize();
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
                
                // Add safety check before setting board position
                if (board && typeof board.setPosition === 'function') {
                    try {
                        board.setPosition(response.fen);
                    } catch (error) {
                        console.warn('Error setting board position:', error);
                        // Retry after a short delay
                        setTimeout(function() {
                            if (board && typeof board.setPosition === 'function') {
                                try {
                                    board.setPosition(response.fen);
                                } catch (retryError) {
                                    console.warn('Retry failed:', retryError);
                                }
                            }
                        }, 100);
                    }
                }
                
                // Set board orientation based on player color
                if (response.player_color === 'black') {
                    if (board && typeof board.config === 'function') {
                        board.config({ orientation: 'black' });
                    }
                    // Flip coordinate labels for black orientation
                    flipCoordinateLabels();
                } else {
                    if (board && typeof board.config === 'function') {
                        board.config({ orientation: 'white' });
                    }
                    // Reset coordinate labels for white orientation
                    resetCoordinateLabels();
                }
                
                // Enable dragging for the puzzle with proper animation settings
                if (board && typeof board.config === 'function') {
                    board.config({ 
                        draggable: true, // Enable dragging alongside click-to-select functionality
                        moveSpeed: 200,
                        snapbackSpeed: 200,
                        trashSpeed: 0 // Hide piece immediately when dragging starts
                    });
                }
                
                // Ensure board is properly sized after position change
                setTimeout(function() {
                    if (board) {
                        // Board updated
                    }
                }, 100); // Increased delay for better stability
                
                // Update UI
                $('#puzzle-description').text(response.description);
                $('#moves-required').text(`Moves required: ${response.moves_required}`);
                
                // Clear any hint highlighting
                clearHintHighlight();
                // Only clear feedback messages that are older than 1 second to avoid interrupting new messages
                setTimeout(function() {
                    $('#feedback-message').removeClass('show');
                }, 1000);
                
                // Clear any piece selection for new puzzle
                deselectPiece();
                
                // Reset puzzle failed state for new puzzle
                puzzleFailed = false;
                
                // Re-setup custom click handlers for new puzzle
                setupCustomClickHandlers();
                
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

// Setup custom click handlers for board squares
function setupCustomClickHandlers() {
    console.log('Setting up custom click handlers...');
    
    // Click detection is handled through Chessboard2 callbacks:
    // - onDrop for piece clicks (source === target)
    // - onMouseupSquare for empty square clicks when piece is selected
    
    // Add mobile touch event handling
    const chessboardElement = document.getElementById('chessboard');
    if (chessboardElement) {
        console.log('Chessboard element found, setting up touch handlers');
        
        // Variables to track touch state
        let touchStartTime = 0;
        let touchStartSquare = null;
        let touchStartPiece = null;
        let touchMoved = false;
        
        // Handle touch start
        chessboardElement.addEventListener('touchstart', function(e) {
            console.log('Touch start event triggered');
            e.preventDefault(); // Prevent default touch behavior
            
            const touch = e.touches[0];
            console.log('Touch coordinates:', touch.clientX, touch.clientY);
            
            // Try to find the actual square element more accurately
            const squareElement = findSquareElementAtCoordinates(touch.clientX, touch.clientY);
            console.log('Square element found:', squareElement);
            
            if (squareElement) {
                const square = getSquareFromElement(squareElement);
                const piece = getPieceFromElement(squareElement);
                
                console.log('Square:', square, 'Piece:', piece);
                
                if (square) {
                    touchStartTime = Date.now();
                    touchStartSquare = square;
                    touchStartPiece = piece;
                    touchMoved = false;
                    console.log('Touch start on square:', square, 'piece:', piece);
                }
            }
        }, { passive: false });
        
        // Handle touch move to detect if user is dragging
        chessboardElement.addEventListener('touchmove', function(e) {
            if (touchStartTime > 0) {
                touchMoved = true;
                console.log('Touch moved - treating as drag');
            }
        }, { passive: false });
        
        // Handle touch end
        chessboardElement.addEventListener('touchend', function(e) {
            console.log('Touch end event triggered');
            e.preventDefault();
            
            if (touchStartTime > 0 && !touchMoved) {
                const touch = e.changedTouches[0];
                console.log('Touch end coordinates:', touch.clientX, touch.clientY);
                
                // Try to find the actual square element more accurately
                const squareElement = findSquareElementAtCoordinates(touch.clientX, touch.clientY);
                console.log('Square element at touch end:', squareElement);
                
                if (squareElement) {
                    const square = getSquareFromElement(squareElement);
                    const piece = getPieceFromElement(squareElement);
                    
                    console.log('Touch end - Square:', square, 'Piece:', piece);
                    
                    if (square && touchStartSquare) {
                        const touchDuration = Date.now() - touchStartTime;
                        console.log('Touch duration:', touchDuration, 'ms');
                        
                        // Only handle as click if touch duration is short (not a drag)
                        if (touchDuration < 300) {
                            console.log('Touch end - handling as click on square:', square, 'piece:', piece);
                            // Handle the touch as a click
                            handleCustomClick(square, piece);
                        } else {
                            console.log('Touch duration too long, ignoring');
                        }
                    }
                } else {
                    // Fallback: try to use the board's position to determine the square
                    console.log('No square element found, trying fallback approach');
                    const boardRect = chessboardElement.getBoundingClientRect();
                    const x = touch.clientX - boardRect.left;
                    const y = touch.clientY - boardRect.top;
                    const squareSize = boardRect.width / 8;
                    const file = Math.floor(x / squareSize);
                    const rank = 7 - Math.floor(y / squareSize); // Flip for chess coordinates
                    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
                    
                    if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
                        const square = files[file] + ranks[rank];
                        const position = board.position();
                        const piece = position[square] || null;
                        
                        console.log('Fallback - calculated square:', square, 'piece:', piece);
                        handleCustomClick(square, piece);
                    }
                }
            }
            
            // Reset touch state
            touchStartTime = 0;
            touchStartSquare = null;
            touchStartPiece = null;
            touchMoved = false;
        }, { passive: false });
        
        // Add click event listener as fallback for mobile devices
        chessboardElement.addEventListener('click', function(e) {
            console.log('Click event triggered on chessboard');
            // Only handle if this is a mobile device and touch events might not work
            if ('ontouchstart' in window) {
                console.log('Mobile device detected, using click fallback');
                const element = e.target;
                console.log('Click target element:', element);
                
                const squareElement = findSquareElement(element);
                console.log('Square element from click:', squareElement);
                
                if (squareElement) {
                    const square = getSquareFromElement(squareElement);
                    const piece = getPieceFromElement(squareElement);
                    
                    console.log('Click fallback on square:', square, 'piece:', piece);
                    if (square) {
                        handleCustomClick(square, piece);
                    }
                }
            }
        });
        
        // Also add mousedown/mouseup events as additional fallback
        chessboardElement.addEventListener('mousedown', function(e) {
            console.log('Mouse down event on chessboard');
            if ('ontouchstart' in window) {
                const element = e.target;
                const squareElement = findSquareElement(element);
                if (squareElement) {
                    const square = getSquareFromElement(squareElement);
                    const piece = getPieceFromElement(squareElement);
                    console.log('Mouse down on square:', square, 'piece:', piece);
                }
            }
        });
        
        chessboardElement.addEventListener('mouseup', function(e) {
            console.log('Mouse up event on chessboard');
            if ('ontouchstart' in window) {
                const element = e.target;
                const squareElement = findSquareElement(element);
                if (squareElement) {
                    const square = getSquareFromElement(squareElement);
                    const piece = getPieceFromElement(squareElement);
                    console.log('Mouse up on square:', square, 'piece:', piece);
                    if (square) {
                        handleCustomClick(square, piece);
                    }
                }
            }
        });
    } else {
        console.error('Chessboard element not found!');
    }
}

// Helper functions for mobile touch handling
function findSquareElement(element) {
    console.log('findSquareElement called with:', element);
    
    // Traverse up the DOM to find a square element
    let current = element;
    let depth = 0;
    while (current && current !== document.body && depth < 10) {
        console.log('Checking element at depth', depth, ':', current.tagName, 'classes:', current.className);
        
        if (current.classList.contains('square-55d63') || 
            current.hasAttribute('data-square') ||
            current.classList.contains('square')) {
            console.log('Found square element:', current);
            return current;
        }
        
        // Also check for Chessboard2 specific square classes
        const classes = current.className.split(' ');
        for (let className of classes) {
            // Look for square-XXXXX pattern (where XXXXX is any 4-6 characters)
            if (className.startsWith('square-') && (className.length >= 10 && className.length <= 12)) {
                console.log('Found square element by class:', current);
                return current;
            }
        }
        current = current.parentElement;
        depth++;
    }
    console.log('No square element found');
    return null;
}

// New function to find square element at specific coordinates
function findSquareElementAtCoordinates(x, y) {
    console.log('Finding square element at coordinates:', x, y);
    
    // Get all elements at the point
    const elements = document.elementsFromPoint(x, y);
    console.log('All elements at point:', elements);
    
    // Look for square elements in the list
    for (let element of elements) {
        console.log('Checking element:', element.tagName, 'classes:', element.className);
        
        // Check if this is a chess square element
        if (element.classList.contains('square-55d63') || 
            element.hasAttribute('data-square') ||
            element.classList.contains('square')) {
            console.log('Found square element:', element);
            return element;
        }
        
        // Also check for Chessboard2 specific square classes
        const classes = element.className.split(' ');
        for (let className of classes) {
            console.log('Checking class:', className, 'length:', className.length);
            // Look for square-XXXXX pattern (where XXXXX is any 4-6 characters)
            if (className.startsWith('square-') && (className.length >= 10 && className.length <= 12)) {
                console.log('Found square element by class:', element);
                return element;
            }
        }
    }
    
    console.log('No square element found at coordinates');
    return null;
}

function getSquareFromElement(element) {
    console.log('getSquareFromElement called with:', element);
    
    // Try to get square from data-square-coord attribute first (new Chessboard2 format)
    if (element.hasAttribute('data-square-coord')) {
        const square = element.getAttribute('data-square-coord');
        console.log('Found square from data-square-coord:', square);
        return square;
    }
    
    // Try to get square from data-square attribute (old format)
    if (element.hasAttribute('data-square')) {
        const square = element.getAttribute('data-square');
        console.log('Found square from data-square:', square);
        return square;
    }
    
    // Try to get from class name (Chessboard2 format)
    const classes = element.className.split(' ');
    for (let className of classes) {
        if (className.startsWith('square-') && className.length === 9) {
            const square = className.substring(7, 9); // Extract square from "square-55d63"
            console.log('Found square from class name:', square);
            return square;
        }
    }
    
    // Try to get from parent elements that might have the square data
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
        if (parent.hasAttribute('data-square-coord')) {
            const square = parent.getAttribute('data-square-coord');
            console.log('Found square from parent data-square-coord:', square);
            return square;
        }
        if (parent.hasAttribute('data-square')) {
            const square = parent.getAttribute('data-square');
            console.log('Found square from parent data-square:', square);
            return square;
        }
        const parentClasses = parent.className.split(' ');
        for (let className of parentClasses) {
            if (className.startsWith('square-') && className.length === 9) {
                const square = className.substring(7, 9);
                console.log('Found square from parent class name:', square);
                return square;
            }
        }
        parent = parent.parentElement;
    }
    
    console.log('No square found in element');
    return null;
}

function getPieceFromElement(element) {
    console.log('getPieceFromElement called with:', element);
    
    // Check if there's a piece image in this element
    const pieceImg = element.querySelector('img');
    if (pieceImg) {
        // Extract piece info from the image src or alt attribute
        const src = pieceImg.src;
        console.log('Found piece image with src:', src);
        if (src.includes('wikipedia')) {
            // Extract piece type from filename (e.g., "wK.png" -> "wK")
            const filename = src.split('/').pop();
            const piece = filename.replace('.png', '');
            console.log('Extracted piece from filename:', piece);
            return piece;
        }
    }
    
    // Also check parent elements for piece images
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
        const pieceImg = parent.querySelector('img');
        if (pieceImg) {
            const src = pieceImg.src;
            console.log('Found piece image in parent with src:', src);
            if (src.includes('wikipedia')) {
                const filename = src.split('/').pop();
                const piece = filename.replace('.png', '');
                console.log('Extracted piece from parent filename:', piece);
                return piece;
            }
        }
        parent = parent.parentElement;
    }
    
    // If no piece image found, try to get piece from board position
    const square = getSquareFromElement(element);
    if (square && board && board.position) {
        const position = board.position();
        const piece = position[square] || null;
        console.log('Got piece from board position for square', square, ':', piece);
        return piece;
    }
    
    console.log('No piece found in element');
    return null;
}

// Handle custom click logic
function handleCustomClick(square, piece) {
    // Validate square parameter
    if (!square || typeof square !== 'string' || square.length !== 2) {
        console.log('Invalid square:', square);
        return;
    }
    
    // Prevent moves if puzzle has failed
    if (puzzleFailed) {
        return;
    }
    
    console.log('handleCustomClick called with square:', square, 'piece:', piece);
    
    // If no piece is selected, try to select a piece
    if (!selectedPiece) {
        if (piece) {
            // Check if this is a valid piece for the current player
            const pieceColor = piece.charAt(0);
            const expectedColor = currentPuzzle.playerColor === 'white' ? 'w' : 'b';
            
            console.log('Piece color:', pieceColor, 'Expected color:', expectedColor);
            
            if (pieceColor === expectedColor) {
                // Select this piece
                selectedPiece = piece;
                selectedSquare = square;
                highlightSquare(square, true); // Use selected piece highlighting
                console.log('Piece selected:', piece, 'on square:', square);
            } else {
                console.log('Invalid piece color for current player');
            }
        } else {
            console.log('No piece on square:', square);
        }
    } else {
        // A piece is already selected, try to move it
        if (square === selectedSquare) {
            // Clicked the same square, deselect
            console.log('Deselecting piece on same square');
            deselectPiece();
        } else {
            // Try to move the selected piece to the new square
            console.log('Attempting move from', selectedSquare, 'to', square);
            
            // Use the same logic as onDrop - create a fake drop data object
            const dropData = {
                source: selectedSquare,
                target: square,
                piece: selectedPiece
            };
            
            // Call onDrop with the fake data to use the same move logic
            const result = onDrop(dropData);
            
            // Clear selection after the move attempt
            deselectPiece();
        }
    }
}

// Deselect the currently selected piece
function deselectPiece() {
    if (selectedSquare) {
        // Clear the selected piece highlight specifically - use multiple selectors
        $(`.square-${selectedSquare}`).removeClass('selected-piece');
        $(`[data-square="${selectedSquare}"]`).removeClass('selected-piece');
        $(`[data-square-coord="${selectedSquare}"]`).removeClass('selected-piece');
        // Also remove from any element that might have the class
        $('.selected-piece').removeClass('selected-piece');
        selectedPiece = null;
        selectedSquare = null;
    }
}

// Global variables for click detection
let clickStartTime = 0;
let clickStartSquare = null;
let isDragging = false;
let dragStartTime = 0;

function onDragStart(data) {
    // Record drag start time and square
    dragStartTime = Date.now();
    isDragging = true;
    
    // Only allow dragging if there's an active puzzle
    if (!currentPuzzle) {
        return false;
    }
    
    // Prevent dragging if puzzle has failed
    if (puzzleFailed) {
        return false;
    }
    
    // For click-to-select: allow clicking on any piece
    // For drag-and-drop: only allow dragging pieces that belong to the current player
    const pieceColor = data.piece.charAt(0);
    const expectedColor = currentPuzzle.playerColor === 'white' ? 'w' : 'b';
    
    if (pieceColor !== expectedColor) {
        // Allow the drag to start (for click detection) but it will be handled as a click in onDrop
        return true;
    }
    
    return true;
}

function onMouseoverSquare(square, piece) {
    // This can be used for hover effects if needed
}

function onMouseoutSquare(square, piece) {
    // This can be used for hover effects if needed
}

function onMouseupSquare(square, piece) {
    // Handle clicks on empty squares when a piece is selected
    if (!currentPuzzle || puzzleFailed) {
        console.log('onMouseupSquare: No current puzzle or puzzle failed');
        return;
    }
    
    // Extract the actual square string from the data object
    let actualSquare = square;
    let actualPiece = piece;
    
    // If square is an object (Chessboard2 data), extract the square property
    if (typeof square === 'object' && square !== null) {
        actualSquare = square.square;
        actualPiece = square.piece;
    }
    
    console.log('onMouseupSquare called with square:', actualSquare, 'piece:', actualPiece);
    console.log('Current selected piece:', selectedPiece, 'on square:', selectedSquare);
    
    // Handle all cases for mobile compatibility
    if (selectedPiece && selectedSquare) {
        // We have a piece selected
        if (actualSquare === selectedSquare) {
            // Clicked the same square, deselect
            console.log('Clicked same square, deselecting');
            deselectPiece();
        } else if (actualSquare) {
            // Clicked a different square, try to move
            console.log('Attempting move from', selectedSquare, 'to', actualSquare);
            handleCustomClick(actualSquare, actualPiece);
        }
    } else if (actualPiece) {
        // No piece selected, but clicked on a piece - select it
        console.log('No piece selected, selecting piece on', actualSquare);
        handleCustomClick(actualSquare, actualPiece);
    } else if (actualSquare) {
        // No piece selected, clicked on empty square - do nothing
        console.log('Clicked on empty square', actualSquare, 'with no piece selected');
    }
}



function onDrop(data) {
    // Reset dragging state
    isDragging = false;
    
    console.log('onDrop called with source:', data.source, 'target:', data.target);
    
    // Handle clicks (same square) and drags (different squares)
    if (data.source === data.target) {
        // Get the piece information
        const position = board.position();
        const piece = position[data.source] || null;
        
        console.log('Same square click detected, piece:', piece);
        
        // Handle as a click for piece selection
        handleCustomClick(data.source, piece);
        return 'snapback'; // Don't actually move the piece
    }
    
    // This was a real drag - check if the move is legal according to chess rules
    const move = game.move({
        from: data.source,
        to: data.target,
        promotion: 'q' // Always promote to queen for simplicity
    });
    
    if (move === null) {
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
    
    // Convert to UCI notation for API
    let source = data.source;
    let target = data.target;
    
    let moveUCI = source + target;
    if (move.promotion) {
        moveUCI += move.promotion;
    }
    
    // Clear any selected piece highlighting when move is made via drag-and-drop
    deselectPiece();
    
    // Send move to server for puzzle validation
    makeMove(moveUCI);
    
    return null; // Allow the move
}

function makeMove(moveUCI) {
    // Prevent moves if puzzle has failed
    if (puzzleFailed) {
        return;
    }
    
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
                        // Update the chess.js game state
                        game = new Chess(response.current_fen);
                        
                        // Update the board display with safety check
                        if (board && typeof board.setPosition === 'function') {
                            try {
                                board.setPosition(response.current_fen);
                            } catch (error) {
                                console.warn('Error updating board after black move:', error);
                            }
                        }
                        
                        // Update the current puzzle FEN
                        if (currentPuzzle) {
                            currentPuzzle.fen = response.current_fen;
                        }
                    }
                }
            } else {
                // Wrong move - streak is broken
                puzzleFailed = true; // Mark puzzle as failed
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
        // Use 3 seconds for all messages as requested
        setTimeout(function() {
            feedbackElement.removeClass('show');
        }, 3000);
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
                if (board && typeof board.setPosition === 'function') {
                    try {
                        board.setPosition('start');
                    } catch (error) {
                        console.warn('Error resetting board position:', error);
                    }
                }
                if (board && typeof board.config === 'function') {
                    board.config({ 
                        draggable: false, // Disable dragging
                        orientation: 'white' // Reset to white orientation
                    });
                }
                currentPuzzle = null;
                
                // Reset coordinate labels to default
                resetCoordinateLabels();
                
                // Reset hint usage but maintain current mode
                hintUsedTotal = false;
                hintCount = 0; // Reset hint count
                currentStreak = 0; // Reset current streak
                puzzleFailed = false; // Reset puzzle failed state
                
                // Maintain current mode selection (don't reset to 'easy')
                $('.btn-mode').removeClass('btn-mode-active btn-mode-disabled');
                $(`#${currentMode}-mode-btn`).addClass('btn-mode-active');
                
                // Re-apply mode restrictions
                if (currentMode === 'hard' || currentMode === 'hikaru') {
                    $('#easy-mode-btn').addClass('btn-mode-disabled');
                }
                if (currentMode === 'hikaru') {
                    $('#hard-mode-btn').addClass('btn-mode-disabled');
                }
                
                updateHintButtonState();
                
                // Clear any hint highlighting
                clearHintHighlight();
                // Only clear feedback messages that are older than 1 second to avoid interrupting new messages
                setTimeout(function() {
                    $('#feedback-message').removeClass('show');
                }, 1000);
                
                // Clear any piece selection
                deselectPiece();
                
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
    
    // Store the old mode before changing
    const oldMode = currentMode;
    
    // Reset consecutive wins when changing difficulty modes
    if (currentMode !== mode) {
        currentStreak = 0;
        $('#consecutive-wins').text('0'); // Update display immediately
        showFeedback('Difficulty changed - streak reset to 0! 🔄', 'info');
    } else if (currentStreak > 0) {
        // Also reset streak if switching to same mode but have a streak
        currentStreak = 0;
        $('#consecutive-wins').text('0'); // Update display immediately
        showFeedback('Mode reselected - streak reset to 0! 🔄', 'info');
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
    
    // Load new puzzle if there's an active puzzle and mode changed
    if (currentPuzzle && oldMode !== mode) {
        loadNewPuzzle(); // Load puzzle matching the new difficulty
    }
    
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
                // Deselect any currently selected piece before showing hint
                deselectPiece();
                
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

function highlightSquare(square, isSelected = false) {
    // Add highlight class to the square - try multiple selectors
    const squareElement = $(`.square-${square}, [data-square="${square}"], [data-square-coord="${square}"]`);
    if (squareElement.length) {
        if (isSelected) {
            // For selection, clear hint highlight first, then add selection highlight
            squareElement.removeClass('hint-highlight');
            squareElement.addClass('selected-piece');
        } else {
            // For hint highlighting, only add if no piece is currently selected
            if (!selectedPiece) {
                squareElement.addClass('hint-highlight');
                
                // Remove hint highlight after 3 seconds
                setTimeout(function() {
                    // Only clear hint highlight if no piece is selected
                    if (!selectedPiece) {
                        squareElement.removeClass('hint-highlight');
                    }
                }, 3000);
            }
        }
    }
}

function clearHintHighlight() {
    // Only clear hint highlights, don't clear selected piece highlights
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
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    $.ajax({
        url: `/api/leaderboard?t=${timestamp}`,
        method: 'GET',
        cache: false, // Prevent browser caching
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'If-None-Match': '', // Force fresh data
            'If-Modified-Since': '' // Force fresh data
        },
        timeout: 10000, // 10 second timeout
        success: function(response) {
            if (response.success) {
                updateLeaderboardDisplay(response.leaderboard);
            } else {
                console.error('Leaderboard response error:', response.error);
                // Retry once after a delay
                setTimeout(function() {
                    loadLeaderboard();
                }, 2000);
            }
        },
        error: function(xhr, status, error) {
            console.error('Failed to load leaderboard:', status, error);
            // Retry once after a delay
            setTimeout(function() {
                loadLeaderboard();
            }, 2000);
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
    // Load saved player name from localStorage
    const savedPlayerName = localStorage.getItem('chess_puzzle_player_name');
    $('#player-name-input').val(savedPlayerName || '');
    
    $('#high-score-modal').show();
    
    // Store the score data for when user saves
    $('#high-score-modal').data('score-data', { mode: mode, score: score });
}

function hideHighScoreModal() {
    $('#high-score-modal').hide();
}

function clearSavedPlayerName() {
    localStorage.removeItem('chess_puzzle_player_name');
    $('#player-name-input').val('');
    showFeedback('Saved name cleared!', 'info');
}

function saveHighScore() {
    const scoreData = $('#high-score-modal').data('score-data');
    const playerName = $('#player-name-input').val().trim();
    
    // Save player name to localStorage for future use
    if (playerName) {
        localStorage.setItem('chess_puzzle_player_name', playerName);
    }
    
    $.ajax({
        url: '/api/add-score',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            mode: scoreData.mode,
            score: scoreData.score,
            player_name: playerName || null
        }),
        timeout: 15000, // 15 second timeout
        success: function(response) {
            if (response.success) {
                hideHighScoreModal();
                
                // Add delay before refreshing leaderboard to ensure data is saved
                setTimeout(function() {
                    loadLeaderboard(); // Refresh leaderboard
                }, 500);
                
                const message = response.is_new_high_score 
                    ? `🏆 New #1 High Score! (${response.position}${getOrdinalSuffix(response.position)})` 
                    : `🏆 High Score! (${response.position}${getOrdinalSuffix(response.position)})`;
                
                showFeedback(message, 'success');
            } else {
                showFeedback('Failed to save high score: ' + (response.error || 'Unknown error'), 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Failed to save high score:', status, error);
            showFeedback('Failed to save high score. Please try again.', 'error');
            
            // Retry once after a delay
            setTimeout(function() {
                saveHighScore();
            }, 3000);
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

// Confirmation Modal Functions
function showConfirmationModal() {
    // Update the message to show current streak
    const message = `You have a ${currentStreak} consecutive win streak going! Resetting the puzzle will clear your streak. Are you sure you want to do this?`;
    $('#confirmation-message').text(message);
    
    // Show the modal
    $('#confirmation-modal').addClass('show');
}

function hideConfirmationModal() {
    $('#confirmation-modal').removeClass('show');
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