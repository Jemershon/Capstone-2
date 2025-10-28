# Production Deployment Guide

## Environment Variables Required for Production

### 1. Database Configuration
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/notetify
```
Get this from MongoDB Atlas (recommended) or your MongoDB hosting provider.

### 2. JWT Security
```
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
```
Generate a strong, random secret key for JWT token signing.

### 3. File Storage (Cloudinary)
```
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```
Sign up at https://cloudinary.com for free cloud file storage.

### 4. Server Configuration
```
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend-domain.com
```

### 5. File Upload Settings
```
MAX_FILE_SIZE=25
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,rar,jpg,jpeg,png,mp4,mov,mp3,wav
```

## Deployment Platforms

### Option 1: Railway (Recommended)

### Option 2: Render
1. Create account at render.com
2. Connect your GitHub repository
3. Choose "Web Service"
4. Add environment variables
5. Deploy

### Option 3: Heroku
1. Install Heroku CLI
2. `heroku create your-app-name`
3. `heroku config:set MONGODB_URI=your-mongodb-uri`
4. Add all other environment variables
5. `git push heroku main`

### Option 4: DigitalOcean App Platform
1. Create account at digitalocean.com
2. Use App Platform
3. Connect GitHub repository
4. Configure environment variables
5. Deploy

## Pre-deployment Checklist

- [ ] MongoDB Atlas database created and connection string ready
- [ ] Cloudinary account created and API keys ready
- [ ] Strong JWT secret generated
- [ ] All environment variables configured
- [ ] Frontend CORS origin updated
- [ ] Test API endpoints work locally with production environment variables

## Post-deployment Steps

1. Test all API endpoints
2. Upload a test file to verify Cloudinary integration
3. Create test user accounts
4. Verify database connections
5. Check error logging and monitoring

## Security Notes

- Never commit .env files to version control
- Use strong, unique passwords for all services
- Enable 2FA on all accounts (MongoDB Atlas, Cloudinary, deployment platform)
- Regularly rotate JWT secrets and API keys
- Monitor error logs for security issues

## File Storage Migration

When you deploy:
- Local files in `uploads/` folder will NOT be transferred
- New uploads will automatically go to Cloudinary
- Existing file references in database will still work for local development
- Consider migrating existing files to Cloudinary manually if needed