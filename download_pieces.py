#!/usr/bin/env python3
"""
Download chess piece images for the chess puzzle game.
"""

import os
import urllib.request
from pathlib import Path

# Chess piece names
pieces = [
    'wK', 'wQ', 'wR', 'wB', 'wN', 'wP',  # White pieces
    'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'   # Black pieces
]

# Create directory if it doesn't exist
piece_dir = Path('static/img/chesspieces/wikipedia')
piece_dir.mkdir(parents=True, exist_ok=True)

# Download each piece
for piece in pieces:
    # Note: Still using chessboardjs.com URL as it hosts the Wikipedia-style pieces
    # This is separate from the chessboard2 library which we use for the board rendering
    url = f'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    filename = piece_dir / f'{piece}.png'
    
    print(f'Downloading {piece}.png...')
    try:
        urllib.request.urlretrieve(url, filename)
        print(f'✓ Downloaded {piece}.png')
    except Exception as e:
        print(f'✗ Failed to download {piece}.png: {e}')

print('\nDownload complete!') 