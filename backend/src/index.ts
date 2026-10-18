/**
 * Main Server Entry Point (TypeScript)
 * Student Management System - DTECH TEAM
 * Khởi tạo Express server với đầy đủ middleware và routes
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import scheduleRoutes from './routes/schedule';

// Import controllers
import { HealthController } from './controllers/health';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';

// Initialize Express app
const app = express();
// Trust reverse proxy (Nginx)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// 1. CORS Configuration - Đặt TRƯỚC mọi middleware khác và xử lý preflight OPTIONS
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Cho phép dynamic origin để hỗ trợ cả HTTP IP lẫn HTTPS domain (Vercel, sslip.io, LAN, localhost)
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Cache-Control', 'Pragma', 'x-network-type'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Cache preflight OPTIONS trong 24 giờ để giảm độ trễ và tránh lỗi preflight rớt mạng
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Security Middleware - bảo mật headers nhưng cho phép cross-origin resource sharing
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// Health check endpoints (Không bị ảnh hưởng bởi rate limiter hay body parsing)
app.get('/health', HealthController.healthCheck);
app.get('/health/quick', HealthController.quickStatus);

// Rate limiting cho API routes - chống spam nhưng hỗ trợ SPA và phân biệt môi trường
app.use('/api', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '5mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '5mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/schedule', scheduleRoutes);

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