import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

export const verifyToken = (token: string): UserPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET) as UserPayload;
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const requireAuth = (allowedRoles: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const token = extractTokenFromHeader(req);
      
      if (!token) {
        res.status(401).json({ 
          error: 'Access denied. No token provided.' 
        });
        return;
      }

      const payload = verifyToken(token);
      
      // Check if user role is allowed
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        res.status(403).json({ 
          error: 'Access denied. Insufficient permissions.' 
        });
        return;
      }

      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      });
      return;
    }
  };
};

export const requireAdmin = requireAuth(['ADMIN']);
export const requireTeacher = requireAuth(['ADMIN', 'TEACHER']);
export const requireStudent = requireAuth(['ADMIN', 'TEACHER', 'STUDENT']);

// Aliases for backward compatibility
export const authMiddleware = requireAuth([]);
export const adminMiddleware = requireAuth(['ADMIN']);

// Export for CommonJS compatibility
module.exports = { 
  extractTokenFromHeader,
  verifyToken,
  requireAuth,
  requireAdmin, 
  requireTeacher,
  requireStudent,
  authMiddleware,
  adminMiddleware
};
