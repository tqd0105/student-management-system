// API Configuration - Auto-detect device
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // if (hostname === 'localhost' || hostname === '127.0.0.1') {
    //   return 'http://localhost:3001';
    // } else {
    //   return 'https://student-management-system-udhy.onrender.com';
    // }
      return 'https://student-management-system-udhy.onrender.com';

  }
  return 'https://student-management-system-udhy.onrender.com';
};

export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_URL || 'https://student-management-system-udhy.onrender.com'
  : getApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
  },
  STUDENT: {
    CLASSES: `${API_BASE_URL}/api/student/classes`,
    ATTENDANCE_SCAN: `${API_BASE_URL}/api/student/attendance/scan`,
    ATTENDANCE_HISTORY: `${API_BASE_URL}/api/student/attendance/history`,
  },
  TEACHER: {
    CLASSES: `${API_BASE_URL}/api/teacher/classes`,
    SESSIONS: `${API_BASE_URL}/api/teacher/sessions`,
  }
};
