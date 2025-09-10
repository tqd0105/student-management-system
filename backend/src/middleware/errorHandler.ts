/**
 * Global Error Handler (TypeScript)
 * Student Management System - LightBrave Team
 */

import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  errors?: any;
}

interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
  errors?: any;
  timestamp: string;
  path?: string;
  method?: string;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
  console.error('🚨 Error occurred:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    const response: ErrorResponse = {
      success: false,
      message: 'Duplicate entry. This record already exists.',
      error: 'DUPLICATE_ENTRY',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    };
    res.status(400).json(response);
    return;
  }

  if (err.code === 'P2025') {
    const response: ErrorResponse = {
      success: false,
      message: 'Record not found.',
      error: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    };
    res.status(404).json(response);
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const response: ErrorResponse = {
      success: false,
      message: 'Invalid token',
      error: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    };
    res.status(401).json(response);
    return;
  }

  if (err.name === 'TokenExpiredError') {
    const response: ErrorResponse = {
      success: false,
      message: 'Token expired',
      error: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    };
    res.status(401).json(response);
    return;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    const response: ErrorResponse = {
      success: false,
      message: 'Validation failed',
      errors: err.errors,
      error: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    };
    res.status(400).json(response);
    return;
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  const response: ErrorResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err.stack : 'SERVER_ERROR',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    success: false,
    message: 'The requested endpoint does not exist',
    error: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  res.status(404).json(response);
};
