# Railway Deployment Guide

This guide covers deploying both the backend (Express) and frontend (Next.js) to Railway.

## Prerequisites

- GitHub account with the repository pushed
- Railway account — [railway.app](https://railway.app)
- MongoDB Atlas connection string (already configured)
- Git installed locally

---

## Step 1: Prepare Your Repository

Make sure all changes are committed and pushed:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

---

## Step 2: Deploy the Backend

### 2.1 Create a New Project

1. Go to [railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Authorise Railway to access your GitHub account
4. Select your repository

### 2.2 Configure the Backend Service

1. Click on the service Railway created
2. Go to the **Settings** tab
3. Set **Root Directory** to:
   ```
   resource-and-capacity-management-app
   ```
4. Set **Start Command** to:
   ```
   node server.js
   ```

### 2.3 Add Backend Environment Variables

Go to the **Variables** tab and add:

```
MONGODB_URI=<your-mongodb-atlas-connection-string>
DB_NAME=ResourceManagementAPP_DB
PORT=3001
NODE_ENV=production
JWT_SECRET=<your-long-random-secret>
HF_TOKEN=<your-hugging-face-api-token>
FRONTEND_URL=<your-frontend-railway-url>   # fill in after Step 3
```

> ⚠️ Never paste real credentials into this file. Use the Railway Variables tab to store secrets — they are encrypted at rest.

> 💡 `HF_TOKEN` is your Hugging Face API token. Get one free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens). The AI chat assistant will not work without it, but the rest of the app is unaffected.

### 2.4 Generate a Backend Domain

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL — you will need it for the frontend environment variable

### 2.5 Deploy

Railway deploys automatically when you push to your connected branch. Check the **Deployments** tab for build logs.

You should see in the logs:
```
Connected to MongoDB successfully
Server listening on port 3001
```

---

## Step 3: Deploy the Frontend

### 3.1 Add a New Service to the Same Project

1. In your Railway project, click **New** → **GitHub Repo**
2. Select the same repository
3. Railway will create a second service

### 3.2 Configure the Frontend Service

1. Click on the new service
2. Go to **Settings**
3. Set **Root Directory** to:
   ```
   resource-and-capacity-management-app/frontend
   ```
4. Set **Build Command** to:
   ```
   npm run build
   ```
5. Set **Start Command** to:
   ```
   npm start
   ```

### 3.3 Add Frontend Environment Variables

Go to the **Variables** tab and add:

```
NEXT_PUBLIC_API_URL=https://<your-backend-railway-url>/api
```

### 3.4 Generate a Frontend Domain

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL

---

## Step 4: Link Frontend and Backend

1. Go back to your **backend** service on Railway
2. Update the `FRONTEND_URL` variable to your frontend Railway URL:
   ```
   FRONTEND_URL=https://<your-frontend-railway-url>
   ```
3. Railway will redeploy automatically

---

## Step 5: Verify the Deployment

1. Visit your frontend Railway URL
2. The login page should load
3. Sign in with a valid account from your database
4. Check the Railway **Logs** tab on the backend service if anything fails

---

## Environment Variables Summary

### Backend service

| Variable       | Value                                              |
|----------------|----------------------------------------------------|
| `MONGODB_URI`  | Your full MongoDB Atlas connection string          |
| `DB_NAME`      | `ResourceManagementAPP_DB`                         |
| `PORT`         | `3001`                                             |
| `NODE_ENV`     | `production`                                       |
| `JWT_SECRET`   | Long random secret — generate with `openssl rand -hex 64` |
| `HF_TOKEN`     | Hugging Face API token — powers the AI chat assistant |
| `FRONTEND_URL` | Your frontend Railway URL (no trailing slash)      |

### Frontend service

| Variable                | Value                                        |
|-------------------------|----------------------------------------------|
| `NEXT_PUBLIC_API_URL`   | `https://<backend-railway-url>/api`          |

---

## Troubleshooting

**Build fails on Railway**
- Check the **Deployments** tab for the full error log
- Verify Root Directory is set correctly for each service
- Ensure all packages are listed in `package.json` (not just installed locally)

**CORS errors in the browser**
- Confirm `FRONTEND_URL` on the backend matches your frontend Railway URL exactly
- No trailing slashes on either URL
- Check the backend logs for the exact CORS rejection message

**MongoDB connection fails**
- Verify the connection string is URL-encoded (special characters like `@`, `!` must be encoded)
- In MongoDB Atlas → Network Access → add `0.0.0.0/0` to allow Railway's dynamic IPs
- Check the backend logs for the specific MongoDB error

**API calls return 404 or network error**
- Confirm `NEXT_PUBLIC_API_URL` ends with `/api`
- Check that the backend service is running (green status in Railway dashboard)
- Test the health endpoint directly: `https://<backend-url>/api/health`

**JWT errors / users can't stay logged in**
- Ensure `JWT_SECRET` is set on the backend and is identical across any redeployments
- Do not rotate `JWT_SECRET` without invalidating existing sessions

---

## Monitoring

- **Backend logs**: Railway dashboard → backend service → **Logs** tab
- **Frontend logs**: Railway dashboard → frontend service → **Logs** tab
- **MongoDB**: Atlas dashboard → Monitoring tab

---

## Cost Estimate

| Service        | Free Tier                                    |
|----------------|----------------------------------------------|
| Railway        | $5 credit/month — covers small workloads     |
| MongoDB Atlas  | M0 free tier — 512 MB storage                |

---

## Useful Links

- [Railway Docs](https://docs.railway.app)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)