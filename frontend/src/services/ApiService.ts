/**
 * API Service Layer
 * Student Management System - DTECH TEAM
 * Centralized API communication với backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://student-management-system-udhy.onrender.com';

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

  static async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static loginWithGoogle() {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  }

  // ── Teacher: Student Management ──

  /** Lấy tất cả SV trong hệ thống (kèm tìm kiếm) */
  static async getTeacherAllStudents(params?: { search?: string; classId?: string }) {
    const url = new URL(`${API_BASE_URL}/api/teacher/students`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.classId) url.searchParams.set('classId', params.classId);
    const response = await fetch(url.toString(), { headers: this.getHeaders() });
    return this.handleResponse(response);
  }

  /** Lấy SV trong lớp (kèm thống kê điểm danh) */
  static async getClassStudents(classId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/students`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /** Thêm SV vào lớp (bằng email) */
  static async addStudentToClass(classId: string, studentEmail: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/students`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentEmail }),
    });
    return this.handleResponse(response);
  }

  /** Xóa SV khỏi lớp */
  static async removeStudentFromClass(classId: string, studentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/students/${studentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ── Teacher: Manual Attendance ──
  static async markManualAttendance(sessionId: string, studentId: string, status: 'PRESENT' | 'LATE' | 'ABSENT') {
    const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/${sessionId}/attendance`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ studentId, status }),
    });
    return this.handleResponse(response);
  }

  static async getSessionAttendanceStats(sessionId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/sessions/${sessionId}/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // ── Teacher: Assignments & Grades ──
  static async getClassAssignments(classId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/assignments`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async createAssignment(classId: string, data: { title: string; description?: string | null; dueDate?: string | null; attachmentUrl?: string | null; materialId?: string | null }) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/assignments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async updateAssignment(assignmentId: string, data: { title?: string; description?: string | null; dueDate?: string | null; attachmentUrl?: string | null; materialId?: string | null }) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async getClassMaterials(classId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/materials`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async deleteAssignment(assignmentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async getClassGrades(classId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/grades`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async updateGrades(classId: string, updates: { studentId: string; assignmentId: string; score?: number | null; feedback?: string | null }[]) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/classes/${classId}/grades`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ updates }),
    });
    return this.handleResponse(response);
  }

  // Teacher: Student Management (Quản lý hồ sơ & thông tin học sinh)
  static async getManagedStudents(params?: { search?: string; classId?: string }) {
    const url = new URL(`${API_BASE_URL}/api/teacher/managed-students`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.classId) url.searchParams.set('classId', params.classId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async getStudentProfileDetail(studentId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/managed-students/${studentId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async updateStudentProfile(studentId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/managed-students/${studentId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async createQuickStudent(data: {
    name: string;
    email: string;
    password?: string;
    classId?: string;
    phone?: string;
    studentCode?: string;
    gender?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/managed-students`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // Teacher: Tuition & Fee Management (Quản lý học phí)
  static async getTuitionFees(params?: { classId?: string; status?: string; search?: string; studentId?: string }) {
    const url = new URL(`${API_BASE_URL}/api/teacher/tuition-fees`);
    if (params?.classId && params.classId !== 'ALL') url.searchParams.set('classId', params.classId);
    if (params?.status && params.status !== 'ALL') url.searchParams.set('status', params.status);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.studentId) url.searchParams.set('studentId', params.studentId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async getTuitionStats(classId?: string) {
    const url = new URL(`${API_BASE_URL}/api/teacher/tuition-fees/stats`);
    if (classId && classId !== 'ALL') url.searchParams.set('classId', classId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  static async createTuitionFee(data: {
    studentId: string;
    classId?: string;
    title: string;
    amount: number;
    dueDate?: string;
    note?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/tuition-fees`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async recordTuitionPayment(feeId: string, data: {
    amountPaid: number;
    paymentMethod?: string;
    paidAt?: string;
    note?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/tuition-fees/${feeId}/payment`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async updateTuitionFee(feeId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/tuition-fees/${feeId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  static async deleteTuitionFee(feeId: string) {
    const response = await fetch(`${API_BASE_URL}/api/teacher/tuition-fees/${feeId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
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

  static async getStudentGrades(classId?: string) {
    const url = new URL(`${API_BASE_URL}/api/student/grades`);
    if (classId) {
      url.searchParams.append('classId', classId);
    }
    return this.makeRequest(url.toString(), {
      headers: this.getHeaders(),
    });
  }

  static async getStudentTuitionFees() {
    return this.makeRequest(`${API_BASE_URL}/api/student/tuition-fees`, {
      headers: this.getHeaders(),
    });
  }

  /** Lấy danh sách bài tập & hạn nộp của sinh viên */
  static async getStudentAssignments(params?: { classId?: string; status?: string }) {
    const url = new URL(`${API_BASE_URL}/api/student/assignments`);
    if (params?.classId) url.searchParams.set('classId', params.classId);
    if (params?.status) url.searchParams.set('status', params.status);
    return this.makeRequest(url.toString(), {
      headers: this.getHeaders(),
    });
  }

  /** Nộp bài tập dạng URL (Google Drive, GitHub, Figma, Docs...) */
  static async submitAssignment(assignmentId: string, data: { submissionUrl: string; submissionNotes?: string }) {
    return this.makeRequest(`${API_BASE_URL}/api/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
  }
}

export default ApiService;
