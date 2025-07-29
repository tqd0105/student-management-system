export interface UserPayload {
  userId: string; // Thay đổi từ 'id' thành 'userId' để phù hợp với auth controller
  email: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  name: string;
  isEmailVerified?: boolean; // Thêm field để kiểm tra email đã verify
}

export interface AuthResponse {
  token: string;
  user: UserPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface AttendanceSession {
  id: string;
  teacherId: string;
  classId: string;
  startTime: Date;
  endTime: Date;
  locationLat?: number;
  locationLng?: number;
  radiusMeters?: number;
  qrCode: string;
  isActive: boolean;
}

export interface CheckInRequest {
  sessionId: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
