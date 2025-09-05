#!/bin/bash

# Environment Setup Script for LMS Deployment on EC2
echo "🚀 Setting up environment variables and configuration files..."

# Create logs directory
mkdir -p logs

# Set permissions
chmod +x deploy.sh

# Backup original .env files if they exist
if [ -f "client/.env" ]; then
    cp client/.env client/.env.backup
fi

if [ -f "server/.env" ]; then
    cp server/.env server/.env.backup
fi

# Copy production environment files
echo "📁 Setting up production environment files..."
cp client/.env.production client/.env
cp server/.env.production server/.env

# Create systemd service for auto-startup
echo "⚙️ Creating systemd service for auto-startup..."
sudo tee /etc/systemd/system/lms-app.service > /dev/null <<EOF
[Unit]
Description=LMS Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/LMS-TRIAL
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production --no-daemon
ExecStop=/usr/bin/pm2 stop all
ExecReload=/usr/bin/pm2 reload all
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable lms-app

echo "✅ Environment setup completed!"
echo "📋 Next steps:"
echo "   1. Run ./deploy.sh to deploy the application"
echo "   2. Check logs with: pm2 logs"
echo "   3. Monitor with: pm2 monit"
echo "   4. Access app at: http://16.171.146.116"
