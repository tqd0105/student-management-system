/**
 * Schedule Calendar View Component
 * Student Management System - LightBrave Team
 * Tái hiện 100% bố cục Thời khóa biểu hiện đại theo mẫu thiết kế
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
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
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  PauseCircle,
  PlayCircle,
  Ban,
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import PauseScheduleModal from './PauseScheduleModal';

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
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  color?: string | null;
  isPaused?: boolean;
  pauseReason?: string | null;
  pauseStartDate?: string | null;
  pauseEndDate?: string | null;
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

/**
 * Kiểm tra xem một sự kiện lịch có đang trong trạng thái tạm ngưng vào ngày targetDate hay không.
 */
export const isEventPausedOnDate = (ev: ScheduleEventItem, targetDate: Date): boolean => {
  if (!ev.isPaused) return false;

  // Nếu có giới hạn ngày tạm ngưng
  if (ev.pauseStartDate || ev.pauseEndDate) {
    const targetTime = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate()
    ).getTime();

    if (ev.pauseStartDate) {
      const s = new Date(ev.pauseStartDate);
      const startTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      if (targetTime < startTime) return false;
    }

    if (ev.pauseEndDate) {
      const e = new Date(ev.pauseEndDate);
      const endTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
      if (targetTime > endTime) return false;
    }

    return true;
  }

  // Tạm ngưng vô thời hạn
  return true;
};

/**
 * Kiểm tra xem một sự kiện lịch có diễn ra vào ngày mục tiêu hay không.
 * Nếu là lịch định kỳ: Kiểm tra Thứ và Khoảng thời gian áp dụng lặp (startDate -> endDate).
 * Nếu là lịch cụ thể: Khớp chính xác ngày dương lịch.
 */
export const isEventOnDate = (
  ev: ScheduleEventItem,
  targetDate: Date,
  targetDayIndex?: number
): boolean => {
  const dayIndex =
    targetDayIndex !== undefined
      ? targetDayIndex
      : targetDate.getDay() === 0
        ? 7
        : targetDate.getDay();

  const targetTime = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).getTime();

  if (ev.isRecurring) {
    if (ev.dayOfWeek !== dayIndex) return false;

    // Giới hạn ngày bắt đầu áp dụng lặp
    if (ev.startDate) {
      const s = new Date(ev.startDate);
      const startTime = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
      if (targetTime < startTime) return false;
    }

    // Giới hạn ngày kết thúc lặp
    if (ev.endDate) {
      const e = new Date(ev.endDate);
      const endTime = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
      if (targetTime > endTime) return false;
    }

    return true;
  } else if (ev.specificDate) {
    const evDate = new Date(ev.specificDate);
    const evTime = new Date(
      evDate.getFullYear(),
      evDate.getMonth(),
      evDate.getDate()
    ).getTime();
    return targetTime === evTime;
  }

  return false;
};

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
  '19:00',
  '20:00',
  '21:00'
];

