// Simple health check for external monitoring
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
    console.log('Health check failed:', res.statusCode);
    process.exit(1);
  }
});

req.on('timeout', () => {
  console.log('Health check timeout');
  process.exit(1);
});

req.on('error', (err) => {
  console.log('Health check error:', err.message);
  process.exit(1);
});

req.end();
