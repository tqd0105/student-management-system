/**
 * Rate Limiting Configuration (TypeScript)
 * Student Management System - LightBrave / DTECH Team
 * 
 * Tối ưu hóa giới hạn request:
 * - Phân tách rõ ràng giữa endpoint nhạy cảm (Auth) và API nghiệp vụ thông thường.
 * - Môi trường development có ngưỡng rất cao (10,000 req) để dev/test không bị nghẽn.
 * - Môi trường production hỗ trợ SPA với giới hạn hào phóng (mặc định 2,000 req/15 phút).
 * - Tự động bỏ qua request CORS preflight (OPTIONS) và Health check.
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

interface RateLimitResponse {
  success: boolean;
  message: string;
  error: string;
  retryAfter?: string;
  timestamp?: string;
}

const isDev = process.env.NODE_ENV === 'development';

// 1. General API rate limiting (Áp dụng cho các route /api thông thường)
const generalWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 phút
const generalMaxRequests = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || (isDev ? '10000' : '2000'),
  10
);

export const generalLimiter = rateLimit({
  windowMs: generalWindowMs,
  max: generalMaxRequests,
  validate: { trustProxy: false },
  standardHeaders: true, // Trả về headers RateLimit-*
  legacyHeaders: false,
  skip: (req: Request) => {
    // Bỏ qua preflight CORS và health check
    if (req.method === 'OPTIONS') return true;
    if (req.path === '/health' || req.path === '/health/quick') return true;
    return false;
  },
  handler: (req: Request, res: Response) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Hệ thống nhận quá nhiều yêu cầu từ IP của bạn. Vui lòng đợi trong giây lát rồi thử lại.',
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: `${Math.ceil(generalWindowMs / 60000)} phút`,
      timestamp: new Date().toISOString()
    };
    res.status(429).json(response);
  }
});

// 2. Auth endpoints rate limiting (Chống brute-force login/register nhưng không khóa nhầm người dùng)
const authWindowMs = 15 * 60 * 1000; // 15 phút
const authMaxRequests = isDev ? 100 : 30; // 30 lần thử trong 15 phút ở production

export const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMaxRequests,
  validate: { trustProxy: false },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
  handler: (req: Request, res: Response) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Quá nhiều lần thử xác thực. Vui lòng thử lại sau 15 phút vì lý do bảo mật.',
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 phút',
      timestamp: new Date().toISOString()
    };
    res.status(429).json(response);
  }
});

// 3. QR Check-in rate limiting (Chống spam quét mã dồn dập)
export const checkInLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: isDev ? 50 : 15, // 15 lần/phút ở prod
  validate: { trustProxy: false },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
  handler: (req: Request, res: Response) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Thao tác điểm danh quá nhanh. Vui lòng đợi 1 phút trước khi quét lại.',
      error: 'CHECKIN_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 phút',
      timestamp: new Date().toISOString()
    };
    res.status(429).json(response);
  }
});

// 4. Admin panel rate limiting
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: isDev ? 2000 : 500, // 500 requests/5 phút ở prod
  validate: { trustProxy: false },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
  handler: (req: Request, res: Response) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Quá nhiều yêu cầu trong trang quản trị. Vui lòng thử lại sau ít phút.',
      error: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: '5 phút',
      timestamp: new Date().toISOString()
    };
    res.status(429).json(response);
  }
});
