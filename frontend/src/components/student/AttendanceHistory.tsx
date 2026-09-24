/**
 * AttendanceHistory Component — Redesigned
 * Student Management System - DTECH TEAM
 * Lịch sử điểm danh của học sinh — giao diện hiện đại, full responsive
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ApiService from '@/services/ApiService';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  BarChart2,
  List,
  Layers,
  Loader2,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  checkedAt: string;
  createdAt: string;
  session: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    class: {
      id: string;
      name: string;
      teacher: {
        name: string;
        email: string;
      };
    };
  };
}

interface ClassStats {
  classId: string;
  className: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

interface AttendanceHistoryProps {
  onClose: () => void;
  refreshTrigger?: number;
  classId?: string;
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ onClose, refreshTrigger, classId }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'by-class'>('overview');

  const fetchAttendanceHistory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const response = await ApiService.getAttendanceHistory(classId);
      if (response.success) {
        setAttendanceRecords(response.data);
      } else {
        if (!isSilent) setError(response.message || 'Không thể tải lịch sử điểm danh');
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      if (!isSilent) setError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [refreshTrigger, classId, fetchAttendanceHistory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAttendanceHistory(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // ── Statistics helpers ───────────────────────────────────────────────────
  const getOverallStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const late = attendanceRecords.filter(r => r.status === 'LATE').length;
    const absent = attendanceRecords.filter(r => r.status === 'ABSENT').length;
    const attendanceRate = total > 0 ? ((present + late) / total * 100) : 0;
    return { total, present, late, absent, attendanceRate };
  };

  const getClassStats = (): ClassStats[] => {
    const classMap = new Map<string, ClassStats>();
    attendanceRecords.forEach(record => {
      const cId = record.session.class.id;
      const cName = record.session.class.name;
      if (!classMap.has(cId)) {
        classMap.set(cId, { classId: cId, className: cName, totalSessions: 0, presentCount: 0, lateCount: 0, absentCount: 0, attendanceRate: 0, records: [] });
      }
      const stats = classMap.get(cId)!;
      stats.records.push(record);
      stats.totalSessions++;
      if (record.status === 'PRESENT') stats.presentCount++;
      else if (record.status === 'LATE') stats.lateCount++;
      else if (record.status === 'ABSENT') stats.absentCount++;
    });
    classMap.forEach(stats => {
      if (stats.totalSessions > 0) {
        stats.attendanceRate = ((stats.presentCount + stats.lateCount) / stats.totalSessions) * 100;
      }
    });
    return Array.from(classMap.values()).sort((a, b) => b.attendanceRate - a.attendanceRate);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300', label: 'Xuất sắc' };
    if (rate >= 75) return { bar: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300', label: 'Tốt' };
    if (rate >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300', label: 'Cần cố gắng' };
    return { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-300', label: 'Cảnh báo' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Có mặt
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
            <Clock className="w-3 h-3" /> Đi muộn
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            <AlertCircle className="w-3 h-3" /> Vắng mặt
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const overallStats = getOverallStats();
  const classStats = getClassStats();
  const rateColor = getRateColor(overallStats.attendanceRate);

  const TABS = [
    { id: 'overview' as const, label: 'Tổng quan', icon: BarChart2 },
    { id: 'by-class' as const, label: 'Theo lớp', icon: Layers },
    { id: 'detailed' as const, label: 'Chi tiết', icon: List },
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-4xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[95dvh] sm:h-auto sm:max-h-[92vh] animate__animated animate__zoomIn animate__faster">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/80 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600 shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">Lịch Sử Điểm Danh</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">Thống kê chuyên cần và lịch sử tham dự buổi học</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title="Tải lại dữ liệu mới nhất"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-violet-600' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        {!loading && !error && (
          <div className="px-4 sm:px-5 pt-3 pb-0 border-b border-gray-100 shrink-0 flex items-center gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    viewMode === tab.id
                      ? 'text-violet-600 border-violet-500 bg-violet-50/50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <span className="text-sm font-medium text-gray-500">Đang tải lịch sử điểm danh...</span>
            </div>
          ) : error ? (
            <div className="text-center py-14 px-4 max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-gray-800">{error}</p>
              <button
                onClick={() => fetchAttendanceHistory()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Thử lại</span>
              </button>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">Chưa có lịch sử điểm danh</p>
              <p className="text-xs text-gray-400">Dữ liệu điểm danh sẽ hiển thị tại đây sau khi bạn tham gia buổi học và quét mã QR.</p>
            </div>
          ) : (
            <>
              {/* ── Overview Tab ─── */}
              {viewMode === 'overview' && (
                <div className="space-y-4">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl border border-gray-200 p-3.5 sm:p-4 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500">Tổng buổi</span>
                        <Calendar className="w-4 h-4 text-violet-500" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-gray-900">{overallStats.total}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Số buổi đã học</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-200 p-3.5 sm:p-4 shadow-xs bg-gradient-to-br from-emerald-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-emerald-700">Có mặt</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{overallStats.present}</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">Đúng giờ</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-amber-200 p-3.5 sm:p-4 shadow-xs bg-gradient-to-br from-amber-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-700">Đi muộn</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{overallStats.late}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Trễ giờ vào lớp</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-rose-200 p-3.5 sm:p-4 shadow-xs bg-gradient-to-br from-rose-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-rose-700">Vắng mặt</span>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-extrabold text-rose-700">{overallStats.absent}</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">Buổi không tham dự</p>
                    </div>
                  </div>

                  {/* Attendance Rate Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        <h4 className="text-sm font-bold text-gray-800">Tỷ lệ chuyên cần tổng thể</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${rateColor.bg} ${rateColor.text} ${rateColor.border}`}>
                        {overallStats.attendanceRate.toFixed(1)}% — {rateColor.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ${rateColor.bar}`}
                        style={{ width: `${overallStats.attendanceRate}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                      <span>0%</span>
                      <span className={`font-semibold ${rateColor.text}`}>
                        {overallStats.attendanceRate >= 90 ? '🎉 Chuyên cần xuất sắc!' :
                         overallStats.attendanceRate >= 75 ? '👍 Chuyên cần tốt!' :
                         overallStats.attendanceRate >= 60 ? '⚠️ Cần cải thiện tần suất dự học' :
                         '🚨 Tỷ lệ thấp — cần chú ý'}
                      </span>
                      <span>100%</span>
                    </div>
                    {/* Milestone markers */}
                    <div className="relative mt-1">
                      <div className="w-full h-0.5 bg-transparent relative">
                        {[60, 75, 90].map(milestone => (
                          <div key={milestone} className="absolute top-0 w-px h-1 bg-gray-300" style={{ left: `${milestone}%` }}>
                            <span className="absolute top-1.5 -translate-x-1/2 text-[9px] text-gray-400 font-medium">{milestone}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Academic Note */}
                  <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                    overallStats.attendanceRate >= 75
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <Award className={`w-4 h-4 shrink-0 mt-0.5 ${overallStats.attendanceRate >= 75 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <p className="font-bold mb-0.5">Lưu ý học vụ:</p>
                      <p>
                        {overallStats.attendanceRate >= 75
                          ? 'Bạn đang duy trì chuyên cần tốt và đủ điều kiện thi hết môn. Hãy tiếp tục phát huy!'
                          : 'Tỷ lệ chuyên cần thấp hơn 75% có thể ảnh hưởng đến điều kiện dự thi. Hãy liên hệ giảng viên nếu cần hỗ trợ.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── By Class Tab ─── */}
              {viewMode === 'by-class' && (
                <div className="space-y-3">
                  {classStats.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-bold text-gray-700">Chưa có dữ liệu theo lớp</p>
                    </div>
                  ) : (
                    classStats.map((cls) => {
                      const cr = getRateColor(cls.attendanceRate);
                      return (
                        <div key={cls.classId} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                          <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-violet-500 shrink-0" />
                              <h4 className="text-sm font-bold text-gray-900">{cls.className}</h4>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cr.bg} ${cr.text} ${cr.border}`}>
                              {cls.attendanceRate.toFixed(1)}% — {cr.label}
                            </span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-4 gap-2 mb-3">
                              {[
                                { label: 'Tổng buổi', val: cls.totalSessions, color: 'text-gray-700' },
                                { label: 'Có mặt', val: cls.presentCount, color: 'text-emerald-600' },
                                { label: 'Đi muộn', val: cls.lateCount, color: 'text-amber-600' },
                                { label: 'Vắng', val: cls.absentCount, color: 'text-rose-600' },
                              ].map(item => (
                                <div key={item.label} className="text-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                                  <p className={`text-xl font-extrabold ${item.color}`}>{item.val}</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${cr.bar}`}
                                style={{ width: `${cls.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Detailed Tab ─── */}
              {viewMode === 'detailed' && (
                <>
                  {/* Desktop Table */}
                  <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[11px] text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-3 whitespace-nowrap">Ngày</th>
                          <th className="px-4 py-3 whitespace-nowrap">Buổi học</th>
                          <th className="px-4 py-3 whitespace-nowrap">Lớp</th>
                          <th className="px-4 py-3 whitespace-nowrap">Giảng viên</th>
                          <th className="px-4 py-3 whitespace-nowrap text-center">Trạng thái</th>
                          <th className="px-4 py-3 whitespace-nowrap text-center">Thời gian check-in</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendanceRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap text-gray-600 font-medium">{formatDate(record.session.startTime)}</td>
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-gray-900 leading-snug">{record.session.title}</p>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                {record.session.class.name}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{record.session.class.teacher.name}</td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">{getStatusBadge(record.status)}</td>
                            <td className="px-4 py-3.5 text-center text-gray-500 whitespace-nowrap">
                              {record.checkedAt ? formatTime(record.checkedAt) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card List */}
                  <div className="sm:hidden space-y-3">
                    {attendanceRecords.map((record) => (
                      <div key={record.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-900 leading-snug">{record.session.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                {record.session.class.name}
                              </span>
                              <span className="text-[11px] text-gray-400">{record.session.class.teacher.name}</span>
                            </div>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{formatDate(record.session.startTime)}</span>
                          </div>
                          {record.checkedAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>Check-in: {formatTime(record.checkedAt)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {!loading && !error && `${attendanceRecords.length} bản ghi điểm danh · ${classStats.length} lớp học`}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default AttendanceHistory;
