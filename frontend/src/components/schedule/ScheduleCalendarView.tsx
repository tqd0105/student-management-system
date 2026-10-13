/**
 * Schedule Calendar View Component
 * Student Management System - LightBrave Team
 * Tái hiện 100% bố cục Thời khóa biểu hiện đại theo mẫu thiết kế
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Check,
  Edit3,
  Trash2,
  X,
  FileText,
  Flag,
  BookOpen,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import ApiService from '@/services/ApiService';

export interface ScheduleEventItem {
  id: string;
  classId?: string | null;
  title: string;
  type: 'CLASS' | 'EXAM' | 'EVENT' | 'OTHER';
  isRecurring: boolean;
  dayOfWeek?: number | null; // 1 = Thứ 2 ... 7 = Chủ Nhật
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string | null;
  specificDate?: string | null;
  description?: string | null;
  color?: string | null;
  createdById: string;
  class?: {
    id: string;
    name: string;
    teacherId?: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ScheduleCalendarViewProps {
  isTeacher?: boolean;
  onOpenCreateModal?: () => void;
  onEditEvent?: (event: ScheduleEventItem) => void;
  onClose?: () => void;
}

const HOURS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

const HOUR_HEIGHT = 68; // Chiều cao mỗi mốc 1 giờ (pixels)
const START_HOUR_MINUTES = 7 * 60; // 07:00 = 420 phút
const END_HOUR_MINUTES = 18 * 60; // 18:00 = 1080 phút

const DAY_NAMES = [
  { dayIndex: 1, name: 'Thứ Hai' },
  { dayIndex: 2, name: 'Thứ Ba' },
  { dayIndex: 3, name: 'Thứ Tư' },
  { dayIndex: 4, name: 'Thứ Năm' },
  { dayIndex: 5, name: 'Thứ Sáu' },
  { dayIndex: 6, name: 'Thứ Bảy' },
  { dayIndex: 7, name: 'Chủ Nhật' },
];

export const COLOR_MAP: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
    accent: string;
  }
> = {
  blue: {
    border: 'border-blue-500',
    bg: 'bg-blue-50/90 hover:bg-blue-100/90',
    text: 'text-blue-950',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    dot: 'bg-blue-500',
    accent: '#3b82f6',
  },
  indigo: {
    border: 'border-indigo-600',
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
    text: 'text-indigo-950',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    dot: 'bg-indigo-600',
    accent: '#6366f1',
  },
  purple: {
    border: 'border-purple-600',
    bg: 'bg-purple-50/90 hover:bg-purple-100/90',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    dot: 'bg-purple-600',
    accent: '#9333ea',
  },
  emerald: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    dot: 'bg-emerald-500',
    accent: '#10b981',
  },
  amber: {
    border: 'border-amber-500',
    bg: 'bg-amber-50/90 hover:bg-amber-100/90',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    dot: 'bg-amber-500',
    accent: '#f59e0b',
  },
  rose: {
    border: 'border-rose-500',
    bg: 'bg-rose-50/90 hover:bg-rose-100/90',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    dot: 'bg-rose-500',
    accent: '#f43f5e',
  },
  cyan: {
    border: 'border-cyan-500',
    bg: 'bg-cyan-50/90 hover:bg-cyan-100/90',
    text: 'text-cyan-950',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    dot: 'bg-cyan-500',
    accent: '#06b6d4',
  },
};

export default function ScheduleCalendarView({
  isTeacher = false,
  onOpenCreateModal,
  onEditEvent,
  onClose,
}: ScheduleCalendarViewProps) {
  const [events, setEvents] = useState<ScheduleEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedTypeTab, setSelectedTypeTab] = useState<'ALL' | 'CLASS' | 'EXAM' | 'EVENT'>('ALL');
  
  // Bộ lọc bên sidebar
  const [showClassCheck, setShowClassCheck] = useState(true);
  const [showExamCheck, setShowExamCheck] = useState(true);
  const [showEventCheck, setShowEventCheck] = useState(true);
  const [showOtherCheck, setShowOtherCheck] = useState(true);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);

  // Chi tiết sự kiện đang xem
  const [activeEventDetail, setActiveEventDetail] = useState<ScheduleEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Vạch thời gian hiện tại
  const [nowTime, setNowTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 30000); // 30s cập nhật 1 lần
    return () => clearInterval(timer);
  }, []);

  // Tải danh sách thời khóa biểu từ API
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await ApiService.getMySchedule();
      if (res.success && Array.isArray(res.data)) {
        setEvents(res.data);
      }
    } catch (error) {
      console.error('Lỗi tải thời khóa biểu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  // Tính ngày Thứ 2 đầu tuần của `currentDate`
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    return DAY_NAMES.map((d, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const isToday =
        date.getDate() === nowTime.getDate() &&
        date.getMonth() === nowTime.getMonth() &&
        date.getFullYear() === nowTime.getFullYear();

      const dayStr = String(date.getDate()).padStart(2, '0');
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');

      return {
        ...d,
        date,
        dateString: `${dayStr}/${monthStr}`,
        isToday,
      };
    });
  }, [currentDate, nowTime]);

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Mini calendar logic
  const miniCalendarMonthYear = useMemo(() => {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    return `Tháng ${month}, ${year}`;
  }, [currentDate]);

  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Bắt đầu từ Thứ 2: (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)
    const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
    const daysInMonth = lastDayOfMonth.getDate();

    // Các ngày của tháng trước
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const days = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected =
        date.getDate() === currentDate.getDate() &&
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear();
      const isToday =
        date.getDate() === nowTime.getDate() &&
        date.getMonth() === nowTime.getMonth() &&
        date.getFullYear() === nowTime.getFullYear();

      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        date,
        isSelected,
        isToday,
      });
    }

    // Đủ 35 hoặc 42 ô
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          dayNumber: i,
          isCurrentMonth: false,
          date: new Date(year, month + 1, i),
        });
      }
    }

    return days;
  }, [currentDate, nowTime]);

  // Danh sách các môn học phân biệt kèm màu (Subject legend)
  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, { title: string; color: string }>();
    events.forEach((ev) => {
      const key = ev.title.trim();
      if (!map.has(key)) {
        map.set(key, { title: key, color: ev.color || 'blue' });
      }
    });
    return Array.from(map.values()).filter((item) =>
      item.title.toLowerCase().includes(subjectSearch.toLowerCase())
    );
  }, [events, subjectSearch]);

  // Bộ lọc sự kiện
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Lọc theo tab chính
      if (selectedTypeTab !== 'ALL' && ev.type !== selectedTypeTab) {
        return false;
      }

      // 2. Lọc theo checkbox sidebar
      if (ev.type === 'CLASS' && !showClassCheck) return false;
      if (ev.type === 'EXAM' && !showExamCheck) return false;
      if (ev.type === 'EVENT' && !showEventCheck) return false;
      if (ev.type === 'OTHER' && !showOtherCheck) return false;

      // 3. Lọc theo môn học chọn ở sidebar
      if (selectedSubjectFilter && ev.title.trim() !== selectedSubjectFilter) {
        return false;
      }

      return true;
    });
  }, [
    events,
    selectedTypeTab,
    showClassCheck,
    showExamCheck,
    showEventCheck,
    showOtherCheck,
    selectedSubjectFilter,
  ]);

  // Xóa sự kiện
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục thời khóa biểu này không?')) return;
    try {
      setIsDeleting(true);
      const res = await ApiService.deleteScheduleEvent(id);
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        setActiveEventDetail(null);
      } else {
        alert(res.message || 'Không thể xóa lịch');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa lịch');
    } finally {
      setIsDeleting(false);
    }
  };

  // Tính tọa độ vị trí của sự kiện trên lưới thời gian
  const calculatePosition = (startTime: string, endTime: string) => {
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    const startMins = parseMins(startTime);
    const endMins = parseMins(endTime);

    // Tính top offset so với 07:00
    const clampedStart = Math.max(startMins, START_HOUR_MINUTES);
    const clampedEnd = Math.min(endMins, END_HOUR_MINUTES);

    const top = ((clampedStart - START_HOUR_MINUTES) / 60) * HOUR_HEIGHT;
    const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 36);

    return { top, height };
  };

  // Tính vị trí vạch giờ hiện tại
  const currentTimeLine = useMemo(() => {
    const h = nowTime.getHours();
    const m = nowTime.getMinutes();
    const nowMinutes = h * 60 + m;

    if (nowMinutes < START_HOUR_MINUTES || nowMinutes > END_HOUR_MINUTES) {
      return null;
    }

    const top = ((nowMinutes - START_HOUR_MINUTES) / 60) * HOUR_HEIGHT;
    const timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return { top, timeLabel };
  }, [nowTime]);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 p-3 sm:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-5">
        
        {/* --- HEADER --- */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tiêu đề & Học kỳ */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Lịch
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Học kỳ 2 • Năm học 2025 – 2026
              </p>
            </div>
          </div>

          {/* Tab pills lọc: Lịch học, Lịch thi, Sự kiện */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 self-start md:self-auto overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedTypeTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                selectedTypeTab === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedTypeTab('CLASS')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                selectedTypeTab === 'CLASS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Lịch học
            </button>
            <button
              onClick={() => setSelectedTypeTab('EXAM')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                selectedTypeTab === 'EXAM'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Lịch thi
            </button>
            <button
              onClick={() => setSelectedTypeTab('EVENT')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                selectedTypeTab === 'EVENT'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              Sự kiện
            </button>
          </div>

          {/* Điều hướng tuần & Thao tác */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <button
                onClick={handlePrevWeek}
                title="Tuần trước"
                className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-100 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Hôm nay
              </button>
              <button
                onClick={handleNextWeek}
                title="Tuần sau"
                className="p-2 hover:bg-slate-50 text-slate-600 border-l border-slate-100 cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200">
              Tuần
            </span>

            {/* Nút Thêm lịch cho Giảng viên */}
            {isTeacher && (
              <button
                onClick={onOpenCreateModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Thêm ca học</span>
              </button>
            )}

            {/* Nút làm mới */}
            <button
              onClick={fetchSchedule}
              disabled={loading}
              title="Làm mới lịch"
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* --- MAIN LAYOUT: SIDEBAR + CALENDAR GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* CỘT TRÁI (3/12 cols) */}
          <aside className="lg:col-span-3 space-y-4">
            
            {/* 1. Mini Calendar Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-extrabold text-sm text-slate-900">
                  {miniCalendarMonthYear}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const prevM = new Date(currentDate);
                      prevM.setMonth(currentDate.getMonth() - 1);
                      setCurrentDate(prevM);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const nextM = new Date(currentDate);
                      nextM.setMonth(currentDate.getMonth() + 1);
                      setCurrentDate(nextM);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tên các thứ */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              {/* Lưới ngày */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {miniCalendarDays.map((d, idx) => {
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentDate(d.date)}
                      className={`h-7 w-7 mx-auto rounded-full flex items-center justify-center font-medium transition-all cursor-pointer ${
                        d.isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : d.isToday
                          ? 'border border-indigo-500 text-indigo-700 font-bold'
                          : d.isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {d.dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Hiển thị lịch (Checkbox Filter Card) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
              <h3 className="font-extrabold text-sm text-slate-900">Hiển thị lịch</h3>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showClassCheck}
                    onChange={(e) => setShowClassCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  Lịch học
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showExamCheck}
                    onChange={(e) => setShowExamCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  Lịch thi
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showEventCheck}
                    onChange={(e) => setShowEventCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Sự kiện
                </label>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOtherCheck}
                    onChange={(e) => setShowOtherCheck(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Hoạt động khác
                </label>
              </div>
            </div>

            {/* 3. Môn học (Subject Legend Card) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">Môn học</h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {uniqueSubjects.length} môn
                </span>
              </div>

              {/* Ô tìm kiếm môn */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm môn học..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50"
                />
              </div>

              {/* Danh sách chấm tròn môn học */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {selectedSubjectFilter && (
                  <button
                    onClick={() => setSelectedSubjectFilter(null)}
                    className="w-full text-left text-xs font-bold text-indigo-600 hover:underline mb-1"
                  >
                    ✕ Xem tất cả các môn
                  </button>
                )}

                {uniqueSubjects.map((sub, i) => {
                  const palette = COLOR_MAP[sub.color] || COLOR_MAP.blue;
                  const isSelected = selectedSubjectFilter === sub.title;

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelectedSubjectFilter(isSelected ? null : sub.title)
                      }
                      className={`w-full text-left px-2 py-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-xs font-medium ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${palette.dot} shrink-0`}></span>
                      <span className="truncate flex-1">{sub.title}</span>
                    </button>
                  );
                })}

                {uniqueSubjects.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">
                    Chưa có môn học nào
                  </p>
                )}
              </div>
            </div>
          </aside>

          {/* CỘT PHẢI: LƯỚI THỜI KHÓA BIỂU CHÍNH (9/12 cols) */}
          <main className="lg:col-span-9 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto min-w-[760px]">
              
              {/* Header 7 Cột Ngày */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/60 sticky top-0 z-20">
                {/* Góc trống trục giờ */}
                <div className="p-3 border-r border-slate-200/60 text-center text-xs font-semibold text-slate-400">
                  Giờ
                </div>

                {/* 7 Cột Thứ */}
                {weekDays.map((col, idx) => (
                  <div
                    key={idx}
                    className={`py-3 px-2 text-center border-r border-slate-200/60 last:border-r-0 transition-colors ${
                      col.isToday ? 'bg-indigo-50/70' : ''
                    }`}
                  >
                    <div
                      className={`text-xs font-bold ${
                        col.isToday ? 'text-indigo-700' : 'text-slate-800'
                      }`}
                    >
                      {col.name}
                    </div>
                    <div
                      className={`text-[11px] font-semibold mt-0.5 ${
                        col.isToday ? 'text-indigo-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {col.dateString}
                    </div>
                  </div>
                ))}
              </div>

              {/* Thân Lưới Thời Gian */}
              <div
                className="relative grid grid-cols-[60px_repeat(7,1fr)]"
                style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
              >
                {/* 1. Trục giờ bên trái */}
                <div className="border-r border-slate-200/70 select-none bg-slate-50/30">
                  {HOURS.map((hour, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="relative text-[11px] font-bold text-slate-400 text-center pt-1"
                    >
                      {hour}
                    </div>
                  ))}
                </div>

                {/* 2. Các cột ngày & thẻ ca học */}
                {weekDays.map((col) => {
                  // Lọc các sự kiện diễn ra vào cột ngày này
                  const colEvents = filteredEvents.filter((ev) => {
                    if (ev.isRecurring) {
                      return ev.dayOfWeek === col.dayIndex;
                    } else if (ev.specificDate) {
                      const evDate = new Date(ev.specificDate);
                      return (
                        evDate.getDate() === col.date.getDate() &&
                        evDate.getMonth() === col.date.getMonth() &&
                        evDate.getFullYear() === col.date.getFullYear()
                      );
                    }
                    return false;
                  });

                  return (
                    <div
                      key={col.dayIndex}
                      className={`relative border-r border-slate-200/60 last:border-r-0 transition-colors ${
                        col.isToday ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Vạch kẻ ngang mờ theo từng mốc giờ */}
                      {HOURS.map((_, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100"
                        />
                      ))}

                      {/* Các thẻ ca học / lịch thi trong cột */}
                      {colEvents.map((ev) => {
                        const { top, height } = calculatePosition(ev.startTime, ev.endTime);
                        const palette = COLOR_MAP[ev.color || 'blue'] || COLOR_MAP.blue;

                        return (
                          <div
                            key={ev.id}
                            onClick={() => setActiveEventDetail(ev)}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                            className={`absolute left-1 right-1 rounded-xl border-l-4 ${palette.border} ${palette.bg} shadow-xs p-2 overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:z-30 cursor-pointer flex flex-col justify-between`}
                          >
                            <div>
                              {/* Dòng 1: Icon & Khung giờ */}
                              <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-600 mb-0.5">
                                <span className="flex items-center gap-1">
                                  {ev.type === 'CLASS' && <BookOpen className="w-3 h-3 text-indigo-600" />}
                                  {ev.type === 'EXAM' && <FileText className="w-3 h-3 text-rose-600" />}
                                  {ev.type === 'EVENT' && <Flag className="w-3 h-3 text-emerald-600" />}
                                  {ev.type === 'OTHER' && <Clock className="w-3 h-3 text-amber-600" />}
                                  <span>{ev.startTime} – {ev.endTime}</span>
                                </span>
                              </div>

                              {/* Dòng 2: Tên môn / Sự kiện */}
                              <h4 className={`font-extrabold text-xs leading-tight line-clamp-2 ${palette.text}`}>
                                {ev.title}
                              </h4>
                            </div>

                            {/* Dòng 3 & 4: Phòng học, Giảng viên, Badge */}
                            <div className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                              {ev.room && (
                                <div className="flex items-center gap-1 font-medium truncate">
                                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.room}</span>
                                </div>
                              )}
                              {ev.class?.teacher?.name && (
                                <div className="flex items-center gap-1 font-medium truncate text-slate-500">
                                  <User className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.class.teacher.name}</span>
                                </div>
                              )}

                              {/* Badge loại nếu không phải Class thông thường */}
                              {ev.type !== 'CLASS' && (
                                <div className="pt-0.5 flex justify-end">
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${palette.badgeBg} ${palette.badgeText}`}>
                                    {ev.type === 'EXAM' ? 'Lịch thi' : ev.type === 'EVENT' ? 'Sự kiện' : 'Khác'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Vạch giờ hiện tại trên cột hôm nay */}
                      {col.isToday && currentTimeLine && (
                        <div
                          style={{ top: `${currentTimeLine.top}px` }}
                          className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-200 -ml-1.5 shadow-sm" />
                          <div className="flex-1 border-t-2 border-indigo-600" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Vạch chỉ giờ hiện tại trên trục giờ bên trái */}
                {currentTimeLine && (
                  <div
                    style={{ top: `${currentTimeLine.top - 10}px` }}
                    className="absolute left-1 z-50 pointer-events-none"
                  >
                    <span className="px-1.5 py-0.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-md shadow-md">
                      {currentTimeLine.timeLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* --- MODAL CHI TIẾT SỰ KIỆN --- */}
        {activeEventDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full ${
                      COLOR_MAP[activeEventDetail.color || 'blue']?.dot || 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {activeEventDetail.type === 'CLASS'
                        ? 'Lớp học định kỳ'
                        : activeEventDetail.type === 'EXAM'
                        ? 'Lịch thi học phần'
                        : 'Sự kiện học vụ'}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      {activeEventDetail.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActiveEventDetail(null)}
                  className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông tin chi tiết */}
              <div className="space-y-2.5 bg-slate-50 rounded-2xl p-4 text-xs font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>
                    Thời gian:{' '}
                    <strong className="text-slate-900">
                      {activeEventDetail.startTime} – {activeEventDetail.endTime}
                    </strong>{' '}
                    ({activeEventDetail.isRecurring
                      ? DAY_NAMES.find((d) => d.dayIndex === activeEventDetail.dayOfWeek)?.name
                      : activeEventDetail.specificDate?.slice(0, 10)})
                  </span>
                </div>

                {activeEventDetail.room && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>
                      Địa điểm / Phòng:{' '}
                      <strong className="text-slate-900">{activeEventDetail.room}</strong>
                    </span>
                  </div>
                )}

                {activeEventDetail.class?.name && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-purple-600" />
                    <span>
                      Lớp phụ trách:{' '}
                      <strong className="text-slate-900">{activeEventDetail.class.name}</strong>
                    </span>
                  </div>
                )}

                {activeEventDetail.class?.teacher?.name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>
                      Giảng viên:{' '}
                      <strong className="text-slate-900">{activeEventDetail.class.teacher.name}</strong>
                    </span>
                  </div>
                )}

                {activeEventDetail.description && (
                  <div className="pt-2 border-t border-slate-200/60 text-slate-600 font-normal">
                    <p className="font-bold text-slate-800 mb-0.5">Ghi chú:</p>
                    <p>{activeEventDetail.description}</p>
                  </div>
                )}
              </div>

              {/* Nút thao tác (nếu là Giảng viên) */}
              <div className="flex items-center justify-end gap-2 pt-2">
                {isTeacher && (
                  <>
                    <button
                      onClick={() => {
                        const ev = activeEventDetail;
                        setActiveEventDetail(null);
                        onEditEvent?.(ev);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(activeEventDetail.id)}
                      disabled={isDeleting}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa lịch
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveEventDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
