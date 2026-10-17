'use client';

import React, { useState, useEffect } from 'react';
import ApiService from '@/services/ApiService';
import { API_BASE_URL } from '@/config/api';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  MapPin,
  Wifi,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Info,
  ChevronDown,
  ChevronUp,
  Navigation,
  Crosshair,
  Sliders,
  Save,
  Trash2,
  Laptop,
  UserCheck
} from 'lucide-react';

interface AntiFraudRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: { id: string; name: string };
  onDataChanged?: () => void;
}

interface SessionItem {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  locationLat?: number | null;
  locationLng?: number | null;
  radiusMeters?: number | null;
}

interface StudentAuditItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'NONE';
  hasRecord: boolean;
  checkinTime: string | null;
  clientIp: string | null;
  networkMatched: boolean | null;
  deviceId: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  isDuplicateDevice: boolean;
  duplicateWith: string[];
  isLocationOutOfBounds: boolean;
}

const getDeviceDisplayInfo = (deviceId: string | null) => {
  if (!deviceId) return null;
  if (deviceId === 'MANUAL_TEACHER') {
    return {
      type: 'manual',
      icon: 'manual' as const,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Điểm danh thủ công (GV)',
      title: 'Giảng viên đã điểm danh hoặc điều chỉnh trạng thái trực tiếp'
    };
  }
  if (deviceId.startsWith('DEV_')) {
    return {
      type: 'fingerprint',
      icon: 'mobile' as const,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: `Mã máy: ${deviceId.substring(4, 14)}...`,
      title: `Mã định danh thiết bị duy nhất: ${deviceId}`
    };
  }
  if (/Android/i.test(deviceId)) {
    return {
      type: 'android',
      icon: 'mobile' as const,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Điện thoại Android',
      title: `Thiết bị Android (${deviceId})`
    };
  }
  if (/iPhone|iPad/i.test(deviceId)) {
    return {
      type: 'ios',
      icon: 'mobile' as const,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Apple iOS (iPhone/iPad)',
      title: `Thiết bị iOS (${deviceId})`
    };
  }
  if (/Windows/i.test(deviceId)) {
    return {
      type: 'windows',
      icon: 'laptop' as const,
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      label: 'Máy tính Windows',
      title: `Trình duyệt máy tính (${deviceId})`
    };
  }
  if (/Macintosh/i.test(deviceId)) {
    return {
      type: 'mac',
      icon: 'laptop' as const,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      label: 'Máy tính Mac',
      title: `Máy Mac (${deviceId})`
    };
  }
  return {
    type: 'generic',
    icon: 'mobile' as const,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: deviceId.length > 16 ? `${deviceId.substring(0, 14)}...` : deviceId,
    title: deviceId
  };
};

