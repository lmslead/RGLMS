# Lead Management System (LMS)

A full-stack web application for managing leads with role-based access control and real-time updates.

## 🌐 Production Deployment

**Live Application**: http://56.228.26.240  
**Server**: Ubuntu EC2 (56.228.26.240)  
**Database**: MongoDB Atlas (Cloud)

### Quick Deploy
```bash
git clone https://github.com/lmslead/RGLMS.git
cd RGLMS
chmod +x deploy-production.sh
./deploy-production.sh
```

📖 **Full Deployment Guide**: [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md)

## Features

- **Role-based Authentication**: Agent 1 (Lead Generator), Agent 2 (Lead Follower), Admin, SuperAdmin
- **Real-time Updates**: Using Socket.IO for live data synchronization  
- **AI Lead Categorization**: Automatic classification as Hot, Warm, or Cold based on data completeness
- **Dashboard Analytics**: Real-time metrics and conversion tracking
- **Mobile Responsive**: Clean UI with Tailwind CSS
- **Security**: JWT authentication, bcrypt hashing, input validation, rate limiting, CORS protection

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB Atlas (Cloud Database)
- Socket.IO for real-time communication
- JWT for authentication
- bcrypt for password hashing
- Helmet, CORS, express-rate-limit for security
- PM2 for process management

### Frontend
- React.js with hooks
- Tailwind CSS for styling
- Axios for API calls
- Socket.IO client for real-time updates
- React Router for navigation
- Nginx for reverse proxy and static file serving

## Production URLs
- **Frontend**: http://56.228.26.240
- **API**: http://56.228.26.240:5000
- **Health Check**: http://56.228.26.240:5000/api/auth/health

## Setup Instructions

### Quick Start (Recommended)

```bash
# Option 1: Use setup script
setup.bat

# Option 2: Use development start script
start-dev.bat

# Option 3: Use npm script
npm run dev
```

### Manual Setup

#### 1. Install Dependencies

```bash
# Install all dependencies
npm run install-all

# Or install individually:
cd server && npm install
cd ../client && npm install
```

#### 2. Environment Configuration

**Server (.env)**:
```
MONGODB_URI=mongodb+srv://rglms10:RGLMS123@lmsdatabase.jo25hav.mongodb.net/LMSdata
JWT_SECRET=LMSSECRETKEY
PORT=5000
NODE_ENV=development
```

**Client (.env)**:
```
REACT_APP_API_URL=http://localhost:5000
```

#### 3. Database Setup

```bash
# Seed database with admin users
cd server
npm run seed
```

#### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run server  # Backend only
npm run client  # Frontend only
```

## Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Documentation**: See API_DOCS.md

## Default Login Credentials

**SuperAdmin:**
- Email: vishal@lms.com
- Password: @dm!n123

**SuperAdmin 2:**
- Email: jitin@lms.com  
- Password: @dm!n123
JWT_SECRET=your_jwt_secret_key
PORT=5000
NODE_ENV=development
```

### 3. Initialize Database

Run the superadmin seed to create initial superadmin accounts:

```bash
# From the server directory
node seeds/newSuperAdminSeed.js
```

This will create two superadmin accounts:
- vishal@lms.com (Password: @dm!n123)
- jitin@lms.com (Password: @dm!n123)

### 4. Start the Application

```bash
# Start backend server (from server directory)
npm run dev

# Start frontend (from client directory)  
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## User Roles

### Agent 1 (Lead Generator)
- Add new leads with contact information and budget
- Leads are automatically categorized based on data completeness:
  - **Hot** (Red): 80%+ fields completed
  - **Warm** (Yellow): 50-79% fields completed  
  - **Cold** (Blue): <50% fields completed

### Agent 2 (Lead Follower)
- View all leads in real-time
- Update lead status: Interested, Not Interested, Successful, Follow Up
- Schedule follow-up appointments with calendar integration

### Admin
- Real-time dashboard with metrics:
  - Total leads added
  - Total leads processed
  - Conversion rate
  - Success metrics
- Auto-refreshing dashboard (every 10 seconds)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Leads
- `GET /api/leads` - Get all leads (with pagination)
- `POST /api/leads` - Create new lead (Agent 1)
- `PUT /api/leads/:id` - Update lead status (Agent 2)
- `GET /api/leads/stats` - Get dashboard statistics (Admin)

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS protection
- Security headers with Helmet
- Protected routes based on user roles

## Deployment

### Backend (Heroku/Render)
1. Set environment variables in your hosting platform
2. Deploy the server directory
3. Ensure MongoDB Atlas whitelist includes your hosting IP

### Frontend (Vercel/Netlify)
1. Build the React application: `npm run build`
2. Deploy the build directory
3. Update API base URL for production

## Default SuperAdmin Credentials

Two superadmin accounts are available after running the seed:
- Email: vishal@lms.com, Password: @dm!n123
- Email: jitin@lms.com, Password: @dm!n123

Use these accounts to create organizations and manage the system.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
