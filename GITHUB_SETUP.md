# GitHub Leaderboard Setup

This guide will help you set up the leaderboard to save scores directly to your GitHub repository, so they persist across deployments.

## Step 1: Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name like "Chess Puzzle Leaderboard"
4. Select these scopes:
   - `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token** - you won't see it again!

## Step 2: Add Environment Variables

### For Local Development:
Create a `.env` file in your project root:
```
GITHUB_TOKEN=your_token_here
GITHUB_REPO=jakereiser/chess-puzzle
```

### For Production (Heroku/Railway/etc.):
Add these environment variables in your hosting platform:

- `GITHUB_TOKEN`: Your GitHub personal access token
- `GITHUB_REPO`: Your repository name (e.g., `jakereiser/chess-puzzle`)

## Step 3: Test the Setup

1. Start your app
2. Make a high score
3. Check your GitHub repository - you should see the `leaderboard.json` file updated with a commit message like "Update leaderboard - 2025-08-06 15:30:45"

## How It Works

- **Local development**: Still uses `leaderboard_local.json` (ignored by git)
- **Production**: Saves to GitHub repository via API, then falls back to local file if GitHub fails
- **Data persistence**: Leaderboard data is now stored in your GitHub repository and survives server restarts

## Troubleshooting

- **Token not working**: Make sure the token has `repo` permissions
- **Repository not found**: Check that `GITHUB_REPO` is in the format `username/repository-name`
- **Permission denied**: Ensure the token has access to the repository

## Security Notes

- Never commit your GitHub token to the repository
- Use environment variables to store sensitive data
- The token only has access to the specific repository you specify 