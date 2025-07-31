# Chess Puzzle Web Application

A fun and interactive web-based chess puzzle game that challenges players with randomly generated puzzles.

## Features
- 🎯 **Random Puzzle Generation** - New puzzles on every refresh
- 🎮 **Interactive Chess Board** - Modern chessboard2 library with drag and drop pieces
- ⚡ **Instant Feedback** - Immediate rewards and punishments
- 🏆 **Progress Tracking** - Consecutive wins counter
- 🎉 **Celebration System** - Fun messages and animations
- 💡 **Hint System** - Get help with piece highlighting and guidance
- 📱 **Responsive Design** - Works on desktop and mobile
- ♟️ **High-Quality Chess Pieces** - Wikipedia-style chess piece images

## Getting Started

### Prerequisites
- Python 3.8+
- pip

### Installation
```bash
pip install -r requirements.txt
```

### Running the Web Application
```bash
python app.py
```

Then open your browser and go to: `http://localhost:5000`

## Project Structure
```
chess-puzzle/
├── README.md
├── requirements.txt
├── app.py                 # Flask web application
├── main.py               # Original CLI version
├── templates/
│   └── index.html        # Main web interface
├── static/
│   ├── style.css         # Modern CSS styling
│   ├── script.js         # Frontend JavaScript
│   ├── css/
│   │   └── chessboard2.min.css  # Chessboard2 styles
│   ├── js/
│   │   └── chessboard2.min.js   # Chessboard2 library
│   └── img/
│       └── chesspieces/
│           └── wikipedia/        # Chess piece images
├── src/
│   ├── __init__.py
│   ├── board.py          # Chess board logic
│   └── puzzle.py         # Puzzle handling
└── tests/
    ├── __init__.py
    └── test_board.py
```

## How to Play
1. Click "New Puzzle" to start a challenge
2. Make the best moves to solve the puzzle
3. Use the "💡 Hint" button if you need help - it will highlight the piece to move
4. Wrong moves reset your consecutive wins
5. Solve puzzles to build your streak!
6. Enjoy the celebration messages! 🎉

## API Endpoints
- `GET /` - Main game page
- `POST /api/new-puzzle` - Generate new puzzle
- `POST /api/make-move` - Process player move
- `POST /api/get-hint` - Get hint for current puzzle
- `GET /api/game-stats` - Get game statistics
- `POST /api/reset-game` - Reset game state

## Technical Details
- **Frontend Library**: Chessboard2 (modern, mobile-friendly chess board)
- **Chess Pieces**: Wikipedia-style images from chessboardjs.com
- **Backend**: Flask with python-chess for game logic
- **Styling**: Modern CSS with responsive design

## Contributing
Feel free to contribute to this project by creating issues or pull requests. 