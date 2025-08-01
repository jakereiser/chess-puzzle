# Chess Puzzle Web Application

A fun and interactive web-based chess puzzle game that challenges players with randomly generated puzzles.

## Features
- **Massive Puzzle Database** - 10,000+ high-quality puzzles from Lichess
- **Interactive Chess Board** - Modern chessboard2 library with drag and drop pieces
- **Instant Feedback** - Immediate rewards and punishments
- **Progress Tracking** - Consecutive wins counter
- **Enhanced Celebration System** - Chess jokes, wisdom, and visual animations
- **Smart Hint System** - Get help with piece highlighting and guidance
- **Three Difficulty Modes** - Easy (unlimited hints), Hard (max 3 hints), and Hikaru (no hints)
- **Responsive Design** - Works on desktop and mobile
- **High-Quality Chess Pieces** - Wikipedia-style chess piece images
- **Rated Puzzles** - Puzzles with difficulty ratings from 400-3050+
- **Leaderboard System** - Track top 5 highest streaks for all difficulty modes

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

The puzzle database is optimized for caching performance with 5,000 high-quality puzzles. To set up the database:

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

4. **Reduce to 5,000 puzzles (optional, for better caching):**
   ```bash
   python reduce_puzzles.py
   ```

This creates `puzzles_combined.json` with 5,000 puzzles optimized for performance. The app will fall back to the original `puzzles.json` if the combined database is not available.

## How to Play
1. Click "New Puzzle" to start a challenge
2. Make the best moves to solve the puzzle
3. Use the "💡 Hint" button if you need help - it will highlight the piece to move
4. **Easy Mode**: Puzzles rated 400-1500 with unlimited hints available
5. **Hard Mode**: Puzzles rated 1500-2000 with maximum 3 hints (resets streak)
6. **Hikaru Mode**: Puzzles rated 1800-3050 with no hints allowed - ultimate challenge!
7. Solve puzzles to build your streak!
8. Enjoy the enhanced celebration messages with chess jokes and wisdom!

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