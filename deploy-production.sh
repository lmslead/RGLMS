#!/bin/bash

# LMS Production Deployment Script
# Server IP: 56.228.26.240

set -e

echo "🚀 Starting LMS Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root. Run with regular user that has sudo privileges.${NC}"
   exit 1
fi

echo -e "${YELLOW}📋 Pre-deployment checklist:${NC}"
echo "- Server IP: 56.228.26.240"
echo "- MongoDB: Cloud Atlas"
echo "- Node.js version: $(node --version)"
echo "- npm version: $(npm --version)"
echo ""

# Create necessary directories
echo -e "${YELLOW}📁 Creating application directories...${NC}"
sudo mkdir -p /var/www/lms
sudo mkdir -p /var/log/lms
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Set ownership
sudo chown -R $USER:$USER /var/www/lms
sudo chown -R $USER:$USER /var/log/lms

echo -e "${GREEN}✅ Directories created${NC}"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed${NC}"
fi

# Copy application files
echo -e "${YELLOW}📋 Copying application files...${NC}"
cp -r * /var/www/lms/
cd /var/www/lms

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd server
npm install --production
echo -e "${GREEN}✅ Server dependencies installed${NC}"

# Install client dependencies and build
echo -e "${YELLOW}📦 Installing client dependencies and building...${NC}"
cd ../client
npm install
npm run build
echo -e "${GREEN}✅ Client built successfully${NC}"

# Setup environment files
echo -e "${YELLOW}⚙️  Setting up environment files...${NC}"
cd /var/www/lms
cp server/.env.production server/.env
cp client/.env.production client/.env
echo -e "${GREEN}✅ Environment files configured${NC}"

# Setup Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
sudo cp nginx.conf /etc/nginx/sites-available/lms
sudo ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    sudo systemctl reload nginx
else
    echo -e "${RED}❌ Nginx configuration is invalid${NC}"
    exit 1
fi

# Start the application with PM2
echo -e "${YELLOW}🚀 Starting application with PM2...${NC}"
cd /var/www/lms
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

echo -e "${GREEN}✅ Application started successfully${NC}"

# Enable services
echo -e "${YELLOW}🔧 Enabling services...${NC}"
sudo systemctl enable nginx
sudo systemctl start nginx

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Application Status:${NC}"
pm2 status
echo ""
echo -e "${YELLOW}🌍 Your application is available at:${NC}"
echo "http://56.228.26.240"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo "- Check app status: pm2 status"
echo "- View app logs: pm2 logs"
echo "- Restart app: pm2 restart all"
echo "- Check nginx status: sudo systemctl status nginx"
echo "- View nginx logs: sudo tail -f /var/log/nginx/error.log"
