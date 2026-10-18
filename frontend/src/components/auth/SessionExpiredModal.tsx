/**
 * Session Expired Modal
 * Student Management System - LightBrave / DTECH TEAM
 * Modal thông báo hết phiên đăng nhập chuẩn mực, chuyên nghiệp và bảo mật
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Clock, LogIn, ShieldAlert, ShieldCheck } from 'lucide-react';

interface SessionExpiredModalProps {
  isOpen: boolean;
  user?: {
    name?: string;
    email?: string;
    role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
    avatar?: string | null;
  } | null;
  onReLogin: () => void;
  autoRedirectSeconds?: number;
}

export default function SessionExpiredModal({
  isOpen,
  user,
  onReLogin,
  autoRedirectSeconds = 60,
}: SessionExpiredModalProps) {
  const [countdown, setCountdown] = useState(autoRedirectSeconds);

  // Countdown timer to automatically redirect if user is inactive
  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoRedirectSeconds);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onReLogin, autoRedirectSeconds]);

  // Handle Enter key for quick re-login
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onReLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onReLogin]);

  if (!isOpen) return null;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Quản trị viên',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'TEACHER':
        return {
          label: 'Giảng viên',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'STUDENT':
      default:
        return {
          label: 'Sinh viên',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top ambient color bar */}
        {/* <div className="h-2 w-full bg-gradient-to-r from-red-600 via-orange-600 to-rose-600" /> */}

        <div className="p-6 sm:p-7">
          {/* Header Icon with pulse badge */}
          <div className="relative mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/15 animate-ping opacity-75" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-400 flex items-center justify-center shadow-inner">
              <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center space-y-2">
            <h2
              id="session-expired-title"
              className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight"
            >
              Phiên Đăng Nhập Đã Hết Hạn
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Phiên đăng nhập đã hết hạn để bảo vệ tài khoản của bạn. Vui lòng đăng nhập lại để tiếp tục.
            </p>
          </div>

          {/* User Account Capsule (if available) */}
          {user && (
            <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 overflow-hidden">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user.name || 'Người dùng'}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${roleInfo.bg}`}
                  >
                    {roleInfo.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          )}


          {/* Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={onReLogin}
              type="button"
              className="w-full py-3.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập lại ngay</span>
            </button>

            {/* Countdown note */}
            <p className="text-xs text-slate-600 text-center">
              Tự động chuyển về trang đăng nhập sau{' '}
              <span className="font-semibold text-slate-700 tabular-nums">
                {countdown}s
              </span>{' '}
              nếu không thao tác
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
