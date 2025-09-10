/**
 * Rate Limiting Configuration (TypeScript)
 * Student Management System - LightBrave Team
 */

import rateLimit from 'express-rate-limit';

interface RateLimitResponse {
  success: boolean;
  message: string;
  error: string;
  retryAfter?: string;
}

// General API rate limiting
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  } as RateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Rate limit exceeded. Please slow down your requests.',
      error: 'GENERAL_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    };
    res.status(429).json(response);
  }
});

// Auth endpoints rate limiting (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  } as RateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Too many login attempts. Account temporarily locked for security.',
      error: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes'
    };
    res.status(429).json(response);
  }
});

// QR Check-in rate limiting
export const checkInLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 check-in attempts per minute
  message: {
    success: false,
    message: 'Too many check-in attempts, please wait before trying again.',
    error: 'CHECKIN_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  } as RateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response: RateLimitResponse = {
      success: false,
      message: 'Check-in rate limit exceeded. Please wait before scanning again.',
      error: 'CHECKIN_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute'
    };
    res.status(429).json(response);
  }
});

// Admin panel rate limiting (moderate)
export const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit admin operations
  message: {
    success: false,
    message: 'Admin rate limit exceeded.',
    error: 'ADMIN_RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString()
  } as RateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false
});
