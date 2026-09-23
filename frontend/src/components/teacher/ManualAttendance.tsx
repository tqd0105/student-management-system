'use client';

import React, { useState, useEffect } from 'react';
import ApiService from '@/services/ApiService';
import { X, CheckCircle, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ManualAttendanceProps {
  session: { id: string; title?: string };
  classId: string;
  onClose: () => void;
}

interface StudentAttendance {
  id: string;
  name: string;
  email: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NONE';
}

export default function ManualAttendance({ session, classId, onClose }: ManualAttendanceProps) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [session.id, classId]);

  // Tự động ẩn thông báo sau 3 giây
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students in class
      const stuRes = await ApiService.getClassStudents(classId);
      
      // Fetch stats for this session to get current attendance status
      const statsData = await ApiService.getSessionAttendanceStats(session.id);

      if (stuRes.success) {
        const studentList = stuRes.data || [];
        const statusMap: Record<string, 'PRESENT' | 'LATE' | 'ABSENT'> = {};

        if (statsData.success && statsData.data) {
          // 1. Ưu tiên map từ logs
          if (Array.isArray(statsData.data.logs)) {
            statsData.data.logs.forEach((log: any) => {
              const sid = log.studentId || log.student?.id;
              if (sid && log.status) {
                statusMap[sid] = log.status;
              }
            });
          }

          // 2. Bổ sung từ attendanceDetails nếu có record
          if (Array.isArray(statsData.data.attendanceDetails)) {
            statsData.data.attendanceDetails.forEach((detail: any) => {
              if ((detail.hasRecord || detail.checkinTime) && detail.studentId && detail.status) {
                statusMap[detail.studentId] = detail.status;
              }
            });
          }
        }

        const formattedStudents = studentList.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          status: statusMap[s.id] || 'NONE'
        }));
        
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error("Failed to load attendance data", error);
      setFeedback({ type: 'error', message: 'Không thể tải danh sách học sinh!' });
    } finally {
      setLoading(false);
    }
  };

  const statusLabel: Record<'PRESENT' | 'LATE' | 'ABSENT', string> = {
    PRESENT: 'Có mặt',
    LATE: 'Đi trễ',
    ABSENT: 'Vắng mặt',
  };

  const markAttendance = async (student: StudentAttendance, status: 'PRESENT' | 'LATE' | 'ABSENT') => {
    if (updatingId) return;
    setUpdatingId(student.id);
    try {
      const res = await ApiService.markManualAttendance(session.id, student.id, status);
      if (res.success) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status } : s));
        setFeedback({
          type: 'success',
          message: `Đã cập nhật: ${student.name} → ${statusLabel[status]}`
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.message || `Lỗi khi cập nhật điểm danh cho ${student.name}`
        });
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({
        type: 'error',
        message: e?.message || `Lỗi khi điểm danh cho ${student.name}`
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col animate__animated animate__fadeInUp animate__faster overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Điểm danh thủ công</h3>
            <p className="text-sm text-gray-500">{session.title || 'Buổi học'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`px-4 py-2.5 flex items-center justify-between text-sm transition-all animate__animated animate__fadeInDown animate__faster ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            <div className="flex items-center gap-2 font-medium">
              {feedback.type === 'success' ? (
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button 
              onClick={() => setFeedback(null)} 
              className="p-1 hover:bg-black/5 rounded text-gray-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500 flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-indigo-500" />
              <span>Đang tải danh sách...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có học sinh trong lớp.</div>
          ) : (
            <div className="space-y-3">
              {students.map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 transition-colors">
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-gray-800 truncate whitespace-nowrap">{student.name}</div>
                    <div className="text-xs text-gray-500 truncate whitespace-nowrap">{student.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {updatingId === student.id ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 font-medium">
                        <Loader2 size={14} className="animate-spin" /> Đang lưu...
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => markAttendance(student, 'PRESENT')}
                          disabled={updatingId !== null}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                            student.status === 'PRESENT' 
                              ? 'bg-green-600 border-green-600 text-white shadow-sm font-semibold' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-green-50 hover:border-green-300'
                          }`}
                        >
                          <CheckCircle size={14} /> Có mặt
                        </button>
                        <button 
                          onClick={() => markAttendance(student, 'LATE')}
                          disabled={updatingId !== null}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                            student.status === 'LATE' 
                              ? 'bg-yellow-500 border-yellow-500 text-white shadow-sm font-semibold' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-yellow-50 hover:border-yellow-300'
                          }`}
                        >
                          <Clock size={14} /> Đi trễ
                        </button>
                        <button 
                          onClick={() => markAttendance(student, 'ABSENT')}
                          disabled={updatingId !== null}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded border text-xs font-medium transition-all ${
                            student.status === 'ABSENT' 
                              ? 'bg-red-600 border-red-600 text-white shadow-sm font-semibold' 
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300'
                          }`}
                        >
                          <XCircle size={14} /> Vắng
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
