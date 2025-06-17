# Render Environment Variables Setup

After deploying to Render, you'll need to set these environment variables in the Render dashboard:

## Required Environment Variables

### Database
- `MONGO_URI` - Your MongoDB connection string (use MongoDB Atlas)
  - Example: `mongodb+srv://username:password@cluster.mongodb.net/fliptowin?retryWrites=true&w=majority`

### Security (CRITICAL - Generate Strong Values)
- `JWT_SECRET` - JWT secret key (minimum 32 characters)
  - Generate: Use a strong random string generator
- `SESSION_SECRET` - Session secret key (minimum 32 characters)
  - Generate: Use a strong random string generator

### CORS (Update for your frontend domain)
- `CORS_ORIGIN` - Your frontend URL
  - For development: `http://localhost:3000`
  - For production: `https://your-frontend-domain.com`
- `CORS_CREDENTIALS` - Set to `true`

### Game Settings (Optional - defaults provided)
- `GAME_MAX_BET_AMOUNT` - Maximum bet amount (default: 10000)
- `GAME_MIN_BET_AMOUNT` - Minimum bet amount (default: 1)

### Email (Optional - for OTP/notifications)
- `EMAIL_HOST` - SMTP host (e.g., smtp.gmail.com)
- `EMAIL_PORT` - SMTP port (e.g., 587)
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password/app password
- `EMAIL_FROM` - From email address

### Rate Limiting (Optional - defaults provided)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000 = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

## How to Set Environment Variables in Render:

1. Go to your Render dashboard
2. Select your service
3. Go to "Environment" tab
4. Add each variable with its value
5. Click "Save Changes"
6. Your service will automatically redeploy

## Security Notes:
- Never commit actual secrets to your repository
- Use strong, randomly generated secrets for JWT_SECRET and SESSION_SECRET
- Use MongoDB Atlas (cloud) instead of local MongoDB
- Set CORS_ORIGIN to your actual frontend domain in production
