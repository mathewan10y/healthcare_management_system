// Load environment variables FIRST - before any other imports
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const morgan = require('morgan');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initCronSweeper } = require('./services/cronSweeper');

const app = express();
const server = http.createServer(app);

// CORS
// Support multiple allowed origins (comma-separated) and include 127.0.0.1 fallback
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps, curl)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);
global.io = io;

// Online users tracking
let onlineUsers = {};

const addUser = (userId, socketId) => {
  onlineUsers[userId] = socketId;
};

const removeUser = (socketId) => {
  Object.keys(onlineUsers).forEach(userId => {
    if (onlineUsers[userId] === socketId) {
      delete onlineUsers[userId];
    }
  });
};

// Socket.IO connection handling with error handling & room subscription
io.on('connection', (socket) => {
  logger.info(`Socket.IO: User connected - ${socket.id}`);

  socket.on('newUser', (userId) => {
    try {
      addUser(userId, socket.id);
      socket.join(`user_${userId}`);
      socket.join(`patient_${userId}`);
      socket.join(`doctor_${userId}`);
      logger.info(`Socket.IO: User ${userId} registered and joined user rooms`);
    } catch (error) {
      logger.error('Socket.IO: Error adding user', { error: error.message, userId, socketId: socket.id });
    }
  });

  socket.on('joinAppointment', (appointmentId) => {
    try {
      socket.join(`appointment_${appointmentId}`);
      logger.info(`Socket.IO: Socket ${socket.id} joined appointment_${appointmentId}`);
    } catch (error) {
      logger.error('Socket.IO: Error joining appointment room', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    try {
      removeUser(socket.id);
      logger.info(`Socket.IO: User disconnected - ${socket.id}`);
    } catch (error) {
      logger.error('Socket.IO: Error removing user', { error: error.message, socketId: socket.id });
    }
  });

  socket.on('error', (error) => {
    logger.error('Socket.IO: Socket error', { error: error.message, socketId: socket.id });
  });
});

// Global notification sender function with error handling
const sendNotification = (userId, notification) => {
  try {
    const receiverSocketId = onlineUsers[userId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('getNotification', notification);
      logger.info(`Notification sent to user: ${userId}`);
    } else {
      logger.debug(`User ${userId} not online, notification will be shown on next login`);
    }
  } catch (error) {
    logger.error('Error sending notification', { error: error.message, userId });
  }
};

// Make sendNotification available globally
app.set('sendNotification', sendNotification);
global.sendNotification = sendNotification;

// HTTP Request Logging with Morgan
app.use(morgan('combined', { stream: logger.stream }));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser (for httpOnly JWT cookies)
app.use(cookieParser());

// Serve static files for uploaded images
app.use('/uploads', express.static('uploads'));

// Serve static files for doctor photos
app.use('/doctor-photos', express.static('public/doctor-photos'));

// Mongo connection with proper error handling
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info('MongoDB connected successfully');
    // Initialize Nightly Cron Sweeper
    initCronSweeper();
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', { error: err.message, stack: err.stack });
    process.exit(1); // Exit if cannot connect to database
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// Routes
app.get('/', (req, res) => res.json({ message: 'Healthcare System API' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/specializations', require('./routes/specializations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai/check-symptoms', require('./routes/aiSymptomChecker'));
app.use('/api/mock-payments', require('./routes/mockPayments'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/medical-history', require('./routes/medicalHistory'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/pharmacy', require('./routes/pharmacy'));

// 404 Handler - Must be after all routes
app.use(notFound);

// Global Error Handler - Must be last
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', { error: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
