/**
 * JWT Token Utilities
 * Student Management System - LightBrave / DunexSoft
 * Hỗ trợ decode, kiểm tra hạn phiên đăng nhập và định dạng thời gian
 */

export interface DecodedToken {
  id?: string;
  email?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

/**
 * Giải mã payload từ JWT token an toàn phía client (không cần secret)
 */
export function parseJwt(token: string): DecodedToken | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as DecodedToken;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
}

/**
 * Kiểm tra xem token đã hết hạn chưa.
 * @param token JWT token string
 * @param bufferSeconds Thời gian đệm (mặc định 5s) để tránh race condition khi gửi request
 */
export function isTokenExpired(token: string | null, bufferSeconds: number = 5): boolean {
  if (!token) return true;
  const decoded = parseJwt(token);
  if (!decoded || typeof decoded.exp !== 'number') return true;

  // decoded.exp tính bằng giây Unix timestamp
  const expirationMs = decoded.exp * 1000;
  const nowMs = Date.now();
  return nowMs >= expirationMs - bufferSeconds * 1000;
}

/**
 * Lấy số mili-giây còn lại trước khi token hết hạn
 */
export function getTokenTimeRemaining(token: string | null): number {
  if (!token) return 0;
  const decoded = parseJwt(token);
  if (!decoded || typeof decoded.exp !== 'number') return 0;

  const expirationMs = decoded.exp * 1000;
  return Math.max(0, expirationMs - Date.now());
}

/**
 * Định dạng thời gian còn lại thành chuỗi dễ đọc tiếng Việt
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Đã hết hạn';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }
  return `${seconds} giây`;
}
