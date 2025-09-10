/**
 * Performance Monitoring Middleware
 * Student Management System - DTECH TEAM
 */

const { Request, Response, NextFunction } = require('express');

class PerformanceMonitor {
  static responseTime() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`⚠️ Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
      });
      
      next();
    };
  }

  static requestLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      const userAgent = req.get('User-Agent') || 'Unknown';
      const ip = req.ip || req.connection.remoteAddress || 'Unknown';
      
      console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - IP: ${ip}`);
      
      next();
    };
  }
}

module.exports = { PerformanceMonitor };
export default PerformanceMonitor;
