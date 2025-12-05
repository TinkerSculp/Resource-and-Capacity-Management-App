# Railway Deployment Guide

This guide will help you deploy the Resource & Capacity Management App to Railway.

## Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Git installed locally
- MongoDB Atlas connection string (already configured)

## Step 1: Prepare Your Repository

1. **Commit your changes:**
   ```powershell
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

## Step 2: Deploy Backend to Railway

### 2.1 Create New Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository: `Resource-and-Capacity-Management-App`

### 2.2 Configure Service

1. Railway will detect your Node.js app automatically
2. Click on your service
3. Go to **"Variables"** tab
4. Add the following environment variables:

   ```
   MONGODB_URI=mongodb+srv://jaredgutierrezjg_db_user:C%40pstone%26Group7%21002@rmapp-canadacentral.ycvntgt.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=resource_management
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

### 2.3 Configure Root Directory

1. Go to **"Settings"** tab
2. Under **"Service Settings"**
3. Set **Root Directory** to: `resource-and-capacity-management-app`
4. Set **Start Command** to: `node server.js`

### 2.4 Deploy

1. Railway will automatically deploy
2. Wait for build to complete (check **"Deployments"** tab)
3. Once deployed, click **"Settings"** → **"Generate Domain"**
4. Copy your Railway backend URL (e.g., `https://your-app.up.railway.app`)

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI (optional)

```powershell
npm install -g vercel
```

### 3.2 Deploy via Vercel Dashboard

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `resource-and-capacity-management-app`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.3 Add Environment Variables

In Vercel project settings, add:
```
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
```

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

## Step 4: Update CORS Configuration

1. Go back to Railway
2. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Redeploy if needed

## Step 5: Test Your Deployment

1. Visit your Vercel URL
2. Click "Sign In"
3. Test login with: `test@example.com` / `password123`

## Environment Variables Summary

### Railway (Backend)
```
MONGODB_URI=<your-mongodb-connection-string>
DB_NAME=resource_management
PORT=3001
NODE_ENV=production
FRONTEND_URL=<your-vercel-url>
```

### Vercel (Frontend)
```
NEXT_PUBLIC_API_URL=<your-railway-url>
```

## Troubleshooting

### Build Fails on Railway
- Check **"Deployments"** tab for error logs
- Verify Root Directory is set correctly
- Ensure all dependencies are in package.json

### CORS Errors
- Verify `FRONTEND_URL` in Railway matches your Vercel URL
- Check Railway logs for CORS errors
- Ensure no trailing slash in URLs

### MongoDB Connection Issues
- Verify MongoDB connection string is URL-encoded
- Check MongoDB Atlas whitelist (allow all IPs: 0.0.0.0/0)
- Test connection in Railway logs

### Login Not Working
- Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- Check browser console for API errors
- Verify Railway backend is running (check logs)

## Local Development

To run locally after Railway setup:

```powershell
# Backend
cd resource-and-capacity-management-app
node server.js

# Frontend (separate terminal)
npm run dev
```

## Monitoring

- **Railway Logs**: Dashboard → Your Service → "Logs" tab
- **Vercel Logs**: Project → "Deployments" → Select deployment → "Logs"

## Cost

- **Railway**: Free tier includes 500 hours/month ($5 credit)
- **Vercel**: Free tier for hobby projects
- **MongoDB Atlas**: Free tier (M0) with 512 MB storage

## Next Steps

1. Set up custom domain (optional)
2. Add SSL certificate (automatic with Railway/Vercel)
3. Implement bcrypt password hashing
4. Add JWT authentication
5. Set up CI/CD pipeline

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://www.mongodb.com/docs/atlas/
