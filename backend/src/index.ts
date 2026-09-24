/**
 * Main Server Entry Point (TypeScript)
 * Student Management System - DTECH TEAM
 * Khởi tạo Express server với đầy đủ middleware và routes
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import os from 'os';
import prisma from './prisma';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import classRoutes from './routes/class';
import attendanceRoutes from './routes/attendance';
import adminRoutes from './routes/admin';
import teacherRoutes from './routes/teacher';
import studentRoutes from './routes/student';

// Import controllers
import { HealthController } from './controllers/health';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Security Middleware - bảo mật headers
app.use(helmet());

// CORS Configuration - Tự động cho phép localhost, Vercel và mọi IP trong mạng LAN (không cần hardcode)
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Cho phép các request không có origin header (mobile app, postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    // 1. Cho phép localhost (bất kỳ port nào: 3000, 3001, ...)
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    // 2. Tự động cho phép mọi IP mạng nội bộ LAN:
    //    192.168.x.x, 10.x.x.x, 172.16-31.x.x, 0.0.0.0 (bất kỳ port nào)
    const isLocalLAN = /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0)(:\d+)?$/.test(origin);

    // 3. Domain Production trên Vercel hoặc cấu hình trong .env (kể cả preview deploy *.vercel.app)
    const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin) || origin === process.env.FRONTEND_URL;

    // Trong môi trường dev, hoặc nếu khớp các điều kiện trên -> Cho phép
    if (isLocalhost || isLocalLAN || isVercel || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting - chống spam requests
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 phút
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // tối đa 100 requests
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware
  app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '5mb' }));

// Health check endpoints
app.get('/health', HealthController.healthCheck);
app.get('/health/quick', HealthController.quickStatus);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown - tắt server an toàn
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
const getLocalIP = (): string => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return '0.0.0.0';
};

app.listen(Number(PORT), '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`
🚀 Student Management System API
📌 Server running on port ${PORT}
🌐 Environment: ${process.env.NODE_ENV || 'development'}
👥 Developed by: DTECH TEAM
📱 Local:   http://localhost:${PORT}/health
📱 Network: http://${localIP}:${PORT}/health
  `);
});

export default app;