/**
 * Enhanced Health Check Endpoint (TypeScript)
 * Student Management System - LightBrave Team
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MemoryUsage {
  rss: string;
  heapTotal: string;
  heapUsed: string;
  external: string;
}

interface ServerStatus {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
}

interface DatabaseStatus {
  status: string;
  type: string;
  message: string;
  error?: string;
}

interface PerformanceStatus {
  responseTime: string;
  status: string;
}

interface HealthResponse {
  success: boolean;
  message: string;
  data?: {
    server: ServerStatus;
    database: DatabaseStatus;
    memory: MemoryUsage;
    performance: PerformanceStatus;
    features: Record<string, string>;
    team: string;
    project: string;
  };
  error?: string;
  timestamp: string;
}

export class HealthController {
  /**
   * Comprehensive health check
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Basic server check
      const serverStatus: ServerStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };

      // Database connectivity check
      let databaseStatus: DatabaseStatus;
      try {
        await prisma.$queryRaw`SELECT 1`;
        databaseStatus = {
          status: 'connected',
          type: 'PostgreSQL',
          message: 'Database connection successful'
        };
      } catch (dbError: any) {
        databaseStatus = {
          status: 'disconnected',
          type: 'PostgreSQL',
          message: 'Database connection failed',
          error: dbError.message
        };
      }

      // Memory usage
      const memoryUsage = process.memoryUsage();
      const memoryStatus: MemoryUsage = {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100} MB`
      };

      // Response time
      const responseTime = Date.now() - startTime;
      const performanceStatus: PerformanceStatus = {
        responseTime: `${responseTime}ms`,
        status: responseTime < 200 ? 'excellent' : responseTime < 500 ? 'good' : 'slow'
      };

      // Overall system status
      const overallStatus = databaseStatus.status === 'connected' ? 'healthy' : 'degraded';

      const response: HealthResponse = {
        success: true,
        message: `🚀 Student Management System API is ${overallStatus}`,
        timestamp: new Date().toISOString(),
        data: {
          server: serverStatus,
          database: databaseStatus,
          memory: memoryStatus,
          performance: performanceStatus,
          features: {
            authentication: 'enabled',
            qrAttendance: 'enabled',
            rateLimiting: 'enabled',
            errorHandling: 'enabled',
            adminPanel: 'enabled'
          },
          team: 'LightBrave Team',
          project: 'QR-Based Student Management System'
        }
      };

      res.status(200).json(response);

    } catch (error: any) {
      const errorResponse: HealthResponse = {
        success: false,
        message: '❌ System health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      res.status(503).json(errorResponse);
    }
  }

  /**
   * Quick status check (lightweight)
   */
  static async quickStatus(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: '✅ Server is running',
      uptime: process.uptime(),
      team: 'LightBrave Team'
    });
  }
}
