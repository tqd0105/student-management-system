// API Configuration - Auto-detect device & network
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // 1. Môi trường Production (Vercel hoặc custom production domain)
    const isProductionHost = hostname.includes('vercel.app') || (process.env.NODE_ENV === 'production' && !hostname.includes('loca.lt') && !hostname.includes('ngrok'));
    if (isProductionHost && !hostname.includes('loca.lt') && !hostname.includes('ngrok') && !hostname.includes('trycloudflare.com')) {
      return process.env.NEXT_PUBLIC_API_URL || 'https://student-management-system-udhy.onrender.com';
    }

    // 2. Môi trường Test qua Tunnel (Localtunnel, Ngrok, Cloudflare)
    if (hostname.includes('loca.lt') || hostname.includes('ngrok') || hostname.includes('trycloudflare.com')) {
      return '';
    }

    // 3. Môi trường LAN (Wi-Fi nội bộ)
    const isLAN = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(hostname);
    if (isLAN) {
      if (protocol === 'https:') {
        return '';
      }
      return `http://${hostname}:3001`;
    }

    // 4. Localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://student-management-system-udhy.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

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
