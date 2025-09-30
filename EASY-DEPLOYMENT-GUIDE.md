# STEP-BY-STEP DEPLOYMENT GUIDE

## Step 1: Update Your .env File
Replace the MONGODB_URI in your backend/.env file with:

MONGODB_URI=mongodb+srv://jamesborromeo3_db_user:YOUR_PASSWORD_HERE@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0

(Replace YOUR_PASSWORD_HERE with your actual MongoDB password)

## Step 2: Test Locally
1. Save the .env file
2. Run: cd "C:\HTML ws\fullstack\backend"
3. Run: npm start
4. If you see "Connected to MongoDB Atlas", you're good!

## Step 3: Railway Deployment
1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Click "New Project"
4. Click "Deploy from GitHub repo"
5. Select "Jemershon/Capstone-2"
6. Railway will start deploying automatically

## Step 4: Add Environment Variables in Railway
After deployment starts, click on your project, then:
1. Click "Variables" tab
2. Add these variables one by one:

NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://jamesborromeo3_db_user:YOUR_PASSWORD_HERE@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long-random-string
CORS_ORIGIN=https://your-vercel-app.vercel.app
MAX_FILE_SIZE=25
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,rar,jpg,jpeg,png,mp4,mov,mp3,wav

## Step 5: Get Your Backend URL
After deployment, Railway will give you a URL like:
https://capstone-2-production.railway.app

## Step 6: Update Your Frontend
In Vercel:
1. Go to your project dashboard
2. Click "Settings"
3. Click "Environment Variables"
4. Add: VITE_API_URL = https://your-railway-url.railway.app
5. Redeploy your frontend

## That's it! Your app will be fully deployed.