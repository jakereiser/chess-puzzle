# Chess Puzzle App - Deployment Guide

## 🚀 Quick Deploy Options

### **Option 1: Render (Recommended - Free)**

1. **Sign up** at [render.com](https://render.com)
2. **Connect your GitHub** account
3. **Create a new Web Service**
4. **Select your repository** (chess-puzzle)
5. **Configure**:
   - **Name**: chess-puzzle-app
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
6. **Deploy** - Your app will be live in minutes!

### **Option 2: Railway (Free Tier)**

1. **Sign up** at [railway.app](https://railway.app)
2. **Connect GitHub** and select your repo
3. **Auto-deploys** - no configuration needed!
4. **Get your URL** instantly

### **Option 3: Heroku ($5/month)**

1. **Sign up** at [heroku.com](https://heroku.com)
2. **Install Heroku CLI**
3. **Run commands**:
   ```bash
   heroku create chess-puzzle-app
   git push heroku main
   heroku open
   ```

## 📁 Files Ready for Deployment

✅ `app.py` - Main Flask application  
✅ `requirements.txt` - Python dependencies  
✅ `Procfile` - Tells hosting platform how to run the app  
✅ `static/` - CSS, JS, and chess piece images  
✅ `templates/` - HTML templates  
✅ `src/` - Chess logic modules  

## 🔧 Environment Variables (Optional)

If you want to customize:
- `FLASK_ENV=production`
- `PORT=5000` (usually auto-detected)

## 🌐 After Deployment

Your app will be available at:
- **Render**: `https://your-app-name.onrender.com`
- **Railway**: `https://your-app-name.railway.app`
- **Heroku**: `https://your-app-name.herokuapp.com`

## 🎯 Recommended: Render

**Why Render?**
- ✅ Completely free
- ✅ Simple setup
- ✅ Auto-deploys from GitHub
- ✅ Good performance
- ✅ No credit card required

**Setup Time**: ~5 minutes
**Cost**: $0/month 