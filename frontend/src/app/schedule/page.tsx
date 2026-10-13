/**
 * Schedule Page (/schedule)
 * Student Management System - LightBrave Team
 * Trang chuyên dụng xem và quản lý Thời khóa biểu, Lịch học, Lịch thi
 */

'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ScheduleCalendarView, { ScheduleEventItem } from '@/components/schedule/ScheduleCalendarView';
import CreateScheduleModal from '@/components/schedule/CreateScheduleModal';
import { ArrowLeft } from 'lucide-react';

export default function SchedulePage() {
  const { user, isTeacher, isAdmin, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEventItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Đang tải thời khóa biểu...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar với nút quay lại Dashboard */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(isAdmin ? '/admin' : '/dashboard')}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại {isAdmin ? 'Trang quản trị' : 'Dashboard'}</span>
          </button>

          <div className="text-xs font-semibold text-slate-500">
            Xin chào, <span className="text-slate-800 font-bold">{user?.name}</span> ({user?.role})
          </div>
        </div>
      </div>

      {/* Giao diện Thời khóa biểu chính */}
      <ScheduleCalendarView
        key={refreshKey}
        isTeacher={isTeacher || isAdmin}
        onOpenCreateModal={() => {
          setEditingEvent(null);
          setIsCreateModalOpen(true);
        }}
        onEditEvent={(event) => {
          setEditingEvent(event);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Modal Thêm / Sửa ca học */}
      <CreateScheduleModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
        initialData={editingEvent}
      />
    </div>
  );
}
