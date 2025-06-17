# Render Deployment Guide for FlipToWin Backend

## Prerequisites

1. **MongoDB Atlas Account** (Free tier available)
   - Create a cluster at https://cloud.mongodb.com
   - Get your connection string
   - Whitelist all IPs (0.0.0.0/0) for Render deployment

2. **Render Account** (Free tier available)
   - Sign up at https://render.com
   - Connect your GitHub repository

3. **GitHub Repository**
   - Push this code to a GitHub repository
   - Make sure it's public or connected to Render

## Deployment Steps

### Step 1: Set Up MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Create a new cluster (free tier)
3. Create a database user with read/write permissions
4. Get your connection string (replace `<password>` with actual password)
5. Whitelist all IPs: `0.0.0.0/0` (for Render)

### Step 2: Deploy to Render

1. **Connect Repository**
   - Go to https://dashboard.render.com
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing this code

2. **Configure Service**
   - **Name**: `flip-to-win-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Runtime**: `Node`
   - **Build Command**: `npm ci --only=production`
   - **Start Command**: `npm start`

3. **Set Environment Variables**
   
   **Required Variables:**
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/fliptowin?retryWrites=true&w=majority
   JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
   SESSION_SECRET=your-session-secret-minimum-32-characters
   ```

   **Optional Variables:**
   ```
   CORS_ORIGIN=https://your-frontend-domain.com
   CORS_CREDENTIALS=true
   GAME_MAX_BET_AMOUNT=10000
   GAME_MIN_BET_AMOUNT=1
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

   **Email Variables (if using email features):**
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Advanced Settings**
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Enable (for automatic deployments)

### Step 3: Deploy

1. Click "Create Web Service"
2. Render will automatically build and deploy your app
3. Monitor the deployment logs
4. Once deployed, you'll get a URL like: `https://flip-to-win-backend.onrender.com`

### Step 4: Test Your Deployment

1. **Health Check**: Visit `https://your-app.onrender.com/health`
2. **API Test**: Use Postman or curl to test endpoints

Example test:
```bash
curl https://your-app.onrender.com/health
```

## Important Notes

### Security Considerations

1. **Secrets**: Never commit secrets to your repository
2. **CORS**: Set `CORS_ORIGIN` to your actual frontend domain
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **MongoDB**: Use MongoDB Atlas with proper authentication

### Performance Optimization

1. **Database**: Use MongoDB Atlas for better performance
2. **Caching**: Consider adding Redis for session management
3. **Monitoring**: Use Render's built-in monitoring
4. **Scaling**: Upgrade to paid plans for better performance

### Troubleshooting

1. **Deployment Fails**: Check build logs in Render dashboard
2. **Database Connection**: Verify MongoDB connection string and IP whitelist
3. **Environment Variables**: Check all required variables are set
4. **Health Check Fails**: Verify `/health` endpoint works locally

### Maintenance

1. **Updates**: Push to GitHub to trigger auto-deployment
2. **Monitoring**: Check Render dashboard for metrics
3. **Logs**: Use Render's log viewer for debugging
4. **Backups**: Regularly backup your MongoDB data

## Cost Considerations

- **Render Free Tier**: 
  - 750 hours/month
  - Service sleeps after 15 minutes of inactivity
  - Slower startup time

- **MongoDB Atlas Free Tier**:
  - 512 MB storage
  - Shared cluster
  - Perfect for development/testing

- **Upgrading**: Consider paid plans for production use

## Support

- **Render Documentation**: https://render.com/docs
- **MongoDB Atlas Documentation**: https://docs.atlas.mongodb.com
- **GitHub Issues**: Create issues in your repository for bugs

Your FlipToWin backend is now production-ready for Render deployment!
