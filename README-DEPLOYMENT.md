# 🎯 LMS-TRIAL - Lead Management System

A comprehensive MERN stack Lead Management System with role-based access control, real-time notifications, and duplicate lead detection.

## 🌟 Features

- **Role-Based Access Control**: SuperAdmin, Admin, Agent1, Agent2 with specific permissions
- **Real-Time Notifications**: Socket.IO integration for live updates
- **Duplicate Lead Detection**: Automatic detection based on email/phone
- **Lead Qualification**: Status tracking and filtering capabilities
- **Responsive UI**: Modern design with Tailwind CSS
- **Secure Authentication**: JWT-based authentication system

## 👥 User Roles

- **SuperAdmin**: Full system access and user management
- **Admin**: Lead management and oversight
- **Agent1**: Lead creation and management
- **Agent2**: Lead qualification and status updates

## 🚀 Quick Deployment to EC2

### Prerequisites
- Ubuntu 20.04+ EC2 instance (IP: 16.171.146.116)
- SSH access with sudo privileges

### Step 1: Upload Project
```bash
scp -r -i your-key.pem ./LMS-TRIAL ubuntu@16.171.146.116:/home/ubuntu/
```

### Step 2: Deploy
```bash
ssh -i your-key.pem ubuntu@16.171.146.116
sudo mv /home/ubuntu/LMS-TRIAL /var/www/lms-trial
sudo chown -R ubuntu:ubuntu /var/www/lms-trial
cd /var/www/lms-trial
chmod +x deploy-to-ec2.sh
./deploy-to-ec2.sh
```

### Step 3: Verify Deployment
```bash
chmod +x verify-deployment.sh
./verify-deployment.sh
```

## 🌐 Access Your Application

- **Frontend**: http://16.171.146.116
- **Backend API**: http://16.171.146.116/api

## 🔄 Future Updates

Use the auto-deploy script for updates:
```bash
cd /var/www/lms-trial
./auto-deploy.sh
```

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT-GUIDE.md)**: Complete deployment instructions
- **Nginx Config**: `nginx.conf`
- **PM2 Config**: `ecosystem.config.json`

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Process Manager**: PM2
- **Web Server**: Nginx
- **Authentication**: JWT

## 📋 Default Credentials

After deployment, create a SuperAdmin user:
```bash
cd /var/www/lms-trial
node server/seeds/newSuperAdminSeed.js
```

## 🔧 Maintenance Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs lms-trial-backend

# Restart application
pm2 restart lms-trial-backend

# Check Nginx status
sudo systemctl status nginx

# Check MongoDB status
sudo systemctl status mongod
```

## 🚨 Important Security Notes

1. **Change JWT Secret**: Update `JWT_SECRET` in `ecosystem.config.json`
2. **Set up SSL**: Use Let's Encrypt for HTTPS
3. **Configure Firewall**: Ensure proper port access
4. **Regular Backups**: Set up MongoDB backup strategy

## 📞 Support

For deployment issues, check the logs:
- **Application Logs**: `/var/www/lms-trial/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

---

**🎉 Your LMS-TRIAL application is ready for production!**
