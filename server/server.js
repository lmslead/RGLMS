const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { formatEasternTime, getEasternNow } = require('./utils/timeFilters');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const organizationRoutes = require('./routes/organizations');

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

const server = http.createServer(app);
const dev = process.env.NODE_ENV !== 'production';
const io = socketIo(server, {
  cors: {
    origin: dev ? true : [
      `http://16.171.146.116`,
      `http://16.171.146.116:3000`,
      `http://16.171.146.116:5000`,
      `http://16.171.146.116:80`,
      `http://16.171.146.116:443`
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: dev ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : [
    `http://16.171.146.116`,
    `http://16.171.146.116:3000`,
    `http://16.171.146.116:5000`,
    `http://16.171.146.116:80`,
    `http://16.171.146.116:443`
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Auth rate limiting (more restrictive but reasonable for development)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs for auth (increased)
  message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Logging
app.use(morgan('combined'));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/organizations', organizationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from React build
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Catch all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    }
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: formatEasternTime(getEasternNow()),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB');
    });
    
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Full error:', error);
    // Don't exit immediately in development, retry connection
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`Server listening on all interfaces (0.0.0.0:${PORT})`);
    console.log(`Server address:`, server.address());
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.error('Database connection failed:', err);
  process.exit(1);
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development, just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    mongoose.connection.close();
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
  server.close(() => {
    mongoose.connection.close();
    console.log('Process terminated');
  });
});

module.exports = { app, io };
