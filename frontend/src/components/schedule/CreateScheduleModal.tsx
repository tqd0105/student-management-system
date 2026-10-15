/**
 * Create / Edit Schedule Modal Component
 * Student Management System - LightBrave Team
 * Modal cho Giảng viên tạo hoặc chỉnh sửa ca học, lịch thi, sự kiện
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  Flag,
  HelpCircle,
  AlertCircle,
  Check,
  Loader2,
  GraduationCap,
  PauseCircle,
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { ScheduleEventItem } from './ScheduleCalendarView';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ScheduleEventItem | null;
}

// Bảng màu cố định chuẩn hóa cho từng loại lịch theo yêu cầu hệ thống
export const SCHEDULE_TYPE_COLORS: Record<
  'CLASS' | 'EXAM' | 'EVENT' | 'OTHER',
  { color: string; label: string; tone: string; activeStyle: string }
> = {
  CLASS: {
    color: 'blue',
    label: 'Xanh cơ bản',
    tone: 'text-blue-600 bg-blue-50 border-blue-200',
    activeStyle: 'bg-blue-50/90 border-blue-500 text-blue-800 shadow-xs ring-1 ring-blue-400',
  },
  EXAM: {
    color: 'rose',
    label: 'Đỏ nổi bật',
    tone: 'text-rose-600 bg-rose-50 border-rose-200',
    activeStyle: 'bg-rose-50/90 border-rose-500 text-rose-800 shadow-xs ring-1 ring-rose-400',
  },
  EVENT: {
    color: 'purple',
    label: 'Tím rực rỡ',
    tone: 'text-purple-600 bg-purple-50 border-purple-200',
    activeStyle: 'bg-purple-50/90 border-purple-500 text-purple-800 shadow-xs ring-1 ring-purple-400',
  },
  OTHER: {
    color: 'amber',
    label: 'Vàng cam',
    tone: 'text-amber-600 bg-amber-50 border-amber-200',
    activeStyle: 'bg-amber-50/90 border-amber-500 text-amber-800 shadow-xs ring-1 ring-amber-400',
  },
};

const DAYS_OF_WEEK = [
  { value: 1, label: 'Thứ Hai' },
  { value: 2, label: 'Thứ Ba' },
  { value: 3, label: 'Thứ Tư' },
  { value: 4, label: 'Thứ Năm' },
  { value: 5, label: 'Thứ Sáu' },
  { value: 6, label: 'Thứ Bảy' },
  { value: 7, label: 'Chủ Nhật' },
];

export default function CreateScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: CreateScheduleModalProps) {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [classId, setClassId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'CLASS' | 'EXAM' | 'EVENT' | 'OTHER'>('CLASS');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [specificDate, setSpecificDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:30');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('blue');
  const [description, setDescription] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseStartDate, setPauseStartDate] = useState('');
  const [pauseEndDate, setPauseEndDate] = useState('');

  // Nút chọn nhanh thời lượng áp dụng lịch lặp
  const handleSetPresetMonths = (months: number) => {
    const base = startDate ? new Date(startDate) : new Date();
    const next = new Date(base);
    next.setMonth(base.getMonth() + months);
    setEndDate(next.toISOString().slice(0, 10));
  };

  const handleSetPresetWeeks = (weeks: number) => {
    const base = startDate ? new Date(startDate) : new Date();
    const next = new Date(base);
    next.setDate(base.getDate() + weeks * 7);
    setEndDate(next.toISOString().slice(0, 10));
  };

  // Tải danh sách lớp phụ trách
  useEffect(() => {
    if (!isOpen) return;

    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await ApiService.getScheduleClasses();
        if (res.success && Array.isArray(res.data)) {
          setClasses(res.data);
        }
      } catch (err) {
        console.error('Lỗi lấy danh sách lớp học:', err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [isOpen]);

  // Khởi tạo dữ liệu form khi sửa hoặc tạo mới
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    if (initialData) {
      setClassId(initialData.classId || '');
      setTitle(initialData.title || '');
      const itemType = (initialData.type || 'CLASS') as 'CLASS' | 'EXAM' | 'EVENT' | 'OTHER';
      setType(itemType);
      setIsRecurring(Boolean(initialData.isRecurring));
      setDayOfWeek(initialData.dayOfWeek || 1);
      setSpecificDate(
        initialData.specificDate ? initialData.specificDate.slice(0, 10) : ''
      );
      setStartDate(
        initialData.startDate ? initialData.startDate.slice(0, 10) : ''
      );
      setEndDate(
        initialData.endDate ? initialData.endDate.slice(0, 10) : ''
      );
      setStartTime(initialData.startTime || '07:30');
      setEndTime(initialData.endTime || '09:30');
      setRoom(initialData.room || '');
      // Cố định màu sắc chuẩn hóa theo phân loại lịch
      setColor(SCHEDULE_TYPE_COLORS[itemType]?.color || 'blue');
      setDescription(initialData.description || '');
      setIsPaused(Boolean(initialData.isPaused));
      setPauseReason(initialData.pauseReason || '');
      setPauseStartDate(initialData.pauseStartDate ? initialData.pauseStartDate.slice(0, 10) : '');
      setPauseEndDate(initialData.pauseEndDate ? initialData.pauseEndDate.slice(0, 10) : '');
    } else {
      // Mặc định tạo mới
      const todayStr = new Date().toISOString().slice(0, 10);
      const defaultEnd = new Date();
      defaultEnd.setMonth(defaultEnd.getMonth() + 4); // Mặc định 1 học kỳ (4 tháng)

      setClassId('');
      setTitle('');
      setType('CLASS');
      setIsRecurring(true);
      setDayOfWeek(1);
      setSpecificDate(todayStr);
      setStartDate(todayStr);
      setEndDate(defaultEnd.toISOString().slice(0, 10));
      setStartTime('07:30');
      setEndTime('09:30');
      setRoom('');
      setColor(SCHEDULE_TYPE_COLORS.CLASS.color);
      setDescription('');
      setIsPaused(false);
      setPauseReason('');
      setPauseStartDate('');
      setPauseEndDate('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Client-side Validation
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên môn học hoặc tiêu đề sự kiện');
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage('Vui lòng chọn khung giờ học bắt đầu và kết thúc');
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage('Giờ kết thúc phải diễn ra sau giờ bắt đầu');
      return;
    }

    if (!isRecurring && !specificDate) {
      setErrorMessage('Vui lòng chọn ngày diễn ra cụ thể');
      return;
    }

    if (isRecurring && startDate && endDate && startDate > endDate) {
      setErrorMessage('Ngày kết thúc áp dụng lặp phải sau ngày bắt đầu');
      return;
    }

    // 2. Chuẩn bị payload (màu sắc cố định theo đúng phân loại lịch)
    const fixedColor = SCHEDULE_TYPE_COLORS[type]?.color || 'blue';
    const payload = {
      classId: classId.trim() !== '' ? classId : null,
      title: title.trim(),
      type,
      isRecurring,
      dayOfWeek: isRecurring ? Number(dayOfWeek) : null,
      specificDate: !isRecurring && specificDate ? new Date(specificDate).toISOString() : null,
      startDate: isRecurring && startDate ? new Date(startDate).toISOString() : null,
      endDate: isRecurring && endDate ? new Date(endDate).toISOString() : null,
      startTime,
      endTime,
      room: room.trim() !== '' ? room.trim() : null,
      color: fixedColor,
      description: description.trim() !== '' ? description.trim() : null,
      isPaused,
      pauseReason: isPaused && pauseReason.trim() !== '' ? pauseReason.trim() : null,
      pauseStartDate: isPaused && pauseStartDate ? new Date(pauseStartDate).toISOString() : null,
      pauseEndDate: isPaused && pauseEndDate ? new Date(pauseEndDate).toISOString() : null,
    };

    try {
      setSubmitting(true);
      let res;
      if (initialData?.id) {
        res = await ApiService.updateScheduleEvent(initialData.id, payload);
      } else {
        res = await ApiService.createScheduleEvent(payload);
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.message || 'Lỗi khi lưu thời khóa biểu');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Có lỗi xảy ra khi gửi dữ liệu lên máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {initialData ? 'Chỉnh sửa ca học' : 'Thêm ca học / Lịch thi'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Xếp lịch học cho lớp hoặc tạo lịch kiểm tra, sự kiện học vụ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Chọn Lớp học & Tiêu đề môn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lớp học liên kết
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  // Tự động điền tên lớp vào title nếu title đang trống
                  const found = classes.find((c) => c.id === e.target.value);
                  if (found && !title.trim()) {
                    setTitle(found.name);
                  }
                }}
                disabled={loadingClasses}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
                <option value="">(Không gắn lớp cụ thể / Sự kiện chung)</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên môn / Tiêu đề <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Lập trình Web nâng cao"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              >
              </input>
            </div>
          </div>

          {/* 2. Phân loại sự kiện (Type) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Phân loại lịch
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                (Màu sắc cố định theo chuẩn phân loại)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('CLASS');
                  setIsRecurring(true);
                  setColor('blue');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                  type === 'CLASS'
                    ? 'bg-blue-50/90 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Lớp học</span>
                <span className="text-[9.5px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                  Xanh cơ bản
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EXAM');
                  setIsRecurring(false); // Thi thường vào ngày cụ thể
                  setColor('rose');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                  type === 'EXAM'
                    ? 'bg-rose-50/90 border-rose-500 text-rose-900 shadow-xs ring-1 ring-rose-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>Lịch thi</span>
                <span className="text-[9.5px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                  Đỏ nổi bật
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EVENT');
                  setColor('purple');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                  type === 'EVENT'
                    ? 'bg-purple-50/90 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className="w-4 h-4 text-purple-600" />
                <span>Sự kiện</span>
                <span className="text-[9.5px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                  Tím rực rỡ
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('OTHER');
                  setColor('amber');
                }}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                  type === 'OTHER'
                    ? 'bg-amber-50/90 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-400'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Khác</span>
                <span className="text-[9.5px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  Vàng cam
                </span>
              </button>
            </div>
          </div>

          {/* 3. Chế độ lặp: Lịch tuần định kỳ vs Ngày cụ thể */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurringMode"
                  checked={isRecurring}
                  onChange={() => setIsRecurring(true)}
                  className="text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                Lặp định kỳ hàng tuần
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="recurringMode"
                  checked={!isRecurring}
                  onChange={() => setIsRecurring(false)}
                  className="text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                Diễn ra vào ngày cụ thể
              </label>
            </div>

            {isRecurring ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Chọn Thứ trong tuần <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Khoảng thời gian áp dụng lặp (Từ ngày -> Đến ngày) */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Khoảng thời gian áp dụng lặp
                    </span>
                    
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                        Từ ngày (Bắt đầu kỳ)
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                        Đến ngày (Kết thúc kỳ)
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 font-medium"
                      />
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ngày diễn ra (Dương lịch) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                />
              </div>
            )}
          </div>

          {/* 4. Khung giờ học & Phòng học */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giờ bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giờ kết thúc <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phòng học / Địa điểm
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Phòng A-302"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium"
              />
            </div>
          </div>

          {/* 5. Ghi chú thêm (Tùy chọn) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú thêm (Tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Mang laptop, chuẩn bị bài thực hành chương 4..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>

          {/* 6. Trạng thái tạm ngưng lịch (Tùy chọn) */}
          <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Tạm ngưng lịch học này</span>
                  <p className="text-[11px] text-slate-500">Gắn nhãn tạm dừng với học sinh & giảng viên</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPaused}
                  onChange={(e) => setIsPaused(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {isPaused && (
              <div className="space-y-2.5 pt-2 border-t border-slate-200/70 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Lý do tạm ngưng
                  </label>
                  <input
                    type="text"
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    placeholder="Ví dụ: Giảng viên công tác, Nghỉ lễ, Bảo trì phòng..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                      Từ ngày (Bắt đầu nghỉ):
                    </label>
                    <input
                      type="date"
                      value={pauseStartDate}
                      onChange={(e) => setPauseStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                      Đến ngày (Kết thúc nghỉ):
                    </label>
                    <input
                      type="date"
                      value={pauseEndDate}
                      onChange={(e) => setPauseEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Thao tác gửi Form */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {initialData ? 'Cập nhật lịch' : 'Tạo ca học'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