export default function AntiFraudRadarModal({
  isOpen,
  onClose,
  classInfo,
  onDataChanged
}: AntiFraudRadarModalProps) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [studentsAudit, setStudentsAudit] = useState<StudentAuditItem[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'VIOLATIONS' | 'PRESENT' | 'ABSENT'>('ALL');
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GPS Geofence Configuration State
  const [showGpsPanel, setShowGpsPanel] = useState<boolean>(false);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsRadius, setGpsRadius] = useState<number>(100);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isSavingGps, setIsSavingGps] = useState<boolean>(false);

  // Auto clear toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Load sessions on open
  useEffect(() => {
    if (isOpen && classInfo.id) {
      loadSessions();
    }
  }, [isOpen, classInfo.id]);

  // Load stats when session changes
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionAuditStats(selectedSessionId);
    }
  }, [selectedSessionId]);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/teacher/classes/${classInfo.id}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list: SessionItem[] = data.data || [];
        setSessions(list);
        if (list.length > 0) {
          // Default to first active session, or first session
          const active = list.find(s => s.isActive) || list[0];
          setSelectedSessionId(active.id);
        }
      }
    } catch (err) {
      console.error('Error loading sessions for radar:', err);
      setToastMessage({ type: 'error', text: 'Không thể tải danh sách buổi học' });
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSessionAuditStats = async (sessionId: string) => {
    try {
      setStatsLoading(true);
      const res = await ApiService.getSessionAttendanceStats(sessionId);
      if (res.success && res.data) {
        setSessionStats(res.data);
        const details: StudentAuditItem[] = res.data.attendanceDetails || [];
        setStudentsAudit(details);
        // Cập nhật state cấu hình GPS từ sessionInfo
        const sInfo = res.data.sessionInfo;
        if (sInfo) {
          setGpsLat(sInfo.locationLat ?? null);
          setGpsLng(sInfo.locationLng ?? null);
          setGpsRadius(sInfo.radiusMeters ?? 100);
        }
      } else {
        setToastMessage({ type: 'error', text: res.message || 'Lỗi khi tải dữ liệu radar' });
      }
    } catch (err) {
      console.error('Error loading session stats:', err);
      setToastMessage({ type: 'error', text: 'Lỗi mạng khi tải dữ liệu radar' });
    } finally {
      setStatsLoading(false);
    }
  };

  // 1-Click lấy tọa độ GPS từ trình duyệt của giảng viên
  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setToastMessage({ type: 'error', text: 'Trình duyệt không hỗ trợ định vị GPS' });
      return;
    }
    setIsDetectingGps(true);

    const onGeoSuccess = (pos: GeolocationPosition) => {
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      setGpsLat(lat);
      setGpsLng(lng);
      setIsDetectingGps(false);
      setToastMessage({
        type: 'success',
        text: `Đã lấy tọa độ phòng học: ${lat}, ${lng} (Độ chính xác: ±${Math.round(pos.coords.accuracy)}m)`
      });
    };

    const onGeoError = (err: GeolocationPositionError, triedLowAccuracy: boolean) => {
      if (!triedLowAccuracy) {
        // Fallback retry với enableHighAccuracy = false (rất hữu ích trên Cốc Cốc / PC không có chip GPS)
        navigator.geolocation.getCurrentPosition(
          onGeoSuccess,
          (secondErr) => onGeoError(secondErr, true),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
        return;
      }

      console.error('GPS error:', err);
      setIsDetectingGps(false);
      let msg = 'Không thể lấy vị trí hiện tại.';
      if (err.code === 1) {
        msg = 'Quyền vị trí bị chặn (Code 1: User denied). Trên Cốc Cốc, hãy kiểm tra Cài đặt Windows > Quyền riêng tư > Vị trí cho phép Cốc Cốc.';
      } else if (err.code === 2) {
        msg = 'Không nhận được tín hiệu định vị. Vui lòng bật Wi-Fi hoặc nhập tọa độ thủ công.';
      } else if (err.code === 3) {
        msg = 'Quá thời gian lấy vị trí GPS.';
      }
      setToastMessage({ type: 'error', text: msg });
    };

    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      (firstErr) => onGeoError(firstErr, false),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Lưu cấu hình GPS cho buổi học
  const handleSaveGpsConfig = async (overrideLat?: number | null, overrideLng?: number | null) => {
    if (!selectedSessionId || isSavingGps) return;
    const finalLat = overrideLat !== undefined ? overrideLat : gpsLat;
    const finalLng = overrideLng !== undefined ? overrideLng : gpsLng;

    try {
      setIsSavingGps(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/teacher/sessions/${selectedSessionId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationLat: finalLat,
          locationLng: finalLng,
          radiusMeters: gpsRadius
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage({
          type: 'success',
          text: finalLat !== null && finalLng !== null
            ? `Đã lưu tọa độ phòng học & bán kính ${gpsRadius}m!`
            : 'Đã tắt giới hạn vị trí GPS cho buổi học này'
        });
        loadSessionAuditStats(selectedSessionId);
        loadSessions();
        if (onDataChanged) onDataChanged();
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Lỗi lưu cấu hình vị trí' });
      }
    } catch (err) {
      console.error('Error saving GPS config:', err);
      setToastMessage({ type: 'error', text: 'Lỗi mạng khi lưu vị trí' });
    } finally {
      setIsSavingGps(false);
    }
  };

  const handleUpdateStatus = async (student: StudentAuditItem, newStatus: 'PRESENT' | 'LATE' | 'ABSENT') => {
    if (updatingStudentId || !selectedSessionId) return;
    setUpdatingStudentId(student.studentId);
    try {
      const res = await ApiService.markManualAttendance(selectedSessionId, student.studentId, newStatus);
      if (res.success) {
        setStudentsAudit(prev =>
          prev.map(s => (s.studentId === student.studentId ? { ...s, status: newStatus, hasRecord: true } : s))
        );
        const labelMap = { PRESENT: 'Có mặt', LATE: 'Muộn', ABSENT: 'Vắng' };
        setToastMessage({
          type: 'success',
          text: `Đã đổi ${student.studentName} thành: ${labelMap[newStatus]}`
        });
        if (onDataChanged) onDataChanged();
      } else {
        setToastMessage({ type: 'error', text: res.message || 'Lỗi cập nhật trạng thái' });
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setToastMessage({ type: 'error', text: 'Lỗi mạng khi cập nhật trạng thái' });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  if (!isOpen) return null;

  // Filter list
  const filteredStudents = studentsAudit.filter(student => {
    if (filterType === 'VIOLATIONS') {
      return student.isDuplicateDevice || student.isLocationOutOfBounds || student.networkMatched === false;
    }
    if (filterType === 'PRESENT') return student.status === 'PRESENT';
    if (filterType === 'ABSENT') return student.status === 'ABSENT';
    return true;
  });

  const duplicateCount = studentsAudit.filter(s => s.isDuplicateDevice).length;
  const outOfBoundsCount = studentsAudit.filter(s => s.isLocationOutOfBounds).length;
  const networkMismatchCount = studentsAudit.filter(s => s.networkMatched === false).length;
  const totalViolations = duplicateCount + outOfBoundsCount;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-60 animate-in slide-in-from-top-2 duration-150">
            <div
              className={`px-4 py-2.5 rounded-xl shadow-lg text-xs sm:text-sm font-semibold flex items-center gap-2 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-bold tracking-tight">Radar Giám Sát & Tuỳ Chinh Điểm Danh</h2>
                <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Anti-Fraud
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200/80 truncate max-w-md">
                Lớp: <span className="font-semibold text-white">{classInfo.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-gray-50/50">
          
          {/* Session Selector & Action Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="session-select" className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">
                Buổi học:
              </label>
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                  <span>Đang tải buổi học...</span>
                </div>
              ) : sessions.length === 0 ? (
                <span className="text-xs text-amber-600 font-medium">Chưa có buổi học nào được tạo</span>
              ) : (
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <select
                    id="session-select"
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-xs sm:text-sm rounded-xl focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:max-w-md p-2 font-medium"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.title || 'Buổi học'} ({new Date(s.startTime).toLocaleDateString('vi-VN')}) — [{s.isActive ? 'Đang mở' : 'Đã đóng'}]
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const currentSession = sessions.find(s => s.id === selectedSessionId);
                    if (!currentSession) return null;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 ${
                        currentSession.isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${currentSession.isActive ? 'bg-emerald-500 ring-2 ring-emerald-200 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{currentSession.isActive ? 'Đang mở điểm danh' : 'Đã kết thúc'}</span>
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedSessionId && loadSessionAuditStats(selectedSessionId)}
                disabled={statsLoading || !selectedSessionId}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>


          {/* Radar Scorecards */}
          {sessionStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Card 1: Toàn vẹn / Gian lận */}
              <div
                className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                  totalViolations > 0
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Cảnh báo gian lận</span>
                  {totalViolations > 0 ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-black">{totalViolations}</p>
                  <p className="text-[11px] font-medium opacity-80">
                    {totalViolations > 0 ? 'Lượt quét có dấu hiệu vi phạm' : 'Tất cả lượt quét an toàn'}
                  </p>
                </div>
              </div>

              {/* Card 2: Trùng thiết bị */}
              <div
                className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                  duplicateCount > 0
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Trùng thiết bị</span>
                  <Smartphone className={`w-5 h-5 ${duplicateCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                </div>
                <div className="mt-2">
                  <p className={`text-xl sm:text-2xl font-black ${duplicateCount > 0 ? 'text-amber-700' : 'text-gray-800'}`}>
                    {duplicateCount}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500">
                    {duplicateCount > 0 ? 'Dùng chung máy điểm danh' : '100% thiết bị duy nhất'}
                  </p>
                </div>
              </div>

              {/* Card 3: Lệch GPS */}
              <div
                className={`p-3.5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
                  outOfBoundsCount > 0
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Lệch GPS</span>
                  <MapPin className={`w-5 h-5 ${outOfBoundsCount > 0 ? 'text-rose-600' : 'text-gray-400'}`} />
                </div>
                <div className="mt-2">
                  <p className={`text-xl sm:text-2xl font-black ${outOfBoundsCount > 0 ? 'text-rose-700' : 'text-gray-800'}`}>
                    {outOfBoundsCount}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500">
                    {outOfBoundsCount > 0 ? 'Quét ngoài bán kính lớp' : 'Vị trí hợp lệ'}
                  </p>
                </div>
              </div>

              {/* Card 4: Tổng có mặt */}
              <div className="p-3.5 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Có mặt / Tổng số</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <p className="text-xl sm:text-2xl font-black text-gray-900">
                    {sessionStats.presentStudents + sessionStats.lateStudents} / {sessionStats.totalStudents}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700">
                    Tỷ lệ: {sessionStats.attendanceRate}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả ({studentsAudit.length})
              </button>
              <button
                onClick={() => setFilterType('VIOLATIONS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'VIOLATIONS' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Nghi vấn ({totalViolations})</span>
              </button>
              <button
                onClick={() => setFilterType('PRESENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Có mặt
              </button>
              <button
                onClick={() => setFilterType('ABSENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'ABSENT' ? 'bg-gray-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Vắng
              </button>
            </div>

            
          </div>

          {/* Audit List Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            {statsLoading ? (
              <div className="p-12 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-600 mb-2" />
                <p className="text-sm font-semibold">Đang soi dữ liệu kiểm toán...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <CheckCircle2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-700">Không có bản ghi nào phù hợp bộ lọc</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Sinh Viên</th>
                      <th className="px-3 py-3 whitespace-nowrap text-center">Giờ quét</th>
                      <th className="px-3 py-3 whitespace-nowrap">Thiết bị (Device ID)</th>
                      <th className="px-3 py-3 whitespace-nowrap">Khoảng cách</th>
                      <th className="px-3 py-3 whitespace-nowrap text-center">Trạng thái</th>
                      <th className="px-4 py-3 whitespace-nowrap text-center">Tùy chỉnh nhanh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map(student => {
                      const isUpdating = updatingStudentId === student.studentId;

                      return (
                        <tr
                          key={student.studentId}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            student.isDuplicateDevice || student.isLocationOutOfBounds ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          {/* Student Info */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">{student.studentName}</p>
                            <p className="text-[11px] text-gray-500 truncate max-w-[160px] sm:max-w-none">
                              {student.studentEmail}
                            </p>
                          </td>

                          {/* Checkin Time */}
                          <td className="px-3 py-3 text-center whitespace-nowrap text-xs">
                            {student.checkinTime ? (
                              <div className="flex items-center justify-center gap-1 text-gray-700 font-medium">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{new Date(student.checkinTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Chưa điểm danh</span>
                            )}
                          </td>

                          {/* Device ID Audit */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {!student.hasRecord || student.status === 'ABSENT' ? (
                              <span className="text-gray-400 text-xs">-</span>
                            ) : student.isDuplicateDevice ? (
                              <div
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px]"
                                title={`Cảnh báo: Trùng thiết bị với ${student.duplicateWith.join(', ')}`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Trùng máy: {student.duplicateWith.join(', ')}</span>
                              </div>
                            ) : student.deviceId ? (
                              (() => {
                                const info = getDeviceDisplayInfo(student.deviceId);
                                if (!info) return <span className="text-gray-400 text-xs">-</span>;
                                return (
                                  <div
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium ${info.badgeClass}`}
                                    title={info.title}
                                  >
                                    {info.icon === 'manual' ? (
                                      <UserCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                    ) : info.icon === 'laptop' ? (
                                      <Laptop className="w-3 h-3 text-sky-600 shrink-0" />
                                    ) : (
                                      <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                                    )}
                                    <span className="font-mono text-[10px]">{info.label}</span>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400 text-xs italic">Không rõ thiết bị</span>
                            )}
                          </td>

                          {/* GPS Location Audit */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {!student.hasRecord || student.status === 'ABSENT' ? (
                              <span className="text-gray-400 text-xs">-</span>
                            ) : typeof student.distanceMeters === 'number' && !isNaN(student.distanceMeters) ? (
                              student.isLocationOutOfBounds ? (
                                <div
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px]"
                                  title={`Vị trí quét cách tâm phòng học ${student.distanceMeters}m (Vượt quá bán kính cho phép ${sessionStats?.sessionInfo?.radiusMeters || 100}m)`}
                                >
                                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Cách {student.distanceMeters}m (Vượt bán kính)</span>
                                </div>
                              ) : (
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium"
                                  title={`Vị trí quét cách tâm phòng học ${student.distanceMeters}m (Hợp lệ trong bán kính ${sessionStats?.sessionInfo?.radiusMeters || 100}m)`}
                                >
                                  <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Cách {student.distanceMeters}m (Trong lớp)</span>
                                </div>
                              )
                            ) : sessionStats?.sessionInfo?.locationLat == null ? (
                              student.latitude && student.longitude ? (
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[11px]"
                                  title={`Tọa độ sinh viên: ${student.latitude.toFixed(6)}, ${student.longitude.toFixed(6)}. Buổi học chưa đặt GPS phòng để đo bán kính.`}
                                >
                                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="font-mono text-[10px]">{student.latitude.toFixed(4)}, {student.longitude.toFixed(4)} (Chưa đặt GPS phòng)</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs italic" title="Buổi học chưa gán GPS phòng">
                                  Chưa cấu hình GPS phòng
                                </span>
                              )
                            ) : student.deviceId === 'MANUAL_TEACHER' ? (
                              <span className="text-gray-400 text-xs italic">Điểm danh tay</span>
                            ) : student.latitude && student.longitude ? (
                              <span className="text-gray-600 font-mono text-[10px]" title={`Tọa độ sinh viên: ${student.latitude}, ${student.longitude}`}>
                                {student.latitude.toFixed(4)}, {student.longitude.toFixed(4)}
                              </span>
                            ) : (
                              <div
                                className="inline-flex items-center gap-1 text-amber-600 text-[11px]"
                                title="Sinh viên không cấp quyền GPS hoặc tắt định vị khi quét mã"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="italic">Không nhận được GPS</span>
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {student.status === 'PRESENT' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Có mặt
                              </span>
                            )}
                            {student.status === 'LATE' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Đi muộn
                              </span>
                            )}
                            {student.status === 'ABSENT' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                Vắng
                              </span>
                            )}
                            {student.status === 'NONE' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                Chưa điểm danh
                              </span>
                            )}
                          </td>

                          {/* Action Buttons: Toggle Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isUpdating ? (
                              <div className="flex justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center p-0.5 bg-gray-100 rounded-lg gap-0.5">
                                <button
                                  onClick={() => handleUpdateStatus(student, 'PRESENT')}
                                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                    student.status === 'PRESENT'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                  title="Đánh dấu Có mặt"
                                >
                                  Có mặt
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(student, 'LATE')}
                                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                    student.status === 'LATE'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
                                  }`}
                                  title="Đánh dấu Đi muộn"
                                >
                                  Muộn
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(student, 'ABSENT')}
                                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                    student.status === 'ABSENT'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'text-gray-600 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title="Hủy điểm danh / Đánh dấu Vắng"
                                >
                                  Vắng
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors cursor-pointer text-xs sm:text-sm"
          >
            Đóng Radar
          </button>
        </div>
      </div>
    </div>
  );
}
