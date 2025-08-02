# Chess Puzzle App - Render Deployment Guide

## Render Standard Plan (512 MB RAM, 0.5 CPU)

This app is optimized for Render's standard plan and should run efficiently.

### Requirements Analysis:
- **Memory Usage**: ~50-100 MB (Flask + Python-chess)
- **CPU Usage**: Low (chess calculations are lightweight)
- **Storage**: ~10 MB (app + static files)
- **Network**: Minimal (JSON API responses)

### Deployment Steps:

1. **Connect GitHub Repository**
   - Link your GitHub repo to Render
   - Select the `chess-puzzle` directory

2. **Environment Variables** (Optional):
   ```
   FLASK_DEBUG=False
   SECRET_KEY=your-secret-key-here
   ```

3. **Build Command**: `pip install -r requirements.txt`

4. **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

### Performance Optimizations:
- ✅ Removed unnecessary dependencies (numpy, pygame, pytest)
- ✅ Added gunicorn for production WSGI server
- ✅ Optimized for low memory usage
- ✅ Rate limiting prevents abuse
- ✅ Static files served efficiently

### Expected Performance:
- **Cold Start**: ~10-15 seconds
- **Response Time**: <100ms for API calls
- **Concurrent Users**: 10-20 simultaneous users
- **Memory Usage**: ~80-120 MB under load

### Monitoring:
- Check Render logs for any startup issues
- Monitor memory usage in Render dashboard
- Set up alerts for high CPU/memory usage

### Cost Estimate:
- **Render Standard**: $7/month
- **Bandwidth**: Included in plan
- **SSL**: Free with Render

### Scaling:
If you need more capacity later:
- **Render Pro**: $25/month (1GB RAM, 1 CPU)
- **Render Advanced**: $50/month (2GB RAM, 2 CPU) 