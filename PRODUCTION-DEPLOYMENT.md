# LMS Production Deployment Guide
## Server: 56.228.26.240 (Ubuntu)

This guide provides complete instructions for deploying the LMS application on your Ubuntu EC2 instance.

## 🚀 Quick Deployment (Automated)

```bash
# On your Ubuntu server (56.228.26.240)
git clone https://github.com/lmslead/RGLMS.git
cd RGLMS
chmod +x deploy-production.sh
./deploy-production.sh
```

## 📋 Prerequisites

### 1. Server Requirements
- Ubuntu 20.04+ LTS
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ disk space
- Internet connectivity for package installation

### 2. Software Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

## 🔧 Manual Deployment Steps

### 1. Clone Repository
```bash
cd /var/www
sudo git clone https://github.com/lmslead/RGLMS.git lms
sudo chown -R $USER:$USER /var/www/lms
cd /var/www/lms
```

### 2. Install Dependencies
```bash
# Install server dependencies
cd server
npm install --production

# Install client dependencies and build
cd ../client
npm install
npm run build
```

### 3. Configure Environment
```bash
# Copy production environment files
cp server/.env.production server/.env
cp client/.env.production client/.env
```

### 4. Setup Nginx
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/lms
sudo ln -sf /etc/nginx/sites-available/lms /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### 5. Start Application
```bash
# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save
```

## 🌐 Application URLs

- **Frontend**: http://56.228.26.240
- **API**: http://56.228.26.240:5000
- **Health Check**: http://56.228.26.240:5000/api/auth/health

## 📊 Monitoring & Management

### PM2 Commands
```bash
pm2 status          # Check app status
pm2 logs            # View logs
pm2 restart all     # Restart app
pm2 stop all        # Stop app
pm2 delete all      # Delete app from PM2
```

### System Service Commands
```bash
sudo systemctl status nginx    # Check Nginx status
sudo systemctl restart nginx   # Restart Nginx
sudo systemctl stop nginx      # Stop Nginx
```

### Health Check
```bash
# Run comprehensive health check
./health-check.sh
```

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp
sudo ufw --force enable
```

### 2. SSL Setup (Optional)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 56.228.26.240
```

## 📁 Project Structure (Production)
```
/var/www/lms/
├── client/
│   ├── build/              # React production build
│   └── src/                # React source code
├── server/
│   ├── server.js          # Express.js application
│   ├── routes/            # API routes
│   └── models/            # Database models
├── nginx.conf             # Nginx configuration
├── ecosystem.config.js    # PM2 configuration
└── deploy-production.sh   # Deployment script
```

## 🗄️ Database Configuration

The application uses MongoDB Atlas (cloud):
- **Connection String**: mongodb+srv://rglms10:RGLMS123@lmsdatabase.jo25hav.mongodb.net/LMSdata
- **Environment**: Production
- **Security**: JWT authentication with secure tokens

## 🔄 Updates & Maintenance

### Updating the Application
```bash
cd /var/www/lms
git pull origin main
npm run install-all
npm run build
pm2 restart all
```

### Log Management
```bash
# View application logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs location
tail -f /var/log/lms/combined.log
```

## ⚠️ Troubleshooting

### Common Issues

1. **Port 80 Already in Use**
   ```bash
   sudo systemctl stop apache2  # If Apache is running
   sudo systemctl disable apache2
   sudo systemctl start nginx
   ```

2. **Permission Issues**
   ```bash
   sudo chown -R $USER:$USER /var/www/lms
   chmod -R 755 /var/www/lms
   ```

3. **Application Not Starting**
   ```bash
   pm2 logs  # Check logs for errors
   pm2 restart all
   ```

4. **Build Errors**
   ```bash
   cd /var/www/lms/client
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

## 📞 Support

- **Repository**: https://github.com/lmslead/RGLMS
- **Server IP**: 56.228.26.240
- **Environment**: Production

## 🎯 Performance Optimization

### 1. Enable Gzip (Already configured in Nginx)
### 2. PM2 Cluster Mode (if needed)
```bash
# Modify ecosystem.config.js
instances: 'max'  # Use all CPU cores
```

### 3. Database Indexing
Ensure proper MongoDB indexes are set up for optimal query performance.

---

**✅ Deployment Complete!**

Your LMS application should now be accessible at http://56.228.26.240
