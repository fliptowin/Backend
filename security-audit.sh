#!/bin/bash

# Security Audit Script for FlipToWin Backend

echo "🔒 Running Security Audit for FlipToWin Backend..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo "🔍 Starting security checks..."
echo

# Check 1: Environment file security
print_info "Checking environment file security..."
if [ -f ".env" ]; then
    ENV_PERMS=$(stat -c "%a" .env 2>/dev/null || stat -f "%A" .env 2>/dev/null)
    if [ "$ENV_PERMS" = "600" ]; then
        print_pass ".env file has correct permissions (600)"
    else
        print_warn ".env file permissions should be 600, currently: $ENV_PERMS"
    fi
else
    print_fail ".env file not found"
fi

# Check 2: Secret strength
print_info "Checking secret strength..."
if [ -f ".env" ]; then
    JWT_SECRET=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    if [ ${#JWT_SECRET} -ge 32 ]; then
        print_pass "JWT_SECRET is sufficiently long (${#JWT_SECRET} characters)"
    else
        print_fail "JWT_SECRET should be at least 32 characters, currently: ${#JWT_SECRET}"
    fi
else
    print_fail "Cannot check secrets - .env file not found"
fi

# Check 3: Node.js version
print_info "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
if [ "$MAJOR_VERSION" -ge 18 ]; then
    print_pass "Node.js version is current ($NODE_VERSION)"
else
    print_fail "Node.js version should be 18+ for security updates, currently: $NODE_VERSION"
fi

# Check 4: Dependencies audit
print_info "Running npm audit..."
npm audit --audit-level moderate > /tmp/audit_result 2>&1
if [ $? -eq 0 ]; then
    print_pass "No moderate or high severity vulnerabilities found"
else
    VULN_COUNT=$(grep -c "vulnerabilities" /tmp/audit_result)
    print_fail "Security vulnerabilities found in dependencies"
    echo "Run 'npm audit fix' to resolve"
fi

# Check 5: File permissions
print_info "Checking file permissions..."
UNSAFE_FILES=$(find . -name "*.js" -perm 777 2>/dev/null | wc -l)
if [ "$UNSAFE_FILES" -eq 0 ]; then
    print_pass "No world-writable JavaScript files found"
else
    print_warn "$UNSAFE_FILES JavaScript files are world-writable"
fi

# Check 6: Sensitive file exposure
print_info "Checking for sensitive file exposure..."
SENSITIVE_FILES=(".env" "*.log" "*.key" "*.pem")
EXPOSED_COUNT=0

for pattern in "${SENSITIVE_FILES[@]}"; do
    if find . -name "$pattern" -not -path "./logs/*" -not -path "./node_modules/*" | grep -q .; then
        print_warn "Sensitive files ($pattern) found in repository"
        ((EXPOSED_COUNT++))
    fi
done

if [ "$EXPOSED_COUNT" -eq 0 ]; then
    print_pass "No sensitive files exposed in main directory"
fi

# Check 7: Security headers configuration
print_info "Checking security middleware configuration..."
if grep -q "helmet" app.js; then
    print_pass "Helmet security middleware is configured"
else
    print_fail "Helmet security middleware not found in app.js"
fi

if grep -q "express-rate-limit" app.js; then
    print_pass "Rate limiting middleware is configured"
else
    print_fail "Rate limiting middleware not found"
fi

# Check 8: Input validation
print_info "Checking input validation..."
if grep -q "express-validator\|joi" controllers/*.js middleware/*.js 2>/dev/null; then
    print_pass "Input validation middleware detected"
else
    print_warn "Input validation middleware not clearly detected"
fi

# Check 9: Error handling
print_info "Checking error handling..."
if grep -q "try.*catch" controllers/*.js 2>/dev/null; then
    print_pass "Error handling found in controllers"
else
    print_warn "Error handling not detected in controllers"
fi

# Check 10: Logging configuration
print_info "Checking logging configuration..."
if [ -f "config/logger.js" ]; then
    if grep -q "winston" config/logger.js; then
        print_pass "Winston logging is configured"
    else
        print_warn "Logging configuration found but not using Winston"
    fi
else
    print_fail "Logging configuration not found"
fi

# Check 11: Database security
print_info "Checking database security..."
if grep -q "mongoose.connect.*useNewUrlParser.*useUnifiedTopology" app.js; then
    print_pass "MongoDB connection uses security options"
else
    print_warn "MongoDB connection should use security options"
fi

# Check 12: CORS configuration
print_info "Checking CORS configuration..."
if grep -q "cors.*origin" app.js; then
    print_pass "CORS is configured with specific origins"
else
    print_warn "CORS should be configured with specific origins"
fi

# Check 13: Process security
print_info "Checking process security..."
if [ "$EUID" -eq 0 ]; then
    print_fail "Application should not run as root"
else
    print_pass "Application is not running as root"
fi

# Check 14: SSL/TLS configuration
print_info "Checking SSL/TLS configuration..."
if [ -f "nginx.conf.template" ]; then
    if grep -q "ssl_protocols.*TLSv1.2.*TLSv1.3" nginx.conf.template; then
        print_pass "SSL/TLS configuration template found with modern protocols"
    else
        print_warn "SSL/TLS configuration should use TLSv1.2 and TLSv1.3 only"
    fi
else
    print_warn "SSL/TLS configuration template not found"
fi

# Check 15: Session security
print_info "Checking session security..."
if grep -q "express-session" package.json; then
    if [ -f ".env" ] && grep -q "SESSION_SECRET" .env; then
        print_pass "Session security is configured"
    else
        print_warn "Session secret should be configured in .env"
    fi
else
    print_warn "Session middleware not detected"
fi

echo
echo "🔒 Security Audit Complete"
echo "=================================="
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${YELLOW}Warnings: $WARN_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Security audit failed. Please address the failed checks before deploying to production.${NC}"
    exit 1
elif [ "$WARN_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Security audit passed with warnings. Review warnings before deploying.${NC}"
    exit 0
else
    echo -e "${GREEN}✅ Security audit passed successfully!${NC}"
    exit 0
fi
