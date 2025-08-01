# Chess Puzzle Web Application

A fun and interactive web-based chess puzzle game that challenges players with randomly generated puzzles.

## Features
- 🎯 **Massive Puzzle Database** - 10,000+ high-quality puzzles from Lichess
- 🎮 **Interactive Chess Board** - Modern chessboard2 library with drag and drop pieces
- ⚡ **Instant Feedback** - Immediate rewards and punishments
- 🏆 **Progress Tracking** - Consecutive wins counter
- 🎉 **Enhanced Celebration System** - Chess jokes, wisdom, and visual animations
- 💡 **Smart Hint System** - Get help with piece highlighting and guidance
- 🎚️ **Difficulty Modes** - Easy mode (unlimited hints) and Hard mode (one hint total)
- 📱 **Responsive Design** - Works on desktop and mobile
- ♟️ **High-Quality Chess Pieces** - Wikipedia-style chess piece images
- 🏅 **Rated Puzzles** - Puzzles with difficulty ratings from 800-2500+
- 🏆 **Leaderboard System** - Track top 5 highest streaks for both Easy and Hard modes

## Getting Started

### Prerequisites
- Python 3.8+
- pip

### Installation
```bash
pip install -r requirements.txt
```

### Running the Web Application

**Development:**
```bash
python app.py
```

**Production:**
```bash
export FLASK_ENV=production
export SECRET_KEY=your-secure-secret-key-here
python app.py
```

Then open your browser and go to: `http://localhost:5000`

### Security Configuration

For production deployment, set these environment variables:
- `SECRET_KEY`: A secure random string for session encryption
- `FLASK_ENV`: Set to 'production' for production mode
- `HOST`: Server host (default: 127.0.0.1)
- `PORT`: Server port (default: 5000)

## Project Structure
```
chess-puzzle/
├── README.md
├── requirements.txt
├── app.py                 # Flask web application
├── main.py               # Original CLI version
├── puzzles.json           # Original puzzle database
├── parse_lichess.py      # Lichess CSV parser
├── merge_puzzles.py      # Puzzle database merger
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

## Database Setup

The large puzzle database files are not included in the repository due to size constraints. To set up the full database:

1. **Download the Lichess puzzle database:**
   ```bash
   wget https://database.lichess.org/lichess_db_puzzle.csv.zst
   zstd -d lichess_db_puzzle.csv.zst
   ```

2. **Parse the CSV file:**
   ```bash
   python parse_lichess.py
   ```

3. **Merge with existing puzzles:**
   ```bash
   python merge_puzzles.py
   ```

This will create `puzzles_combined.json` with 10,000+ puzzles. The app will fall back to the original `puzzles.json` if the combined database is not available.

## How to Play
1. Click "New Puzzle" to start a challenge
2. Make the best moves to solve the puzzle
3. Use the "💡 Hint" button if you need help - it will highlight the piece to move
4. **Easy Mode**: Puzzles rated up to 1800 with unlimited hints available
5. **Hard Mode**: Puzzles rated 1200+ with only one hint total - use it wisely! Switching to Hard mode is permanent
6. Solve puzzles to build your streak!
7. Enjoy the enhanced celebration messages with chess jokes and wisdom! 🎉

## API Endpoints
- `GET /` - Main game page
- `POST /api/new-puzzle` - Generate new puzzle
- `POST /api/make-move` - Process player move
- `POST /api/get-hint` - Get hint for current puzzle
- `GET /api/game-stats` - Get game statistics
- `POST /api/reset-game` - Reset game state
- `GET /api/leaderboard` - Get leaderboard data
- `POST /api/check-high-score` - Check if score qualifies for leaderboard
- `POST /api/add-score` - Add score to leaderboard

## Technical Details
- **Frontend Library**: Chessboard2 (modern, mobile-friendly chess board)
- **Chess Pieces**: Wikipedia-style images from chessboardjs.com
- **Backend**: Flask with python-chess for game logic
- **Styling**: Modern CSS with responsive design

## Contributing
Feel free to contribute to this project by creating issues or pull requests. 