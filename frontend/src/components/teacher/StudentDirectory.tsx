'use client';
/**
 * StudentDirectory - Danh sách sinh viên hệ thống dành cho giáo viên
 * Teacher tìm kiếm SV theo tên/email và thêm vào lớp
 */

import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '@/services/ApiService';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  enrolledClasses: { id: string; name: string }[];
  isInTargetClass: boolean;
}

interface StudentDirectoryProps {
  /** Nếu truyền classId thì hiển thị nút "Thêm vào lớp" */
  targetClassId?: string;
  targetClassName?: string;
  onStudentAdded?: () => void;
}

export default function StudentDirectory({
  targetClassId,
  targetClassName,
  onStudentAdded,
}: StudentDirectoryProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStudents = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const result = await ApiService.getTeacherAllStudents({
        search: q || undefined,
        classId: targetClassId,
      });
      if (result.success) setStudents(result.data);
    } catch {
      showToast('error', 'Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  }, [targetClassId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchStudents(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchStudents]);

  const handleAdd = async (student: Student) => {
    if (!targetClassId) return;
    setAdding(student.id);
    try {
      const result = await ApiService.addStudentToClass(targetClassId, student.email);
      if (result.success) {
        showToast('success', `Đã thêm ${student.name} vào lớp`);
        fetchStudents(search);
        onStudentAdded?.();
      } else {
        showToast('error', result.message || 'Thêm thất bại');
      }
    } catch {
      showToast('error', 'Lỗi kết nối');
    } finally {
      setAdding(null);
    }
  };

  const handleRemove = async (student: Student) => {
    if (!targetClassId) return;
    if (!confirm(`Xóa ${student.name} khỏi lớp?`)) return;
    setRemoving(student.id);
    try {
      const result = await ApiService.removeStudentFromClass(targetClassId, student.id);
      if (result.success) {
        showToast('success', `Đã xóa ${student.name} khỏi lớp`);
        fetchStudents(search);
        onStudentAdded?.();
      } else {
        showToast('error', result.message || 'Xóa thất bại');
      }
    } catch {
      showToast('error', 'Lỗi kết nối');
    } finally {
      setRemoving(null);
    }
  };

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Header + Search */}
      <div className="mb-5">
        {targetClassName && (
          <p className="text-sm text-indigo-600 font-semibold mb-1">
             Đang thêm sinh viên vào: <span className="font-bold">{targetClassName}</span>
          </p>
        )}
        <div className="relative">
          <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email sinh viên..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-sm"
          />
          {loading && (
            <div className="absolute right-3 top-3 w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {students.length} sinh viên tìm thấy
          {!search && ' — Nhập tên hoặc email để tìm kiếm'}
        </p>
      </div>

      {/* Student List */}
      {students.length === 0 && !loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">👨‍🎓</div>
          <p className="text-sm">{search ? 'Không tìm thấy sinh viên phù hợp' : 'Bắt đầu tìm kiếm sinh viên...'}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {students.map(student => {
            const isAdding = adding === student.id;
            const isRemoving = removing === student.id;
            const busy = isAdding || isRemoving;

            return (
              <div
                key={student.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {student.avatar && student.avatar.startsWith('http') ? (
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={e => {
                        // Nếu ảnh lỗi thì fallback sang initials
                        const parent = (e.target as HTMLImageElement).parentElement!;
                        (e.target as HTMLImageElement).style.display = 'none';
                        const div = document.createElement('div');
                        div.className = 'w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold';
                        div.textContent = initials(student.name);
                        parent.appendChild(div);
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {initials(student.name)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
                  <p className="text-xs text-gray-400 truncate">{student.email}</p>
                  {student.enrolledClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {student.enrolledClasses.map(c => (
                        <span key={c.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action */}
                {targetClassId && (
                  student.isInTargetClass ? (
                    <button
                      onClick={() => handleRemove(student)}
                      disabled={busy}
                      className="cursor-pointer flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isRemoving ? '...' : 'Xóa'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdd(student)}
                      disabled={busy}
                      className="cursor-pointer flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isAdding ? '...' : 'Thêm'}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
