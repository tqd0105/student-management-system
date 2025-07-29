import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { UserPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '6h';
const SALT_ROUNDS = 12;

export class AuthUtils {
  /**
   * Generate JWT token for user
   */
  static generateToken(payload: Omit<UserPayload, 'iat' | 'exp'>): string {
    const options: SignOptions = { /* Interface của lib, options như expiresIn, algorithm, ... */
      expiresIn: '6h'
    };
    return jwt.sign(payload, JWT_SECRET, options); /* Hàm từ lib: tạo token từ payload */
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): UserPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as UserPayload; /* Hàm từ lib: xác thực token và trả về payload(đã giải mã) */
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token for email verification /?token=abc123
   */
  static generateEmailToken(): string {
    return crypto.randomBytes(32).toString('hex'); /* Tạo chuỗi ngẫu nhiên 32 bytes và chuyển sang hex */
  }

  /**
   * Generate device ID from user agent and IP
   */
  static generateDeviceId(userAgent: string, ip: string): string {
    const hash = crypto.createHash('sha256'); /* Băm thông tin thiết bị thành chuỗi */
    hash.update(`${userAgent}-${ip}`); /* Cập nhật hash kết hợp thông tin thiết bị */
    return hash.digest('hex').substring(0, 16); /* Trả về 16 ký tự đầu tiên của chuỗi băm dạng hex*/
  }

  /**
   * Check if password meets security requirements
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export for CommonJS compatibility
module.exports = { 
  AuthUtils,
  generateToken: AuthUtils.generateToken,
  verifyToken: AuthUtils.verifyToken,
  hashPassword: AuthUtils.hashPassword,
  comparePassword: AuthUtils.comparePassword,
  generateEmailToken: AuthUtils.generateEmailToken,
  validatePassword: AuthUtils.validatePassword
};
