import { API_BASE_URL } from '@/config/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  
  // Student endpoints
  STUDENT: {
    CLASSES: `${API_BASE_URL}/api/student/classes`,
    ATTENDANCE_SCAN: `${API_BASE_URL}/api/student/attendance/scan`,
    ATTENDANCE_HISTORY: `${API_BASE_URL}/api/student/attendance/history`,
  },
  
  // Teacher endpoints
  TEACHER: {
    CLASSES: `${API_BASE_URL}/api/teacher/classes`,
    CLASS_SESSIONS: (classId: string) => `${API_BASE_URL}/api/teacher/classes/${classId}/sessions`,
    CLASS_STUDENTS: (classId: string) => `${API_BASE_URL}/api/teacher/classes/${classId}/students`,
    REMOVE_STUDENT: (classId: string, studentId: string) => `${API_BASE_URL}/api/teacher/classes/${classId}/students/${studentId}`,
    SESSION_QR: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}/qr`,
    SESSION_END: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}/end`,
    SESSION_RESUME: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}/resume`,
    SESSION_DELETE: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}`,
    SESSION_STATS: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}/stats`,
    CLASS_STATS: (classId: string) => `${API_BASE_URL}/api/teacher/classes/${classId}/stats`,
    SESSION_UPDATE: (sessionId: string) => `${API_BASE_URL}/api/teacher/sessions/${sessionId}`,
    CLASS_DELETE: (classId: string) => `${API_BASE_URL}/api/teacher/classes/${classId}`,
  },
  
  // User endpoints
  USER: {
    DELETE_ACCOUNT: `${API_BASE_URL}/api/users/delete-account`,
  },
};

// Helper function for making authenticated requests
export const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};
