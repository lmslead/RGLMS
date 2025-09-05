#!/bin/bash

# LMS-TRIAL Deployment Script for EC2 (16.171.146.116)
set -e

echo "🚀 Starting LMS-TRIAL deployment..."

# Check if running on correct server
EXPECTED_IP="16.171.146.116"
CURRENT_IP=$(curl -s ifconfig.me || echo "unknown")

echo "Current server IP: $CURRENT_IP"
echo "Expected IP: $EXPECTED_IP"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install MongoDB if not installed
if ! command -v mongod &> /dev/null; then
    echo "📦 Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
fi

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production
cd ..

# Install client dependencies and build
echo "📦 Installing client dependencies and building..."
cd client
npm install
npm run build
cd ..

# Create PM2 ecosystem file
echo "📦 Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'lms-backend',
      script: 'server/server.js',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
EOF

# Start/restart application with PM2
echo "🚀 Starting application with PM2..."
pm2 delete all || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Install and configure Nginx
echo "📦 Installing and configuring Nginx..."
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/lms-trial << EOF
server {
    listen 80;
    server_name 16.171.146.116;

    # Serve React app
    location / {
        root /home/ubuntu/LMS-TRIAL/client/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/lms-trial /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable

echo "✅ LMS Application deployment completed successfully!"
echo "🌐 Your application is accessible at:"
echo "   Frontend: http://16.171.146.116"
echo "   Backend API: http://16.171.146.116:5000"
echo ""
echo "📊 Monitor your application:"
echo "   pm2 status          # Check PM2 processes"
echo "   pm2 logs            # View application logs"
echo "   pm2 monit           # Real-time monitoring"
echo "   ./health-check.sh   # Complete health check"
echo ""
echo "🔐 IMPORTANT - Default login credentials (CHANGE IMMEDIATELY):"
echo "   SuperAdmin: superadmin@example.com / password"
echo "   Admin: admin@example.com / password"
echo ""
echo "⚠️  Security checklist:"
echo "   1. Change all default passwords immediately"
echo "   2. Set up SSL certificate for HTTPS (recommended: Let's Encrypt)"
echo "   3. Configure firewall rules (UFW already enabled)"
echo "   4. Set up automated MongoDB backups"
echo "   5. Monitor application logs regularly"
echo "   6. Keep system packages updated"
