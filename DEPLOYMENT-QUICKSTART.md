# LMS Application - EC2 Deployment Quick Start Guide

## 🚀 Deployment on EC2 Instance (16.171.146.116)

### Prerequisites
- Ubuntu 20.04+ EC2 instance
- SSH access to the instance
- Security group allowing ports 22, 80, and 5000

### Step 1: Upload Project to EC2
```bash
# Option 1: Clone from repository (if using Git)
git clone <your-repository-url> /home/ubuntu/LMS-TRIAL

# Option 2: Upload via SCP
scp -r ./LMS-TRIAL ubuntu@16.171.146.116:/home/ubuntu/

# Option 3: Upload via SFTP client (WinSCP, FileZilla)
```

### Step 2: Connect to EC2 and Deploy
```bash
# SSH into your EC2 instance
ssh ubuntu@16.171.146.116

# Navigate to project directory
cd /home/ubuntu/LMS-TRIAL

# Make scripts executable
chmod +x *.sh

# Run environment setup
./setup-env.sh

# Run deployment script
./deploy.sh
```

### Step 3: Verify Deployment
```bash
# Run health check
./health-check.sh

# Check PM2 processes
pm2 status

# Check services
sudo systemctl status nginx
sudo systemctl status mongod
```

### Step 4: Access Application
- **Frontend**: http://16.171.146.116
- **Backend API**: http://16.171.146.116:5000

### Default Login Credentials
⚠️ **CHANGE THESE IMMEDIATELY AFTER FIRST LOGIN**
- **SuperAdmin**: superadmin@example.com / password
- **Admin**: admin@example.com / password

## 🔧 Management Commands

### Application Management
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Stop application
pm2 stop all

# Restart application
pm2 restart all

# Monitor application
pm2 monit

# View logs
pm2 logs
```

### Service Management
```bash
# Nginx
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx

# MongoDB
sudo systemctl start mongod
sudo systemctl stop mongod
sudo systemctl restart mongod
```

### Log Locations
- **Application Logs**: `./logs/`
- **PM2 Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

## 🔒 Security Configuration

### 1. Change Default Passwords
- Login as SuperAdmin and create new admin users
- Delete or change default user accounts

### 2. SSL Setup (Recommended)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Firewall Configuration
```bash
# Check current rules
sudo ufw status

# Allow additional ports if needed
sudo ufw allow 443  # HTTPS
```

### 4. MongoDB Security
```bash
# Enable authentication (if not already done)
sudo nano /etc/mongod.conf
# Add: security.authorization: enabled

# Create admin user
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: ["userAdminAnyDatabase"]
})
```

## 🛠️ Troubleshooting

### Common Issues

1. **Application not accessible**
   - Check if all services are running: `./health-check.sh`
   - Verify ports are open in security group
   - Check nginx configuration: `sudo nginx -t`

2. **Database connection issues**
   - Check MongoDB status: `sudo systemctl status mongod`
   - Verify connection string in `.env`
   - Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

3. **PM2 process crashed**
   - Check logs: `pm2 logs`
   - Restart: `pm2 restart all`
   - Check memory usage: `free -h`

### Performance Monitoring
```bash
# System resources
htop
df -h
free -h

# Application monitoring
pm2 monit
pm2 logs --lines 50

# Nginx status
sudo systemctl status nginx
```

## 📊 Application Features

### User Roles
- **SuperAdmin**: Full system access, organization management
- **Admin**: Organization-level management, user oversight
- **Agent2**: Lead qualification, duplicate detection
- **Agent1**: Basic lead management

### Key Features
- Real-time notifications via Socket.IO
- Lead management with duplicate detection
- Qualification status tracking
- Role-based access control
- Organization management
- Dashboard analytics

## 📞 Support

For deployment issues or questions:
1. Check logs first: `pm2 logs` and `./health-check.sh`
2. Review nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Monitor system resources: `htop` and `df -h`

---

**Last Updated**: Deployment configuration for EC2 IP 16.171.146.116
