# FlipToWin Backend - Production Ready

A secure, high-performance coin flip gambling backend API with enforced win/loss ratios and comprehensive security measures.

## 🔒 Security Features

- **Rate Limiting**: Protects against brute force attacks
- **Input Validation**: Comprehensive validation using Joi and express-validator
- **SQL Injection Protection**: MongoDB sanitization
- **XSS Protection**: Helmet.js security headers
- **CSRF Protection**: Built-in CSRF tokens
- **Secure Headers**: Comprehensive security headers via Helmet
- **Data Encryption**: Bcrypt for password hashing, secure JWT tokens
- **Memory Management**: Automatic cleanup of old game cycles
- **Error Handling**: Comprehensive error logging without exposure

## 🚀 Performance Optimizations

- **Compression**: Gzip compression for responses
- **Connection Pooling**: MongoDB connection pooling
- **Memory Management**: Automatic cleanup and limits
- **Caching**: Redis session storage (optional)
- **Clustering**: PM2 cluster mode support
- **Database Indexing**: Optimized MongoDB queries

## 🎮 Game Features

- **Enforced Ratios**: Mathematically guaranteed 5W/7L ratio per 12-game cycle
- **Unpredictable Patterns**: Cryptographically secure randomization
- **Data Integrity**: Comprehensive validation and corruption detection
- **User Isolation**: Individual game cycles per user
- **Real-time Monitoring**: Detailed logging and metrics

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 4.4
- Redis >= 6.0 (optional, for sessions)
- Nginx (recommended for production)

## 🛠️ Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ftbtest1
npm install
```

### 2. Environment Configuration
```bash
cp .env.production .env
# Edit .env with your actual values
```

### 3. Security Setup
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Database Setup
```bash
# Ensure MongoDB is running
mongosh
use fliptowin
# The application will create indexes automatically
```

### 5. Production Deployment
```bash
chmod +x deploy.sh
./deploy.sh
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | development | Yes |
| `PORT` | Server port | 5000 | No |
| `MONGO_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |
| `GAME_MAX_BET_AMOUNT` | Maximum bet amount | 10000 | No |

### Game Configuration

The game enforces a strict 5 wins, 7 losses pattern over 12-game cycles:

```javascript
// In config/config.js
game: {
  maxGames: 12,        // Games per cycle
  maxWins: 5,          // Wins per cycle
  maxLosses: 7,        // Losses per cycle
  maxBetAmount: 10000, // Maximum bet
  maxUsers: 10000,     // Max concurrent users
  cleanupInterval: 3600000, // 1 hour cleanup
  cycleMaxAge: 86400000     // 24 hour max age
}
```

## 🚦 Running in Production

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 monit
pm2 startup
pm2 save
```

### Using Systemd
```bash
sudo cp fliptowin.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fliptowin
sudo systemctl start fliptowin
```

### Using Docker
```bash
docker build -t fliptowin-backend .
docker run -d -p 5000:5000 --env-file .env fliptowin-backend
```

## 🔍 Monitoring & Logging

### Log Levels
- **Error**: Critical errors requiring immediate attention
- **Warn**: Important warnings
- **Info**: General application flow
- **Debug**: Detailed debugging information

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:5000/health

# PM2 monitoring
pm2 monit

# Log monitoring
tail -f logs/app.log
```

### Key Metrics to Monitor
- Response times
- Memory usage
- Database connection pool
- Game cycle integrity
- Error rates
- Active user sessions

## 🛡️ Security Best Practices

### 1. Environment Security
- Use strong, unique secrets (min 32 characters)
- Never commit .env files
- Use environment-specific configurations
- Regularly rotate secrets

### 2. Network Security
- Use HTTPS only in production
- Configure proper CORS origins
- Set up rate limiting
- Use Nginx as reverse proxy

### 3. Database Security
- Use MongoDB authentication
- Configure proper indexes
- Regular backups
- Monitor for unusual patterns

### 4. Application Security
- Input validation on all endpoints
- Proper error handling
- Secure session management
- Regular dependency updates

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-otp` - OTP verification

### Game
- `POST /api/play/game` - Play coin flip game
- `GET /api/balance/current` - Get user balance

### Admin
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/user-reset` - Reset user cycle

## 🔄 Backup & Recovery

### Database Backup
```bash
mongodump --db fliptowin --out /path/to/backup
```

### Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🚨 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check game cycle cleanup
   - Monitor user session count
   - Restart application if needed

2. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection pool settings
   - Monitor connection count

3. **Rate Limiting Triggers**
   - Check client behavior
   - Adjust rate limit settings
   - Monitor for abuse patterns

### Debug Mode
```bash
NODE_ENV=development npm start
```

## 📈 Performance Tuning

### Database Optimization
- Ensure proper indexes exist
- Monitor slow queries
- Optimize connection pool size

### Memory Optimization
- Configure game cycle cleanup
- Monitor memory usage patterns
- Set appropriate limits

### Response Time Optimization
- Use compression
- Optimize database queries
- Implement caching where appropriate

## 🔄 Updates & Maintenance

### Regular Tasks
- Update dependencies monthly
- Review security logs weekly
- Monitor performance metrics daily
- Backup database daily

### Security Updates
```bash
npm audit fix
npm update
```

## 📞 Support

For issues and questions:
- Check logs for error details
- Review configuration settings
- Monitor system resources
- Contact development team

## 📄 License

ISC - See LICENSE file for details