const HOUR_HEIGHT = 84; // Chiều cao mỗi mốc 1 giờ (pixels) - Tối ưu 84px để hiển thị đầy đủ thông tin ca học
const START_HOUR_MINUTES = 7 * 60; // 07:00 = 420 phút
const END_HOUR_MINUTES = 21 * 60; // 18:00 = 1080 phút

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
    border: 'border-l-blue-600 border-blue-200/90',
    bg: 'bg-gradient-to-br from-blue-50/95 via-blue-50/80 to-white/95 hover:from-blue-100/90 hover:to-white',
    text: 'text-blue-950',
    badgeBg: 'bg-blue-100/90',
    badgeText: 'text-blue-800',
    dot: 'bg-blue-600',
    accent: '#2563eb',
  },
  indigo: {
    border: 'border-l-indigo-600 border-indigo-200/90',
    bg: 'bg-gradient-to-br from-indigo-50/95 via-indigo-50/80 to-white/95 hover:from-indigo-100/90 hover:to-white',
    text: 'text-indigo-950',
    badgeBg: 'bg-indigo-100/90',
    badgeText: 'text-indigo-800',
    dot: 'bg-indigo-600',
    accent: '#4f46e5',
  },
  purple: {
    border: 'border-l-purple-600 border-purple-200/90',
    bg: 'bg-gradient-to-br from-purple-50/95 via-purple-50/80 to-white/95 hover:from-purple-100/90 hover:to-white',
    text: 'text-purple-950',
    badgeBg: 'bg-purple-100/90',
    badgeText: 'text-purple-800',
    dot: 'bg-purple-600',
    accent: '#9333ea',
  },
  emerald: {
    border: 'border-l-emerald-600 border-emerald-200/90',
    bg: 'bg-gradient-to-br from-emerald-50/95 via-emerald-50/80 to-white/95 hover:from-emerald-100/90 hover:to-white',
    text: 'text-emerald-950',
    badgeBg: 'bg-emerald-100/90',
    badgeText: 'text-emerald-800',
    dot: 'bg-emerald-600',
    accent: '#059669',
  },
  amber: {
    border: 'border-l-amber-500 border-amber-200/90',
    bg: 'bg-gradient-to-br from-amber-50/95 via-amber-50/80 to-white/95 hover:from-amber-100/90 hover:to-white',
    text: 'text-amber-950',
    badgeBg: 'bg-amber-100/90',
    badgeText: 'text-amber-800',
    dot: 'bg-amber-500',
    accent: '#d97706',
  },
  rose: {
    border: 'border-l-rose-600 border-rose-200/90',
    bg: 'bg-gradient-to-br from-rose-50/95 via-rose-50/80 to-white/95 hover:from-rose-100/90 hover:to-white',
    text: 'text-rose-950',
    badgeBg: 'bg-rose-100/90',
    badgeText: 'text-rose-800',
    dot: 'bg-rose-600',
    accent: '#e11d48',
  },
  cyan: {
    border: 'border-l-cyan-600 border-cyan-200/90',
    bg: 'bg-gradient-to-br from-cyan-50/95 via-cyan-50/80 to-white/95 hover:from-cyan-100/90 hover:to-white',
    text: 'text-cyan-950',
    badgeBg: 'bg-cyan-100/90',
    badgeText: 'text-cyan-800',
    dot: 'bg-cyan-600',
    accent: '#0891b2',
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
  const [selectedTypeTab, setSelectedTypeTab] = useState<'ALL' | 'CLASS' | 'EXAM' | 'EVENT' | 'OTHER' | 'PAUSED'>('ALL');

  // Ẩn / Hiện thanh bên (Sidebar Toggle)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Bộ lọc bên sidebar
  const [subjectSearch, setSubjectSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);

  // Modal tạm ngưng lịch
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [pauseModalEvent, setPauseModalEvent] = useState<ScheduleEventItem | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // Tham chiếu cuộn ngang lịch trên mobile/tablet
  const todayColumnRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Tự động cuộn đến cột ngày hôm nay
  const scrollToToday = () => {
    if (todayColumnRef.current && scrollContainerRef.current) {
      const colLeft = todayColumnRef.current.offsetLeft;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, colLeft - 70),
        behavior: 'smooth',
      });
    }
  };

  // Tự động khôi phục tùy chọn hiển thị sidebar từ localStorage (mặc định thu gọn trên mobile/tablet < 1024px)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sms_schedule_sidebar_open');
      if (saved !== null) {
        setIsSidebarOpen(saved === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sms_schedule_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  // Chi tiết sự kiện đang xem
  const [activeEventDetail, setActiveEventDetail] = useState<ScheduleEventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab đang chọn trong từng cụm sự kiện trùng giờ (Segmented Tabs trên mobile/tablet/desktop)
  const [activeClusterTab, setActiveClusterTab] = useState<Record<string, number>>({});

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

  // Tự động tính toán thông tin Học kỳ, Năm học và Khoảng ngày của tuần đang xem
  const currentWeekInfo = useMemo(() => {
    if (!weekDays || weekDays.length < 7) {
      return { weekRange: '', semester: '', shortSemester: '' };
    }

    const firstDay = weekDays[0].date;
    const lastDay = weekDays[6].date;

    const startStr = `${String(firstDay.getDate()).padStart(2, '0')}/${String(firstDay.getMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(lastDay.getDate()).padStart(2, '0')}/${String(lastDay.getMonth() + 1).padStart(2, '0')}/${lastDay.getFullYear()}`;

    // Quy tắc phân bổ học kỳ chuẩn theo quy chế đào tạo Việt Nam:
    // - Tháng 9 -> Tháng 1 năm sau: Học kỳ 1 (Năm học YYYY – YYYY+1)
    // - Tháng 2 -> Tháng 6: Học kỳ 2 (Năm học YYYY-1 – YYYY)
    // - Tháng 7 -> Tháng 8: Học kỳ Hè (Năm học YYYY-1 – YYYY)
    const month = firstDay.getMonth() + 1; // 1 - 12
    const year = firstDay.getFullYear();

    let semester = '';
    let shortSemester = '';
    if (month >= 9) {
      semester = `Học kỳ 1 • Năm học ${year} – ${year + 1}`;
      shortSemester = `HK1 (${year}–${year + 1})`;
    } else if (month === 1) {
      semester = `Học kỳ 1 • Năm học ${year - 1} – ${year}`;
      shortSemester = `HK1 (${year - 1}–${year})`;
    } else if (month >= 2 && month <= 6) {
      semester = `Học kỳ 2 • Năm học ${year - 1} – ${year}`;
      shortSemester = `HK2 (${year - 1}–${year})`;
    } else {
      semester = `Học kỳ Hè • Năm học ${year - 1} – ${year}`;
      shortSemester = `HK Hè (${year - 1}–${year})`;
    }

    return {
      weekRange: `${startStr} – ${endStr}`,
      semester,
      shortSemester,
    };
  }, [weekDays]);

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
    setTimeout(scrollToToday, 80);
  };

  // Tự động cuộn đến cột hôm nay khi khởi tạo hoặc chuyển tuần
  useEffect(() => {
    const timer = setTimeout(scrollToToday, 350);
    return () => clearTimeout(timer);
  }, [currentDate]);

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
    const rawDays: {
      dayNumber: number;
      isCurrentMonth: boolean;
      date: Date;
    }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      rawDays.push({
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      rawDays.push({
        dayNumber: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Đủ 35 hoặc 42 ô
    const remaining = 35 - rawDays.length;
    if (remaining > 0) {
      for (let i = 1; i <= remaining; i++) {
        rawDays.push({
          dayNumber: i,
          isCurrentMonth: false,
          date: new Date(year, month + 1, i),
        });
      }
    }

    return rawDays.map((d) => {
      const isSelected =
        d.date.getDate() === currentDate.getDate() &&
        d.date.getMonth() === currentDate.getMonth() &&
        d.date.getFullYear() === currentDate.getFullYear();

      const isToday =
        d.date.getDate() === nowTime.getDate() &&
        d.date.getMonth() === nowTime.getMonth() &&
        d.date.getFullYear() === nowTime.getFullYear();

      // Kiểm tra xem ngày này có sự kiện nào không (định kỳ trong khoảng hoặc ngày cụ thể)
      const dayOfWeek = d.date.getDay() === 0 ? 7 : d.date.getDay(); // 1 = T2 ... 7 = CN
      const dayEvents = events.filter((ev) => isEventOnDate(ev, d.date, dayOfWeek));

      // 4 màu chuẩn hóa đồng bộ toàn hệ thống: CLASS -> blue, EXAM -> rose, EVENT -> purple, OTHER -> amber
      const TYPE_DOT_COLORS: Record<string, string> = {
        CLASS: 'bg-blue-500',
        EXAM: 'bg-rose-500',
        EVENT: 'bg-purple-500',
        OTHER: 'bg-amber-500',
      };

      const eventDots: string[] = dayEvents.map((ev) => {
        return TYPE_DOT_COLORS[ev.type] || 'bg-blue-500';
      });

      // Thống kê số lượng từng loại lịch để hiển thị tooltip chi tiết
      const classCount = dayEvents.filter((e) => e.type === 'CLASS').length;
      const examCount = dayEvents.filter((e) => e.type === 'EXAM').length;
      const eventActivityCount = dayEvents.filter((e) => e.type === 'EVENT').length;
      const otherCount = dayEvents.filter((e) => e.type === 'OTHER').length;

      const summaryParts: string[] = [];
      if (classCount > 0) summaryParts.push(`${classCount} lớp học`);
      if (examCount > 0) summaryParts.push(`${examCount} lịch thi`);
      if (eventActivityCount > 0) summaryParts.push(`${eventActivityCount} sự kiện`);
      if (otherCount > 0) summaryParts.push(`${otherCount} lịch khác`);

      const tooltipText = `${d.dayNumber}/${d.date.getMonth() + 1}${
        summaryParts.length > 0 ? ` • ${summaryParts.join(', ')}` : ''
      }`;

      return {
        ...d,
        isSelected,
        isToday,
        hasEvents: dayEvents.length > 0,
        eventCount: dayEvents.length,
        eventDots,
        tooltipText,
      };
    });
  }, [currentDate, nowTime, events]);

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

  // Đếm tổng số lịch đang tạm ngưng
  const pausedEventsCount = useMemo(() => events.filter((e) => e.isPaused).length, [events]);

  // Bộ lọc sự kiện
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // 1. Lọc theo tab chính (Tất cả / Lịch học / Lịch thi / Sự kiện / Khác / Tạm ngưng)
      if (selectedTypeTab === 'PAUSED') {
        if (!ev.isPaused) return false;
      } else if (selectedTypeTab !== 'ALL' && ev.type !== selectedTypeTab) {
        return false;
      }

      // 2. Lọc theo môn học chọn ở sidebar hoặc filter tag
      if (selectedSubjectFilter && ev.title.trim() !== selectedSubjectFilter) {
        return false;
      }

      return true;
    });
  }, [events, selectedTypeTab, selectedSubjectFilter]);

  // Khôi phục hoạt động cho lịch từ chi tiết
  const handleResumeFromDetail = async (ev: ScheduleEventItem) => {
    try {
      setIsResuming(true);
      const res = await ApiService.togglePauseScheduleEvent(ev.id, { isPaused: false });
      if (res && res.success) {
        setEvents((prev) => prev.map((e) => (e.id === ev.id ? res.data : e)));
        setActiveEventDetail(res.data);
      } else {
        alert(res?.message || 'Không thể khôi phục lịch');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi khôi phục lịch');
    } finally {
      setIsResuming(false);
    }
  };

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
    const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 48);

    return { top, height };
  };

  // Thuật toán gom cụm các sự kiện giao thoa khung giờ thành thẻ 100% chiều rộng kèm Tab chuyển đổi
  const calculateEventClusters = (dayEvents: ScheduleEventItem[]) => {
    const parseMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };

    if (dayEvents.length === 0) return [];

    // Sắp xếp các sự kiện theo giờ bắt đầu tăng dần, nếu bằng giờ bắt đầu thì ưu tiên sự kiện dài hơn
    const sorted = [...dayEvents].sort((a, b) => {
      const diffStart = parseMins(a.startTime) - parseMins(b.startTime);
      if (diffStart !== 0) return diffStart;
      return parseMins(b.endTime) - parseMins(a.endTime);
    });

    // Gom cụm các sự kiện có khung thời gian giao thoa nhau (Connected Overlapping Clusters)
    const rawClusters: ScheduleEventItem[][] = [];
    let currentCluster: ScheduleEventItem[] = [];
    let clusterEnd = -1;

    for (const ev of sorted) {
      const start = parseMins(ev.startTime);
      const end = parseMins(ev.endTime);

      if (currentCluster.length === 0) {
        currentCluster.push(ev);
        clusterEnd = end;
      } else if (start < clusterEnd) {
        // Giao thoa thời gian -> thuộc cùng một cụm
        currentCluster.push(ev);
        clusterEnd = Math.max(clusterEnd, end);
      } else {
        // Không giao thoa -> tạo cụm mới
        rawClusters.push(currentCluster);
        currentCluster = [ev];
        clusterEnd = end;
      }
    }
    if (currentCluster.length > 0) {
      rawClusters.push(currentCluster);
    }

    return rawClusters.map((events) => {
      const minStart = events[0].startTime;
      const maxEndEv = [...events].sort((a, b) => parseMins(b.endTime) - parseMins(a.endTime))[0];
      return {
        id: events.map((e) => e.id).join('_'),
        events,
        minStartTime: minStart,
        maxEndTime: maxEndEv.endTime,
        isOverlap: events.length > 1,
      };
    });
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
    <div className="bg-slate-50 min-h-screen text-slate-800 p-2 sm:p-4 md:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-5">

        {/* --- HEADER --- */}
        <header className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3.5 sm:p-4.5 space-y-3.5">
          {/* Hàng 1: Tiêu đề, Toggle thanh bên & Nút thao tác chính */}
          <div className="flex items-center justify-between gap-3">
            {/* Cụm trái: Nút Toggle, Icon & Tiêu đề Lịch */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              {/* Nút toggle Sidebar */}
              <button
                type="button"
                onClick={toggleSidebar}
                title={isSidebarOpen ? 'Thu gọn thanh bên' : 'Mở thanh bên'}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  isSidebarOpen
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 font-bold shadow-xs ring-2 ring-indigo-500/10'
                }`}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 shrink-0" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
                )}
                <span className="text-xs font-bold hidden md:inline whitespace-nowrap">
                  {isSidebarOpen ? 'Thu gọn' : 'Mở thanh bên'}
                </span>
              </button>


              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                    LỊCH HỌC
                  </h1>
                  {/* Chip hiển thị nếu đang lọc môn */}
                  {selectedSubjectFilter && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold shrink-0">
                      <span className="truncate max-w-[130px] sm:max-w-[180px]">Môn: {selectedSubjectFilter}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSubjectFilter(null)}
                        title="Bỏ lọc môn"
                        className="hover:text-indigo-900 p-0.5 rounded-full hover:bg-indigo-200/50 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap truncate max-w-[280px] sm:max-w-none">
                  <span className="hidden sm:inline">{currentWeekInfo.semester} • </span>
                  <span className="sm:hidden font-bold text-slate-700">{currentWeekInfo.shortSemester} • </span>
                  <span className="font-bold text-slate-700">Tuần {currentWeekInfo.weekRange}</span>
                </p>
              </div>
            </div>

            {/* Cụm phải: Thêm ca học & Nút Làm mới */}
            <div className="flex items-center gap-2 shrink-0">
              {isTeacher && (
                <button
                  onClick={onOpenCreateModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Thêm ca học</span>
                  <span className="sm:hidden">Thêm</span>
                </button>
              )}

              <button
                onClick={fetchSchedule}
                disabled={loading}
                title="Làm mới lịch"
                className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hàng 2: Bộ lọc danh mục & Điều hướng tuần */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-slate-100">
            {/* Tab pills lọc: Tất cả, Lớp học (Xanh), Lịch thi (Đỏ), Sự kiện (Tím), Khác (Vàng cam) */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 overflow-x-auto max-w-full scrollbar-none shrink-0">
              <button
                onClick={() => setSelectedTypeTab('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedTypeTab('CLASS')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'CLASS'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Lịch học</span>
              </button>
              <button
                onClick={() => setSelectedTypeTab('EXAM')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'EXAM'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>Lịch thi</span>
              </button>
              <button
                onClick={() => setSelectedTypeTab('EVENT')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'EVENT'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flag className="w-3.5 h-3.5 shrink-0" />
                <span>Sự kiện</span>
              </button>
              <button
                onClick={() => setSelectedTypeTab('OTHER')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'OTHER'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Khác</span>
              </button>
              <button
                onClick={() => setSelectedTypeTab('PAUSED')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedTypeTab === 'PAUSED'
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ban className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                <span>Nghỉ</span>
                {pausedEventsCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                      selectedTypeTab === 'PAUSED' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pausedEventsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Điều hướng tuần */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
                  className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors whitespace-nowrap"
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
            </div>
          </div>
        </header>

        {/* --- MAIN LAYOUT: SIDEBAR + CALENDAR GRID --- */}
        <div className={`grid grid-cols-1 ${isSidebarOpen ? 'lg:grid-cols-12' : 'grid-cols-1'} gap-5 items-start`}>

          {/* CỘT TRÁI (3/12 cols) - DESKTOP (>= lg) */}
          {isSidebarOpen && (
            <aside className="hidden lg:block lg:col-span-3 space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
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
                        type="button"
                        onClick={() => setCurrentDate(d.date)}
                        title={d.tooltipText}
                        className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 mx-auto rounded-full flex flex-col items-center justify-center font-medium transition-all cursor-pointer ${
                          d.isSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-200'
                            : d.isToday
                              ? 'border-2 border-indigo-600 text-indigo-700 font-extrabold bg-indigo-50/70'
                              : d.isCurrentMonth
                                ? 'text-slate-700 hover:bg-slate-100 font-semibold'
                                : 'text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="leading-none text-[11px] select-none">{d.dayNumber}</span>
                        {d.hasEvents && (
                          <div className="absolute bottom-0.5 left-0 right-0 flex items-center justify-center gap-0.5 pointer-events-none">
                            {d.eventDots.slice(0, 3).map((dotClass, dotIdx) => (
                              <span
                                key={dotIdx}
                                className={`w-1 h-1 rounded-full ${dotClass} ${
                                  d.isSelected ? 'ring-1 ring-white shadow-xs' : 'ring-[0.5px] ring-white/60 shadow-2xs'
                                }`}
                              />
                            ))}
                            {d.eventDots.length > 3 && (
                              <span
                                className={`text-[7px] leading-none font-black ${
                                  d.isSelected ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                +
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Chú thích 4 màu đồng bộ chuẩn hóa */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10.5px] font-semibold text-slate-600 select-none">
                  <div className="flex items-center gap-1.5" title="Màu xanh: Lớp học chính khóa">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-2xs shrink-0" />
                    <span className="truncate">Lớp học</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Màu đỏ hồng: Lịch thi">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs shrink-0" />
                    <span className="truncate">Lịch thi</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Màu tím: Sự kiện học vụ, workshop">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shadow-2xs shrink-0" />
                    <span className="truncate">Sự kiện</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Màu vàng cam: Hoạt động khác">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs shrink-0" />
                    <span className="truncate">Khác</span>
                  </div>
                </div>
              </div>

              {/* 2. Môn học (Subject Legend Card) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">Môn học</h3>
                  <span className="text-[11px] font-bold text-slate-400">
                    {uniqueSubjects.length} môn
                  </span>
                </div>

                {/* Ô tìm kiếm môn */}
                <div>
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
                  {selectedSubjectFilter && (
                    <button
                      onClick={() => setSelectedSubjectFilter(null)}
                      className="cursor-pointer w-full text-center text-xs font-bold text-indigo-600 hover:underline mt-2.5"
                    >
                      ✓ Xem tất cả các môn
                    </button>
                  )}
                </div>

                {/* Danh sách chấm tròn môn học */}
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {uniqueSubjects.map((sub, i) => {
                    const palette = COLOR_MAP[sub.color] || COLOR_MAP.blue;
                    const isSelected = selectedSubjectFilter === sub.title;

                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setSelectedSubjectFilter(isSelected ? null : sub.title)
                        }
                        className={`w-full text-left px-2 py-1.5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer text-xs font-medium ${isSelected
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
          )}

          {/* MOBILE & TABLET SLIDE-OVER DRAWER (< lg) */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              {/* Backdrop */}
              <div
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
              />
              {/* Drawer Container */}
              <aside className="relative w-full max-w-[320px] bg-slate-50 h-full overflow-y-auto p-4 space-y-4 shadow-2xl z-10 animate-in slide-in-from-left duration-250">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-900 text-sm">Bộ lọc & Lịch mini</h3>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 1. Mini Calendar Card trong Drawer */}
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

                  <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[11px] font-bold text-slate-400">
                    <span>T2</span>
                    <span>T3</span>
                    <span>T4</span>
                    <span>T5</span>
                    <span>T6</span>
                    <span>T7</span>
                    <span>CN</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center text-xs">
                    {miniCalendarDays.map((d, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCurrentDate(d.date);
                          setIsSidebarOpen(false);
                        }}
                        title={d.tooltipText}
                        className={`relative h-7 w-7 sm:h-7.5 sm:w-7.5 mx-auto rounded-full flex flex-col items-center justify-center font-medium transition-all cursor-pointer ${
                          d.isSelected
                            ? 'bg-indigo-600 text-white font-bold shadow-sm ring-2 ring-indigo-200'
                            : d.isToday
                              ? 'border-2 border-indigo-600 text-indigo-700 font-extrabold bg-indigo-50/70'
                              : d.isCurrentMonth
                                ? 'text-slate-700 hover:bg-slate-100 font-semibold'
                                : 'text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="leading-none text-[11px] select-none">{d.dayNumber}</span>
                        {d.hasEvents && (
                          <div className="absolute bottom-0.5 left-0 right-0 flex items-center justify-center gap-0.5 pointer-events-none">
                            {d.eventDots.slice(0, 3).map((dotClass, dotIdx) => (
                              <span
                                key={dotIdx}
                                className={`w-1 h-1 rounded-full ${dotClass} ${
                                  d.isSelected ? 'ring-1 ring-white shadow-xs' : 'ring-[0.5px] ring-white/60 shadow-2xs'
                                }`}
                              />
                            ))}
                            {d.eventDots.length > 3 && (
                              <span
                                className={`text-[7px] leading-none font-black ${
                                  d.isSelected ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                +
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Chú thích 4 màu đồng bộ chuẩn hóa */}
                  <div className="pt-2.5 mt-2.5 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10.5px] font-semibold text-slate-600 select-none">
                    <div className="flex items-center gap-1.5" title="Màu xanh: Lớp học chính khóa">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-2xs shrink-0" />
                      <span className="truncate">Lớp học</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Màu đỏ hồng: Lịch thi">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-2xs shrink-0" />
                      <span className="truncate">Lịch thi</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Màu tím: Sự kiện học vụ, workshop">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shadow-2xs shrink-0" />
                      <span className="truncate">Sự kiện</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Màu vàng cam: Hoạt động khác">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-2xs shrink-0" />
                      <span className="truncate">Khác</span>
                    </div>
                  </div>
                </div>

                {/* 2. Môn học trong Drawer */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900">Môn học</h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {uniqueSubjects.length} môn
                    </span>
                  </div>

                  <div>
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
                    {selectedSubjectFilter && (
                      <button
                        onClick={() => {
                          setSelectedSubjectFilter(null);
                          setIsSidebarOpen(false);
                        }}
                        className="cursor-pointer w-full text-center text-xs font-bold text-indigo-600 hover:underline mt-2.5"
                      >
                        ✓ Xem tất cả các môn
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {uniqueSubjects.map((sub, i) => {
                      const palette = COLOR_MAP[sub.color] || COLOR_MAP.blue;
                      const isSelected = selectedSubjectFilter === sub.title;

                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedSubjectFilter(isSelected ? null : sub.title);
                            setIsSidebarOpen(false);
                          }}
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
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* CỘT PHẢI: LƯỚI THỜI KHÓA BIỂU CHÍNH (9/12 cols hoặc 12/12 cols khi thu gọn) */}
          <main className={`${isSidebarOpen ? 'lg:col-span-9' : 'lg:col-span-12'} bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden transition-all duration-200 w-full`}>
            {/* Mobile swipe hint banner (chỉ hiển thị trên mobile) */}
            <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/70 border-b border-slate-200/80 text-[11px] text-slate-500 font-medium select-none">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                Chạm thử hoặc vuốt ngang để xem chi tiết
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60 shadow-2xs">↔ Vuốt</span>
            </div>

            {/* Mobile có scroll ngang mượt mà (min-w-[1020px] -> mỗi cột >= 138px), Tablet và Laptop vừa 100% không cuộn */}
            <div ref={scrollContainerRef} className="overflow-x-auto md:overflow-x-visible w-full scroll-smooth">
              <div className="w-full min-w-[1020px] md:min-w-0">

                {/* Header 7 Cột Ngày */}
                <div className="grid grid-cols-[48px_repeat(7,minmax(138px,1fr))] md:grid-cols-[52px_repeat(7,1fr)] lg:grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-20 shadow-2xs">
                  {/* Góc trống trục giờ - CỐ ĐỊNH TRÁI KHI CUỘN NGANG TRÊN MOBILE */}
                  <div className="sticky left-0 top-0 z-40 p-2 sm:p-2.5 lg:p-3 border-r border-slate-200 bg-slate-100/95 backdrop-blur-xs text-center text-[10px] sm:text-xs font-bold text-slate-400 flex items-center justify-center shadow-[2px_0_6px_rgba(0,0,0,0.04)]">
                    Giờ
                  </div>

                  {/* 7 Cột Thứ */}
                  {weekDays.map((col, idx) => {
                    const colDayEvents = filteredEvents.filter((ev) => isEventOnDate(ev, col.date, col.dayIndex));

                    return (
                      <div
                        key={idx}
                        ref={col.isToday ? todayColumnRef : undefined}
                        onClick={(e) => {
                          // Trên mobile, khi bấm vào header cột ngày, cuộn mượt đến cột đó
                          if (typeof window !== 'undefined' && window.innerWidth < 768 && scrollContainerRef.current) {
                            const colLeft = e.currentTarget.offsetLeft;
                            scrollContainerRef.current.scrollTo({
                              left: Math.max(0, colLeft - 56),
                              behavior: 'smooth',
                            });
                          }
                        }}
                        className={`relative py-2 sm:py-2.5 px-1 sm:px-2 text-center border-r border-slate-200/80 last:border-r-0 transition-all cursor-pointer md:cursor-default ${
                          col.isToday
                            ? 'bg-gradient-to-b from-indigo-50/95 via-indigo-50/40 to-white'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {/* Dải viền màu tím chỉ ngày hiện tại */}
                        {col.isToday && (
                          <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 shadow-xs" />
                        )}

                        <div className="flex flex-col items-center justify-center gap-0.5 sm:gap-1">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[11px] sm:text-xs font-extrabold tracking-tight uppercase ${
                                col.isToday ? 'text-indigo-700' : 'text-slate-700'
                              }`}
                            >
                              {col.name}
                            </span>
                          </div>

                          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                            <div
                              className={`inline-flex items-center justify-center min-w-[26px] h-6 sm:min-w-[28px] sm:h-7 px-1.5 sm:px-2 rounded-full text-[11px] sm:text-xs font-black transition-all ${
                                col.isToday
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300 ring-2 ring-indigo-200 scale-105'
                                  : 'text-slate-600 font-bold'
                              }`}
                            >
                              {col.dateString}
                            </div>
                            {colDayEvents.length > 0 && (
                              <span
                                title={`${colDayEvents.length} lịch trong ngày`}
                                className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[8px] sm:text-[8.5px] font-black tabular-nums shrink-0 whitespace-nowrap border transition-colors shadow-2xs select-none ${
                                  col.isToday
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200/90'
                                    : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200/70'
                                }`}
                              >
                                {colDayEvents.length} ca
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Thân Lưới Thời Gian */}
                <div
                  className="relative grid grid-cols-[48px_repeat(7,minmax(138px,1fr))] md:grid-cols-[52px_repeat(7,1fr)] lg:grid-cols-[64px_repeat(7,1fr)] bg-white"
                  style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
                >
                  {/* 1. Trục giờ bên trái - CỐ ĐỊNH TRÁI KHI CUỘN NGANG TRÊN MOBILE */}
                  <div className="sticky left-0 z-20 relative border-r border-slate-200/80 select-none bg-slate-50/95 backdrop-blur-xs shadow-[2px_0_6px_rgba(0,0,0,0.04)]">
                  {HOURS.map((hour, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="relative border-b border-slate-100/90 text-right pr-1.5 sm:pr-2"
                    >
                      <span
                        className={`absolute right-1 sm:right-2 font-mono text-[10px] sm:text-[11px] font-extrabold text-slate-400 select-none tracking-tight ${
                          idx === 0 ? 'top-1.5' : '-top-2.5'
                        }`}
                      >
                        {hour}
                      </span>
                    </div>
                  ))}

                  {/* Vạch chỉ giờ hiện tại trên trục giờ bên trái */}
                  {currentTimeLine && (
                    <div
                      style={{ top: `${currentTimeLine.top - 10}px` }}
                      className="absolute left-0 right-0 z-30 pointer-events-none text-center px-0.5 sm:px-1"
                    >
                      <span className="inline-block px-1 sm:px-1.5 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[9px] sm:text-[10px] rounded-full shadow-md shadow-indigo-300 ring-1 ring-white">
                        {currentTimeLine.timeLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Các cột ngày & thẻ ca học */}
                {weekDays.map((col) => {
                  // Lọc các sự kiện diễn ra vào cột ngày này
                  const colEvents = filteredEvents.filter((ev) => isEventOnDate(ev, col.date, col.dayIndex));

                  return (
                    <div
                      key={col.dayIndex}
                      className={`relative border-r border-slate-200/80 last:border-r-0 transition-colors ${
                        col.isToday ? 'bg-indigo-50/25 ring-1 ring-indigo-100/60' : ''
                      }`}
                    >
                      {/* Vạch kẻ ngang mờ theo từng mốc giờ kèm vạch nửa tiếng */}
                      {HOURS.map((_, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100 relative group"
                        >
                          <div className="absolute top-1/2 left-0 right-0 border-b border-dashed border-slate-100/80 pointer-events-none" />
                        </div>
                      ))}

                      {/* Các thẻ ca học / lịch thi trong cột - Tự động gộp 100% độ rộng kèm Tab chuyển đổi nếu trùng giờ */}
                      {(() => {
                        const clusters = calculateEventClusters(colEvents);
                        return clusters.map((cluster) => {
                          const isOverlap = cluster.isOverlap;
                          const clusterKey = `${col.dayIndex}_${cluster.id}`;
                          const activeIndex =
                            (activeClusterTab[clusterKey] ?? 0) < cluster.events.length
                              ? (activeClusterTab[clusterKey] ?? 0)
                              : 0;
                          const ev = cluster.events[activeIndex] || cluster.events[0];

                          // Tọa độ vị trí: Nếu trùng giờ thì bao quát toàn bộ khung giờ xung đột từ minStartTime đến maxEndTime
                          const startTimeToCalc = isOverlap ? cluster.minStartTime : ev.startTime;
                          const endTimeToCalc = isOverlap ? cluster.maxEndTime : ev.endTime;
                          const { top, height } = calculatePosition(startTimeToCalc, endTimeToCalc);

                          const palette = COLOR_MAP[ev.color || 'blue'] || COLOR_MAP.blue;
                          const isPaused = isEventPausedOnDate(ev, col.date);

                          // Chiều cao tối thiểu: Nếu có tab trùng giờ thì đảm bảo >= 125px để banner stepper và nội dung rộng rãi, thoáng đãng
                          const minHeightForCard = isOverlap ? Math.max(height, 125) : height;

                          const cardStyle: React.CSSProperties = {
                            top: `${top}px`,
                            height: `${minHeightForCard}px`,
                            zIndex: isOverlap ? 25 : 10,
                          };

                          const cardMarginClass =
                            'left-0.5 right-0.5 sm:left-1 sm:right-1 md:left-1 md:right-1 lg:left-1.5 lg:right-1.5';

                          const cardClass = isPaused
                            ? `absolute ${cardMarginClass} rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/95 text-slate-700 shadow-xs hover:shadow-md hover:border-slate-400 p-1.5 sm:p-2 lg:p-2.5 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between group`
                            : `absolute ${cardMarginClass} rounded-xl border border-l-[3.5px] sm:border-l-[4px] ${palette.border} ${palette.bg} shadow-xs hover:shadow-lg hover:shadow-slate-300/40 p-1.5 sm:p-2 lg:p-2.5 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col justify-between`;

                          return (
                            <div
                              key={clusterKey}
                              onClick={() => setActiveEventDetail(ev)}
                              title={`${isPaused ? `🚫 [TẠM NGHỈ] ${ev.pauseReason || ''}\n` : ''}${ev.title}\n⏰ ${ev.startTime} – ${ev.endTime}\n📍 ${ev.room ? `Phòng: ${ev.room}` : 'Chưa xếp phòng'}\n👤 ${ev.class?.teacher?.name ? `GV: ${ev.class?.teacher?.name}` : ''}\n👉 Nhấp để xem chi tiết`}
                              style={cardStyle}
                              className={cardClass}
                            >
                              {/* DẤU GẠCH CHÉO ĐỎ NẾU SỰ KIỆN HIỆN TẠI BỊ TẠM NGHỈ */}
                              {isPaused && (
                                <svg
                                  className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
                                  preserveAspectRatio="none"
                                >
                                  <line
                                    x1="2%"
                                    y1="2%"
                                    x2="98%"
                                    y2="98%"
                                    stroke="#e11d48"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(225, 29, 72, 0.4))' }}
                                  />
                                  <line
                                    x1="98%"
                                    y1="2%"
                                    x2="2%"
                                    y2="98%"
                                    stroke="#e11d48"
                                    strokeWidth="4.5"
                                    strokeLinecap="round"
                                    style={{ filter: 'drop-shadow(0 1px 2px rgba(225, 29, 72, 0.4))' }}
                                  />
                                </svg>
                              )}

                              <div className="min-w-0 relative z-20">
                                {/* HÀNG HEADER CẢNH BÁO TRÙNG GIỜ & STEPPER ĐIỀU HƯỚNG CHUYÊN NGHIỆP */}
                                {isOverlap && (
                                  <div className="mb-2 -mx-1.5 -mt-1.5 sm:-mx-2 sm:-mt-2 lg:-mx-2.5 lg:-mt-2.5 shadow-2xs border-b border-slate-200/90 overflow-hidden">
                                    {/* Dải 1: Badge Cảnh báo số lượng lịch + Dots chỉ báo vị trí bấm trực tiếp */}
                                    <div className="flex flex-col items-center justify-between px-2 py-1 bg-amber-500/15 border-b border-amber-200/60">
                                      <div className="flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                                        <span className="uppercase tracking-wider text-red-700 font-black text-[8.5px] sm:text-[9.5px]">
                                          Gồm {cluster.events.length} lịch
                                        </span>
                                      </div>
                                      {/* Dải dots trực quan: Bấm trực tiếp vào dot để nhảy tới lịch tương ứng */}
                                      <div className="flex items-center gap-1 my-1" onClick={(e) => e.stopPropagation()}>
                                        {cluster.events.map((dotEv, dotIdx) => {
                                          const isDotActive = dotIdx === activeIndex;
                                          const dotPalette = COLOR_MAP[dotEv.color || 'blue'] || COLOR_MAP.blue;
                                          return (
                                            <button
                                              key={dotEv.id || dotIdx}
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveClusterTab((prev) => ({ ...prev, [clusterKey]: dotIdx }));
                                              }}
                                              className={`cursor-pointer transition-all duration-200 ${
                                                isDotActive
                                                  ? `w-3.5 h-2 rounded-full ${dotPalette.dot} ring-1 ring-white shadow-2xs`
                                                  : 'w-2 h-2 rounded-full bg-slate-400 hover:bg-slate-600'
                                              }`}
                                              title={`Lịch ${dotIdx + 1}/${cluster.events.length}: ${dotEv.title} (${dotEv.startTime}–${dotEv.endTime})`}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Dải 2: Thanh Stepper điều hướng toàn chiều ngang (< Lớp học (1/3) >) - Tuyệt đối không bao giờ bị rúm chữ */}
                                    <div className="px-1 py-1 bg-slate-100/90 flex items-center justify-between gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveClusterTab((prev) => {
                                            const cur = prev[clusterKey] ?? 0;
                                            const nextIdx = (cur - 1 + cluster.events.length) % cluster.events.length;
                                            return { ...prev, [clusterKey]: nextIdx };
                                          });
                                        }}
                                        className="w-5 h-5 sm:w-5.5 sm:h-5.5 flex items-center justify-center rounded bg-white hover:bg-slate-200/80 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                                        title="Xem lịch trước"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                      </button>

                                      {/* Tiêu đề vai trò lịch đang chọn + Số thứ tự */}
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveClusterTab((prev) => {
                                            const cur = prev[clusterKey] ?? 0;
                                            const nextIdx = (cur + 1) % cluster.events.length;
                                            return { ...prev, [clusterKey]: nextIdx };
                                          });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 min-w-0 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black text-slate-800 hover:bg-white/60 transition-colors cursor-pointer select-none"
                                        title="Bấm để chuyển nhanh lịch tiếp theo"
                                      >
                                        {ev.type === 'CLASS' && <BookOpen className="w-2.5 h-2.5 text-blue-600 shrink-0" />}
                                        {ev.type === 'EXAM' && <FileText className="w-2.5 h-2.5 text-rose-600 shrink-0" />}
                                        {ev.type === 'EVENT' && <Flag className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                        {ev.type === 'OTHER' && <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />}
                                        <span className="truncate">
                                          {ev.type === 'EXAM'
                                            ? 'Lịch thi'
                                            : ev.type === 'EVENT'
                                              ? 'Sự kiện'
                                              : cluster.events.filter((e) => e.type === 'CLASS').length > 1
                                                ? `Ca ${activeIndex + 1}`
                                                : 'Lớp học'}{' '}
                                          <span className="text-slate-400 font-extrabold">({activeIndex + 1}/{cluster.events.length})</span>
                                        </span>
                                        {isPaused && (
                                          <span className="text-[7px] uppercase font-black text-red-600 bg-red-100 px-1 rounded shrink-0">
                                            Nghỉ
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveClusterTab((prev) => {
                                            const cur = prev[clusterKey] ?? 0;
                                            const nextIdx = (cur + 1) % cluster.events.length;
                                            return { ...prev, [clusterKey]: nextIdx };
                                          });
                                        }}
                                        className="w-5 h-5 sm:w-5.5 sm:h-5.5 flex items-center justify-center rounded bg-white hover:bg-slate-200/80 text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                                        title="Xem lịch tiếp theo"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Dòng 1: Icon & Khung giờ + Badge loại hoặc Tạm dừng */}
                                <div className="flex flex-wrap items-center justify-between gap-0.5 sm:gap-1 mb-1 min-w-0">
                                  <span
                                    className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md shadow-2xs font-extrabold whitespace-nowrap shrink-0 text-[8.5px] sm:text-[9px] lg:text-[10px] tabular-nums tracking-tight ${
                                      isPaused
                                        ? 'bg-white text-slate-600 border border-slate-200'
                                        : 'bg-white/95 text-slate-800 border border-slate-200/70'
                                    }`}
                                  >
                                    {ev.type === 'CLASS' && <BookOpen className={`w-2.5 h-2.5 shrink-0 ${isPaused ? 'text-slate-400' : 'text-blue-600'}`} />}
                                    {ev.type === 'EXAM' && <FileText className={`w-2.5 h-2.5 shrink-0 ${isPaused ? 'text-slate-400' : 'text-rose-600'}`} />}
                                    {ev.type === 'EVENT' && <Flag className={`w-2.5 h-2.5 shrink-0 ${isPaused ? 'text-slate-400' : 'text-purple-600'}`} />}
                                    {ev.type === 'OTHER' && <Clock className={`w-2.5 h-2.5 shrink-0 ${isPaused ? 'text-slate-400' : 'text-amber-600'}`} />}
                                    <span className="whitespace-nowrap">{ev.startTime}–{ev.endTime}</span>
                                  </span>

                                  {isPaused ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-[7.5px] sm:text-[8px] lg:text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 bg-slate-800 text-white flex items-center gap-1 shadow-2xs">
                                      <Ban className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
                                      Tạm nghỉ
                                    </span>
                                  ) : (
                                    ev.type !== 'CLASS' && (
                                      <span className={`px-1 py-0.5 rounded text-[7.5px] sm:text-[8px] lg:text-[8.5px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 ${palette.badgeBg} ${palette.badgeText}`}>
                                        {ev.type === 'EXAM' ? 'Thi' : ev.type === 'EVENT' ? 'Sự kiện' : 'Khác'}
                                      </span>
                                    )
                                  )}
                                </div>

                                {/* Dòng 2: Tên môn / Sự kiện */}
                                <h4
                                  className={`font-black text-[10.5px] sm:text-[11px] md:text-[11.5px] lg:text-[12.5px] leading-snug line-clamp-2 tracking-tight break-words ${
                                    isPaused ? 'text-slate-500 line-through' : palette.text
                                  }`}
                                  title={ev.title}
                                >
                                  {ev.title}
                                </h4>

                                {/* Dòng hiển thị lý do tạm ngưng */}
                                {isPaused && ev.pauseReason && (
                                  <div
                                    className="mt-1 px-1.5 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[8px] sm:text-[8.5px] font-bold text-slate-700 flex items-center gap-1 truncate shadow-2xs"
                                    title={`Lý do tạm ngưng: ${ev.pauseReason}`}
                                  >
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span className="truncate">
                                      <span className="font-black text-slate-900">Lý do:</span> {ev.pauseReason}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Dòng 3 & 4: Phòng học, Giảng viên */}
                              <div
                                className={`mt-auto pt-1 space-y-0.5 text-[9.5px] sm:text-[10px] md:text-[10.5px] min-w-0 relative z-20 ${
                                  isPaused ? 'opacity-70' : ''
                                }`}
                              >
                                {ev.room && (
                                  <div className="flex items-center gap-1 font-bold text-slate-500 truncate min-w-0" title={ev.room}>
                                    <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{ev.room}</span>
                                  </div>
                                )}
                                {ev.class?.teacher?.name && (
                                  <div className="flex items-center gap-1 font-semibold text-slate-500 truncate min-w-0" title={ev.class.teacher.name}>
                                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{ev.class.teacher.name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* Vạch giờ hiện tại trên cột hôm nay */}
                      {col.isToday && currentTimeLine && (
                        <div
                          style={{ top: `${currentTimeLine.top}px` }}
                          className="absolute left-0 right-0 z-40 pointer-events-none flex items-center"
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-indigo-300 ring-offset-1 -ml-1.5 shadow-md shadow-indigo-300 animate-pulse" />
                          <div className="flex-1 border-t-2 border-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                        </div>
                      )}
                    </div>
                  );
                })}


              </div>
            </div>
          </div>
        </main>
      </div>

        {/* --- MODAL CHI TIẾT SỰ KIỆN --- */}
        {activeEventDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <span
                    className={`w-3.5 h-3.5 rounded-full shrink-0 mt-1 sm:mt-1.5 ${
                      COLOR_MAP[activeEventDetail.color || 'blue']?.dot || 'bg-blue-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/70 mb-1">
                      {activeEventDetail.type === 'CLASS'
                        ? 'Lớp học định kỳ'
                        : activeEventDetail.type === 'EXAM'
                          ? 'Lịch thi học phần'
                          : activeEventDetail.type === 'EVENT'
                            ? 'Sự kiện học vụ'
                            : 'Hoạt động khác'}
                    </span>
                    <h3 className="text-base sm:text-xl font-black text-slate-900 leading-snug break-words">
                      {activeEventDetail.title}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setActiveEventDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner hiển thị trạng thái nếu lịch đang bị tạm ngưng */}
              {activeEventDetail.isPaused && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-100/95 border-2 border-dashed border-slate-300 text-slate-900 space-y-2 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-xs text-slate-800">
                      <Ban className="w-4 h-4 text-red-700 shrink-0 stroke-[2.5]" />
                      <span className="text-red-600">TRẠNG THÁI: ĐANG TẠM NGƯNG</span>
                    </div>
                    {isTeacher && (
                      <button
                        type="button"
                        onClick={() => handleResumeFromDetail(activeEventDetail)}
                        disabled={isResuming}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center gap-1 shadow-sm shadow-emerald-200 cursor-pointer transition-all active:scale-95 self-start sm:self-auto"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        {isResuming ? 'Đang mở...' : 'Mở lại lịch ngay'}
                      </button>
                    )}
                  </div>
                  {activeEventDetail.pauseReason && (
                    <div className="text-xs text-slate-800 font-semibold pl-1 sm:pl-6 pt-2 border-t border-slate-200">
                      Lý do: <strong>{activeEventDetail.pauseReason}</strong>
                    </div>
                  )}
                  {(activeEventDetail.pauseStartDate || activeEventDetail.pauseEndDate) && (
                    <div className="text-[11px] text-slate-600 font-medium pl-1 sm:pl-6">
                      Thời gian tạm ngưng: {activeEventDetail.pauseStartDate ? new Date(activeEventDetail.pauseStartDate).toLocaleDateString('vi-VN') : 'Bắt đầu ngay'} – {activeEventDetail.pauseEndDate ? new Date(activeEventDetail.pauseEndDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                    </div>
                  )}
                </div>
              )}

              {/* 1. KHỐI THỜI GIAN & LỊCH TRÌNH (HERO TIME CARD - TỐI ƯU HOÀN HẢO CHO MOBILE) */}
              <div className="rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-indigo-50/90 via-slate-50/70 to-white border border-indigo-100/90 shadow-2xs space-y-2.5 sm:space-y-3">
                {/* Hàng 1: Icon + Tiêu đề nhỏ & Badge Thứ/Ngày (Tách bạch, không bị chèn ép trên mobile) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-300">
                      <Clock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </div>
                    <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                      Khung giờ học
                    </span>
                  </div>

                  {/* Badge thứ / định kỳ */}
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        {activeEventDetail.isRecurring
                          ? (DAY_NAMES.find((d) => d.dayIndex === activeEventDetail.dayOfWeek)?.name || 'Hàng tuần')
                          : 'Lịch cụ thể'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Hàng 2: Giờ bắt đầu – Giờ kết thúc to rõ ràng + Thời lượng + Tag lặp lại */}
                <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-3 pt-0.5">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
                    {activeEventDetail.startTime} <span className="text-indigo-400 font-semibold">–</span> {activeEventDetail.endTime}
                  </div>
                  {(() => {
                    const [h1, m1] = activeEventDetail.startTime.split(':').map(Number);
                    const [h2, m2] = activeEventDetail.endTime.split(':').map(Number);
                    const diff = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
                    if (diff > 0) {
                      const hours = Math.floor(diff / 60);
                      const mins = diff % 60;
                      const text = hours > 0 && mins > 0 ? `${hours}h ${mins}p` : hours > 0 ? `${hours} tiếng` : `${mins} phút`;
                      return (
                        <span className="px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-[11px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs shrink-0">
                          {text}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Hàng 3: Chu kỳ áp dụng (Responsive trên mobile tránh bị đè chữ) */}
                <div className="pt-2 sm:pt-2.5 border-t border-indigo-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500 text-[11px] sm:text-xs">Chu kỳ áp dụng:</span>
                  <span className="font-bold text-slate-800 text-[11.5px] sm:text-xs break-words">
                    {activeEventDetail.isRecurring ? (
                      activeEventDetail.startDate || activeEventDetail.endDate ? (
                        <span>
                          {activeEventDetail.startDate ? new Date(activeEventDetail.startDate).toLocaleDateString('vi-VN') : 'Hiện tại'}
                          {' → '}
                          {activeEventDetail.endDate ? new Date(activeEventDetail.endDate).toLocaleDateString('vi-VN') : 'Vô thời hạn'}
                        </span>
                      ) : (
                        'Áp dụng toàn bộ học kỳ'
                      )
                    ) : (
                      <span>Ngày {activeEventDetail.specificDate ? new Date(activeEventDetail.specificDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
                    )}
                  </span>
                </div>
              </div>

              {/* 2. LƯỚI THÔNG TIN BỔ TRỢ (LỚP HỌC, PHÒNG HỌC, GIẢNG VIÊN) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Lớp phụ trách: Chiếm trọn 2 cột (full width) để hiển thị trọn vẹn tên lớp học mà không bị cắt xén */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-start sm:items-center gap-3 sm:col-span-2 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 border border-purple-200/80 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Lớp phụ trách
                    </div>
                    <div
                      className="text-xs sm:text-[13px] font-black text-slate-900 leading-snug break-words"
                      title={activeEventDetail.class?.name || 'Chung / Toàn trường'}
                    >
                      {activeEventDetail.class?.name || 'Chung / Toàn trường'}
                    </div>
                  </div>
                </div>

                {/* Phòng học / Địa điểm: Chiếm 1 cột (50%) */}
                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center gap-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-rose-100/80 text-rose-600 border border-rose-200/80 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Phòng học / Địa điểm
                    </div>
                    <div className="text-xs font-black text-slate-900 truncate" title={activeEventDetail.room || 'Chưa xếp phòng'}>
                      {activeEventDetail.room || 'Chưa xếp phòng'}
                    </div>
                  </div>
                </div>

                {/* Giảng viên phụ trách: Chiếm 1 cột (50%) */}
                <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center gap-3 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                      Giảng viên phụ trách
                    </div>
                    <div
                      className="text-xs font-black text-slate-900 truncate"
                      title={
                        activeEventDetail.class?.teacher
                          ? `${activeEventDetail.class.teacher.name} (${activeEventDetail.class.teacher.email})`
                          : 'Chưa phân công'
                      }
                    >
                      {activeEventDetail.class?.teacher?.name || 'Chưa phân công'}
                    </div>
                    {activeEventDetail.class?.teacher?.email && (
                      <div className="text-[10px] text-slate-400 font-medium truncate" title={activeEventDetail.class.teacher.email}>
                        {activeEventDetail.class.teacher.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. GHI CHÚ / MÔ TẢ (NẾU CÓ) */}
              {activeEventDetail.description && (
                <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ghi chú / Dặn dò học sinh</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium pl-5 whitespace-pre-wrap">
                    {activeEventDetail.description}
                  </p>
                </div>
              )}

              {/* Nút thao tác (nếu là Giảng viên) */}
              <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                {isTeacher && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPauseModalEvent(activeEventDetail);
                        setIsPauseModalOpen(true);
                      }}
                      className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                        activeEventDetail.isPaused
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      {activeEventDetail.isPaused ? 'Mở lại' : 'Tạm ngưng'}
                    </button>
                    <button
                      onClick={() => {
                        const ev = activeEventDetail;
                        setActiveEventDetail(null);
                        onEditEvent?.(ev);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(activeEventDetail.id)}
                      disabled={isDeleting}
                      className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer"
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

        {/* Modal Tùy chỉnh Tạm ngưng lịch */}
        <PauseScheduleModal
          isOpen={isPauseModalOpen}
          onClose={() => {
            setIsPauseModalOpen(false);
            setPauseModalEvent(null);
          }}
          onSuccess={(updatedEvent) => {
            fetchSchedule();
            if (updatedEvent && activeEventDetail?.id === updatedEvent.id) {
              setActiveEventDetail(updatedEvent);
            }
          }}
          event={pauseModalEvent}
        />
      </div>
    </div>
  );
}
