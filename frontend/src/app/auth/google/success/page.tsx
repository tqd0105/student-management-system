/**
 * Google OAuth Success Page
 * Nhận token từ URL, lưu vào localStorage, redirect về dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GoogleSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý đăng nhập...');

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userStr = params.get('user');

      if (!token || !userStr) {
        setStatus('error');
        setMessage('Không nhận được thông tin đăng nhập từ Google.');
        setTimeout(() => router.push('/'), 2500);
        return;
      }

      const user = JSON.parse(decodeURIComponent(userStr));

      // Lưu vào localStorage (giống flow email/password)
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setStatus('success');
      setMessage(`Chào mừng, ${user.name}! Đang chuyển hướng...`);

      // Redirect tùy role
      setTimeout(() => {
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }, 1200);

    } catch (err) {
      console.error('Google callback error:', err);
      setStatus('error');
      setMessage('Có lỗi xảy ra khi xử lý đăng nhập. Vui lòng thử lại.');
      setTimeout(() => router.push('/'), 2500);
    }
  }, [router]);

  return (
    <div className="min-h-dvh flex items-center justify-center"
      style={{ backgroundImage: 'linear-gradient(-225deg, #D4FFEC 0%, #57F2CC 48%, #4596FB 100%)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-gray-600 font-medium text-center">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-9 h-9 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-center">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-9 h-9 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold text-center">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
