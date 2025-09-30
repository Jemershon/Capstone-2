@echo off
echo ========================================
echo   BACKEND DEPLOYMENT HELPER
echo ========================================
echo.
echo Before we start, you need:
echo 1. Your MongoDB password
echo 2. Your Vercel app URL
echo.
echo Step 1: Testing MongoDB Connection
echo ---------------------------------
echo Please update your .env file with your MongoDB password
echo Then run: npm start
echo.
echo Step 2: Deploy to Railway
echo -------------------------
echo 1. Go to: https://railway.app
echo 2. Login with GitHub
echo 3. New Project → Deploy from GitHub repo
echo 4. Select: Jemershon/Capstone-2
echo.
echo Step 3: Add Environment Variables
echo ---------------------------------
echo In Railway dashboard, add these variables:
echo NODE_ENV=production
echo PORT=4000
echo MONGODB_URI=your-connection-string-here
echo JWT_SECRET=your-jwt-secret-here
echo CORS_ORIGIN=your-vercel-url-here
echo.
echo Need help? Check EASY-DEPLOYMENT-GUIDE.md
echo.
pause