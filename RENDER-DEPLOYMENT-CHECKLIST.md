# Render Deployment Checklist ✅

## Pre-Deployment Checklist

### 1. Code Preparation ✅
- [x] Updated `render.yml` with production configuration
- [x] Created `Dockerfile` for containerized deployment
- [x] Created `.dockerignore` to exclude unnecessary files
- [x] Created `healthcheck.js` for monitoring
- [x] Updated production environment variables template

### 2. Database Setup ⚠️ (DO THIS FIRST)
- [ ] Create MongoDB Atlas account
- [ ] Create a new cluster (free tier available)
- [ ] Create database user with read/write permissions
- [ ] Get connection string
- [ ] Whitelist all IPs (0.0.0.0/0) for Render access

### 3. Environment Variables ⚠️ (CRITICAL)
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Generate strong SESSION_SECRET (32+ characters)
- [ ] Set MONGO_URI with your Atlas connection string
- [ ] Configure CORS_ORIGIN for your frontend domain
- [ ] Set up email variables (if using email features)

### 4. Repository Setup ⚠️ (REQUIRED)
- [ ] Push code to GitHub repository
- [ ] Ensure repository is public or connected to Render
- [ ] Verify all files are committed and pushed

## Deployment Steps

### 1. Render Service Creation
- [ ] Go to https://dashboard.render.com
- [ ] Click "New" → "Web Service"
- [ ] Connect your GitHub repository
- [ ] Select this repository

### 2. Service Configuration
- [ ] Name: `flip-to-win-backend`
- [ ] Runtime: `Node`
- [ ] Build Command: `npm ci --only=production`
- [ ] Start Command: `npm start`
- [ ] Health Check Path: `/health`

### 3. Environment Variables (In Render Dashboard)
**Required:**
- [ ] `NODE_ENV=production`
- [ ] `MONGO_URI=mongodb+srv://...` (from MongoDB Atlas)
- [ ] `JWT_SECRET=your-secret` (generate strong secret)
- [ ] `SESSION_SECRET=your-secret` (generate strong secret)

**Recommended:**
- [ ] `CORS_ORIGIN=https://your-frontend-domain.com`
- [ ] `CORS_CREDENTIALS=true`

### 4. Deploy & Test
- [ ] Click "Create Web Service"
- [ ] Wait for build and deployment to complete
- [ ] Test health endpoint: `https://your-app.onrender.com/health`
- [ ] Test API endpoints with Postman/curl

## Post-Deployment

### 1. Verification
- [ ] Health check returns status 200
- [ ] Database connection successful
- [ ] API endpoints responding correctly
- [ ] Logs show no errors

### 2. Performance & Monitoring
- [ ] Set up frontend to use new backend URL
- [ ] Monitor performance in Render dashboard
- [ ] Check error logs regularly
- [ ] Consider upgrading to paid plan for production use

### 3. Security
- [ ] Verify CORS is properly configured
- [ ] Test rate limiting is working
- [ ] Ensure secrets are not exposed in logs
- [ ] Monitor for suspicious activity

## Important Notes

⚠️ **Free Tier Limitations:**
- Service sleeps after 15 minutes of inactivity
- Slower cold start times
- 750 hours/month limit

🚀 **For Production:**
- Consider upgrading to paid Render plan
- Use MongoDB Atlas production cluster
- Set up proper monitoring and alerting
- Implement proper error tracking

## Files Created

✅ **Configuration:**
- `render.yml` - Render service configuration
- `Dockerfile` - Container configuration
- `.dockerignore` - Docker ignore rules

✅ **Monitoring:**
- `healthcheck.js` - Health check script

✅ **Documentation:**
- `RENDER-DEPLOYMENT-GUIDE.md` - Complete deployment guide
- `RENDER-ENV-SETUP.md` - Environment variables guide
- `RENDER-DEPLOYMENT-CHECKLIST.md` - This checklist

## Need Help?

1. **MongoDB Atlas**: https://cloud.mongodb.com
2. **Render Documentation**: https://render.com/docs
3. **GitHub Issues**: Create issues in your repository

Your FlipToWin backend is ready for Render deployment! 🚀
