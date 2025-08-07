/**
 * API Service Layer
 * Student Management System - DTECH TEAM
 * Centralized API communication với backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.4:3001';

class ApiService {
  private static getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private static async makeRequest(url: string, options: RequestInit = {}) {
    try {
      console.log('🌐 Making API request to:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      return await this.handleResponse(response);
    } catch (error) {
      console.error('🚨 Network request failed:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and server status.');
      }
      
      throw error;
    }
  }

  private static async handleResponse(response: Response, skipAuthRedirect: boolean = false) {
    let errorData;
    
    try {
      errorData = await response.json();
    } catch {
      // If JSON parsing fails, create a generic error object
      errorData = {
        success: false,
        message: `Network error: ${response.status} ${response.statusText}`,
        details: 'Unable to parse server response'
      };
    }

    if (!response.ok) {
      // Handle 401 Unauthorized - clear auth data and redirect (except during login)
      if (response.status === 401 && !skipAuthRedirect) {
        console.warn('🔒 Authentication failed - clearing tokens');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('auth')) {
          window.location.href = '/';
        }
      }
      
      const errorMessage = errorData.message || 
                          errorData.error || 
                          `HTTP error! status: ${response.status} ${response.statusText}`;
      
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        errorData
      });
      
      throw new Error(errorMessage);
    }
    
    return errorData;
  }

  // Auth APIs
  static async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, password }),
    });
    
    const data = await this.handleResponse(response, true); // Skip auth redirect for login
    
    // Store token
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  }

  static async register(userData: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  }) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(userData),
    });
    
    return this.handleResponse(response, true); // Skip auth redirect for register
  }

  static async verifyEmail(email: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email, code }),
    });
    
    return this.handleResponse(response);
  }

  static async resendVerificationCode(email: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ email }),
    });
    
    return this.handleResponse(response);
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Admin: Create Teacher Account
  static async createTeacherAccount(teacherData: {
    name: string;
    email: string;
    password: string;
    role: 'TEACHER';
  }) {
    const response = await fetch(`${API_BASE_URL}/api/admin/create-teacher`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(teacherData),
    });
    
    return this.handleResponse(response);
  }

  static getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      
      // Validate user object has required properties
      if (!user || typeof user !== 'object') return null;
      if (!user.id || !user.email) return null;
      
      return user;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      // Clear invalid user data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  }

  // Health Check
  static async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return this.handleResponse(response);
  }

  // Class APIs
  static async getClasses() {
    const response = await fetch(`${API_BASE_URL}/api/classes`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async createClass(classData: {
    name: string;
    description: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/classes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(classData),
    });
    return this.handleResponse(response);
  }

  static async enrollStudent(classId: string, studentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/classes/enroll`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ classId, studentId }),
    });
    return this.handleResponse(response);
  }

  // Attendance APIs
  static async createAttendanceSession(sessionData: {
    classId: string;
    startTime: string;
    endTime: string;
    locationLat: number;
    locationLng: number;
    radiusMeters: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(sessionData),
    });
    return this.handleResponse(response);
  }

  static async checkIn(checkInData: {
    qrCode: string;
    deviceId: string;
    latitude: number;
    longitude: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/checkin`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(checkInData),
    });
    return this.handleResponse(response);
  }

  static async getSessionReport(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/sessions/${sessionId}/report`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async getQRInfo(qrCode: string) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/qr/${qrCode}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async submitAttendance(data: { sessionId: number; location: { latitude: number; longitude: number } }) {
    const response = await fetch(`${API_BASE_URL}/api/attendance/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // User APIs
  static async getUsers() {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Student APIs
  static async scanQRAndCheckIn(qrData: string, latitude?: number, longitude?: number) {
    const body: {
      qrData: string;
      latitude?: number;
      longitude?: number;
    } = { qrData };
    if (latitude !== undefined) body.latitude = latitude;
    if (longitude !== undefined) body.longitude = longitude;

    return this.makeRequest(`${API_BASE_URL}/api/student/scan-qr`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
  }

  static async getAttendanceHistory(classId?: string) {
    const url = new URL(`${API_BASE_URL}/api/student/attendance`);
    if (classId) {
      url.searchParams.append('classId', classId);
    }

    return this.makeRequest(url.toString(), {
      headers: this.getHeaders(),
    });
  }

  static async getStudentClasses() {
    return this.makeRequest(`${API_BASE_URL}/api/student/classes`, {
      headers: this.getHeaders(),
    });
  }

  static async getStudentProfile() {
    return this.makeRequest(`${API_BASE_URL}/api/student/profile`, {
      headers: this.getHeaders(),
    });
  }
}

export default ApiService;
