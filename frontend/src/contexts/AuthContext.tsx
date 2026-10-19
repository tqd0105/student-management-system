/**
 * Authentication Context
 * Student Management System - DunexSoft / LightBrave
 * Quản lý authentication state toàn app & giám sát phiên đăng nhập 6h
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import ApiService from '@/services/ApiService';
import { isTokenExpired } from '@/utils/token';
import SessionExpiredModal from '@/components/auth/SessionExpiredModal';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  avatar?: string | null;
  studentProfile?: {
    studentCode: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    parentName?: string;
    parentPhone?: string;
    status?: string;
    notes?: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isSessionExpired: boolean;
  triggerSessionExpired: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    // Check if user is logged in on app start
    const currentUser = ApiService.getCurrentUser();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (currentUser && token) {
      if (isTokenExpired(token)) {
        const isHomePage = typeof window !== 'undefined' && window.location.pathname === '/';
        if (!isHomePage) {
          // Khi truy cập vào trang bảo vệ mà token đã hết hạn 6h -> hiển thị modal
          setUser(currentUser);
          setIsSessionExpired(true);
        } else {
          // Nếu đang ở trang chủ, dọn dẹp sạch token cũ
          ApiService.logout();
          setUser(null);
        }
      } else {
        setUser(currentUser);
        // Fetch latest profile from server to ensure studentProfile and studentCode are synced
        ApiService.getProfile()
          .then((res) => {
            if (res?.success && res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('user', JSON.stringify(res.data.user));
            }
          })
          .catch(() => {});
      }
    }
    setLoading(false);
  }, []);

  // Chủ động giám sát phiên đăng nhập theo thời gian thực (6 giờ) & bắt sự kiện 401
  useEffect(() => {
    if (!user || isSessionExpired) return;

    const checkTokenExpiry = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && isTokenExpired(token)) {
        console.warn('🔒 Session expired (6h limit reached)');
        setIsSessionExpired(true);
      }
    };

    // Định kỳ kiểm tra mỗi 10 giây
    const interval = setInterval(checkTokenExpiry, 10000);

    // Kiểm tra ngay khi người dùng chuyển lại tab (wake screen / active tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkTokenExpiry();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Lắng nghe sự kiện 401 khi token bị backend từ chối
    const handleSessionExpiredEvent = () => {
      console.warn('🔒 401 Unauthorized caught - triggering session expired modal');
      setIsSessionExpired(true);
    };
    window.addEventListener('auth:session_expired', handleSessionExpiredEvent);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('auth:session_expired', handleSessionExpiredEvent);
    };
  }, [user, isSessionExpired]);

  const handleSessionExpiredLogin = () => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      try {
        sessionStorage.setItem(
          'redirect_after_login',
          window.location.pathname + window.location.search
        );
      } catch {}
    }
    setIsSessionExpired(false);
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const triggerSessionExpired = () => {
    setIsSessionExpired(true);
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.login(email, password);
      if (response.success) {
        setIsSessionExpired(false);
        setUser(response.data.user);
      } else {
        setError(response.message || 'Login failed');
        throw new Error(response.message);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  }) => {
    try {
      setError(null);
      setLoading(true);
      const response = await ApiService.register(userData);
      if (!response.success) {
        setError(response.message || 'Registration failed');
        throw new Error(response.message);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    ApiService.logout();
    setUser(null);
    setError(null);
    setIsSessionExpired(false);
  };

  const clearError = () => {
    setError(null);
  };

  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    try {
      setError(null);
      const res = await ApiService.updateProfile(data);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('user', JSON.stringify(res.data.user));
      } else {
        throw new Error(res.message || 'Cập nhật hồ sơ thất bại');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại';
      setError(errorMessage);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isSessionExpired,
    triggerSessionExpired,
    login,
    register,
    logout,
    clearError,
    updateProfile,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'TEACHER',
    isStudent: user?.role === 'STUDENT',
    isAdmin: user?.role === 'ADMIN',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        isOpen={isSessionExpired}
        user={user}
        onReLogin={handleSessionExpiredLogin}
      />
    </AuthContext.Provider>
  );
};
