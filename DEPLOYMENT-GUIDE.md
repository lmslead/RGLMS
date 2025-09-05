# 🚀 LMS-TRIAL Deployment Guide for Ubuntu EC2

## Prerequisites
- Ubuntu 20.04+ EC2 instance
- Server IP: 16.171.146.116
- SSH access to the server
- Root or sudo access

## 📋 Step-by-Step Deployment Instructions

### 1. Clean Up Your Local Project

First, run the cleanup script on your local machine:

```bash
# On Windows (Git Bash or WSL)
chmod +x cleanup-project.sh
./cleanup-project.sh

# Or manually remove these files:
rm -f auto-deploy.sh cleanup.sh deploy.sh prepare-deploy.bat quick-setup.ps1 quick-setup.sh monitor.sh API_DOCS.md DEPLOYMENT.md PRODUCTION-READY.md
rm -rf node_modules/ client/node_modules/ server/node_modules/ client/build/
```

### 2. Upload Project to EC2

Upload your cleaned project to the EC2 instance:

```bash
# From your local machine
scp -r -i your-key.pem ./LMS-TRIAL ubuntu@16.171.146.116:/home/ubuntu/
```

### 3. Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@16.171.146.116
```

### 4. Run the Deployment Script

```bash
# Move the project to the correct location
sudo mv /home/ubuntu/LMS-TRIAL /var/www/lms-trial
sudo chown -R ubuntu:ubuntu /var/www/lms-trial

# Make the deployment script executable
cd /var/www/lms-trial
chmod +x deploy-to-ec2.sh

# Run the deployment script
./deploy-to-ec2.sh
```

### 5. Configure Environment Variables

**IMPORTANT:** Update the JWT secret and other sensitive configurations:

```bash
# Edit the PM2 ecosystem config
nano ecosystem.config.json

# Change the JWT_SECRET to a secure random string:
# "JWT_SECRET": "your-actual-super-secure-secret-key-here"

# Restart the application
pm2 restart lms-trial-backend
```

### 6. Verify Installation

Check that all services are running:

```bash
# Check PM2 processes
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check MongoDB status
sudo systemctl status mongod

# Test the application
curl http://localhost:5000/api/health
curl http://localhost
```

## 🌐 Access Your Application

- **Frontend**: http://16.171.146.116
- **Backend API**: http://16.171.146.116/api

## 🔧 Post-Deployment Configuration

### 1. Set Up MongoDB Initial Data

```bash
cd /var/www/lms-trial
node server/seeds/newSuperAdminSeed.js
```

### 2. Configure Firewall (if not done by script)

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 3. Set up SSL (Optional but Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain if you have one)
sudo certbot --nginx -d 16.171.146.116
```

## 🔄 Future Updates - Auto Deploy

For future updates, use the auto-deploy script:

```bash
cd /var/www/lms-trial
chmod +x auto-deploy.sh
./auto-deploy.sh
```

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
pm2 status                    # Check app status
pm2 logs lms-trial-backend   # View logs
pm2 restart lms-trial-backend # Restart app
pm2 stop lms-trial-backend   # Stop app
pm2 delete lms-trial-backend # Delete app from PM2
```

### Nginx Commands
```bash
sudo systemctl status nginx   # Check status
sudo systemctl restart nginx  # Restart
sudo nginx -t                 # Test configuration
sudo systemctl reload nginx   # Reload configuration
```

### MongoDB Commands
```bash
sudo systemctl status mongod  # Check status
sudo systemctl restart mongod # Restart
mongosh                       # Connect to MongoDB shell
```

### Log Locations
- **PM2 Logs**: `/var/www/lms-trial/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

## 🚨 Troubleshooting

### Common Issues

1. **Application not accessible**
   ```bash
   # Check if services are running
   pm2 status
   sudo systemctl status nginx
   
   # Check firewall
   sudo ufw status
   ```

2. **Database connection issues**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check MongoDB logs
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **Port conflicts**
   ```bash
   # Check what's using port 5000
   sudo netstat -tulpn | grep 5000
   ```

4. **Permission issues**
   ```bash
   # Fix ownership
   sudo chown -R ubuntu:ubuntu /var/www/lms-trial
   ```

### Health Check URLs
- Backend: `http://16.171.146.116/api/health`
- Frontend: `http://16.171.146.116`

## 📝 Environment Variables

Make sure these are set correctly in `ecosystem.config.json`:

- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI=mongodb://localhost:27017/lms-trial`
- `JWT_SECRET=your-secure-secret`
- `JWT_EXPIRE=30d`
- `CORS_ORIGIN=http://16.171.146.116`

## 🔒 Security Considerations

1. **Change default JWT secret**
2. **Set up SSL certificate**
3. **Configure proper firewall rules**
4. **Regular security updates**
5. **Database backup strategy**
6. **Monitor application logs**

## 📦 Backup Strategy

Create a backup script:

```bash
#!/bin/bash
# backup-script.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/lms-trial"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --out $BACKUP_DIR/mongodb_$DATE

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/lms-trial

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Add to crontab for automatic backups:
```bash
# Run daily at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

---

**🎉 Congratulations! Your LMS-TRIAL application is now deployed and running on your Ubuntu EC2 instance.**
