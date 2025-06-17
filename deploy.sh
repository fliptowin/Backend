#!/bin/bash

# Production Deployment Script for FlipToWin Backend

echo "🚀 Starting FlipToWin Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as non-root user
if [ "$EUID" -eq 0 ]; then
    print_error "Do not run this script as root for security reasons"
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $REQUIRED_VERSION or higher is required. Current: $NODE_VERSION"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f ".env.production" ]; then
        cp .env.production .env
        print_warning "Please edit .env file with your actual values before continuing"
        exit 1
    else
        print_error "No .env template found"
        exit 1
    fi
fi

# Install dependencies
print_status "Installing production dependencies..."
npm ci --only=production

# Run security audit
print_status "Running security audit..."
npm audit --audit-level moderate
if [ $? -ne 0 ]; then
    print_warning "Security vulnerabilities found. Please review and fix before deploying."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Create uploads directory
print_status "Creating uploads directory..."
mkdir -p public/uploads
chmod 755 public/uploads

# Set proper file permissions
print_status "Setting file permissions..."
find . -type f -name "*.js" -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod 600 .env

# Create systemd service file (if running on Linux with systemd)
if command -v systemctl &> /dev/null; then
    print_status "Creating systemd service file..."
    
    cat << EOF > fliptowin.service
[Unit]
Description=FlipToWin Backend API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PWD
ExecStart=$(which node) app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$PWD/logs $PWD/public/uploads

# Resource limits
LimitNOFILE=1024
LimitNPROC=512

[Install]
WantedBy=multi-user.target
EOF

    print_status "To install the service, run as root:"
    print_status "sudo cp fliptowin.service /etc/systemd/system/"
    print_status "sudo systemctl daemon-reload"
    print_status "sudo systemctl enable fliptowin"
    print_status "sudo systemctl start fliptowin"
fi

# Create nginx configuration template
print_status "Creating nginx configuration template..."
cat << 'EOF' > nginx.conf.template
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # Static files
    location /uploads/ {
        alias /path/to/your/app/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log)$ {
        deny all;
    }
}
EOF

# Create PM2 ecosystem file
print_status "Creating PM2 ecosystem file..."
cat << EOF > ecosystem.config.js
module.exports = {
  apps: [{
    name: 'fliptowin-backend',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: ['--max-old-space-size=1024'],
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF

# Create health check script
print_status "Creating health check script..."
cat << 'EOF' > healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 5000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('Health check passed');
    process.exit(0);
  } else {
    console.log(`Health check failed with status code: ${res.statusCode}`);
    process.exit(1);
  }
});

req.on('error', (err) => {
  console.log(`Health check failed: ${err.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
EOF

print_status "✅ Deployment preparation complete!"
print_status ""
print_status "Next steps:"
print_status "1. Edit .env file with your actual configuration values"
print_status "2. Set up SSL certificates"
print_status "3. Configure nginx (see nginx.conf.template)"
print_status "4. Install PM2: npm install -g pm2"
print_status "5. Start the application: pm2 start ecosystem.config.js"
print_status "6. Set up PM2 monitoring: pm2 monit"
print_status "7. Configure log rotation: pm2 install pm2-logrotate"
print_status ""
print_warning "Remember to:"
print_warning "- Set up proper firewall rules"
print_warning "- Configure automated backups"
print_warning "- Set up monitoring and alerting"
print_warning "- Regularly update dependencies"
