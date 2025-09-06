#!/bin/bash

# Health Check Script for LMS Application
echo "🏥 LMS Application Health Check"
echo "================================"

# Check if services are running
echo "1. Checking PM2 processes..."
pm2 list

echo -e "\n2. Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

echo -e "\n3. Checking port availability..."
echo "Port 80 (Nginx):"
sudo netstat -tlnp | grep :80

echo "Port 5000 (Node.js API):"
sudo netstat -tlnp | grep :5000

echo -e "\n4. Testing API endpoint..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:5000/api/auth/health || echo "API not responding"

echo -e "\n5. Testing frontend..."
curl -s -o /dev/null -w "Frontend HTTP Status: %{http_code}\n" http://localhost/ || echo "Frontend not responding"

echo -e "\n6. Checking disk space..."
df -h / | tail -1

echo -e "\n7. Checking memory usage..."
free -h

echo -e "\n8. Recent application logs..."
echo "PM2 logs (last 10 lines):"
pm2 logs --lines 10

echo -e "\n9. Nginx error logs (last 5 lines):"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "No nginx errors found"

echo -e "\n✅ Health check completed!"
echo "📋 If all services are running, your application should be accessible at:"
echo "   🌐 Frontend: http://56.228.26.240"
echo "   🔌 API: http://56.228.26.240:5000"
