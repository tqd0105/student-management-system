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
  Palette,
  Loader2,
  GraduationCap
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { ScheduleEventItem, COLOR_MAP } from './ScheduleCalendarView';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ScheduleEventItem | null;
}

const COLOR_OPTIONS = [
  { key: 'blue', name: 'Xanh dương', bg: 'bg-blue-500' },
  { key: 'indigo', name: 'Chàm', bg: 'bg-indigo-600' },
  { key: 'purple', name: 'Tím', bg: 'bg-purple-600' },
  { key: 'emerald', name: 'Xanh ngọc', bg: 'bg-emerald-500' },
  { key: 'amber', name: 'Vàng cam', bg: 'bg-amber-500' },
  { key: 'rose', name: 'Hồng đỏ', bg: 'bg-rose-500' },
  { key: 'cyan', name: 'Xanh cyan', bg: 'bg-cyan-500' },
];

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
  const [startTime, setStartTime] = useState('07:30');
  const [endTime, setEndTime] = useState('09:30');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState('blue');
  const [description, setDescription] = useState('');

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
      setType(initialData.type || 'CLASS');
      setIsRecurring(Boolean(initialData.isRecurring));
      setDayOfWeek(initialData.dayOfWeek || 1);
      setSpecificDate(
        initialData.specificDate ? initialData.specificDate.slice(0, 10) : ''
      );
      setStartTime(initialData.startTime || '07:30');
      setEndTime(initialData.endTime || '09:30');
      setRoom(initialData.room || '');
      setColor(initialData.color || 'blue');
      setDescription(initialData.description || '');
    } else {
      // Mặc định tạo mới
      setClassId('');
      setTitle('');
      setType('CLASS');
      setIsRecurring(true);
      setDayOfWeek(1);
      setSpecificDate(new Date().toISOString().slice(0, 10));
      setStartTime('07:30');
      setEndTime('09:30');
      setRoom('');
      setColor('blue');
      setDescription('');
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

    // 2. Chuẩn bị payload
    const payload = {
      classId: classId.trim() !== '' ? classId : null,
      title: title.trim(),
      type,
      isRecurring,
      dayOfWeek: isRecurring ? Number(dayOfWeek) : null,
      specificDate: !isRecurring && specificDate ? new Date(specificDate).toISOString() : null,
      startTime,
      endTime,
      room: room.trim() !== '' ? room.trim() : null,
      color,
      description: description.trim() !== '' ? description.trim() : null,
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Phân loại lịch
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('CLASS');
                  setIsRecurring(true);
                  if (color === 'rose') setColor('blue');
                }}
                className={`py-2 px-1 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'CLASS'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Lớp học
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EXAM');
                  setIsRecurring(false); // Thi thường vào ngày cụ thể
                  setColor('rose');
                }}
                className={`py-2 px-1 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'EXAM'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Lịch thi
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('EVENT');
                  setColor('emerald');
                }}
                className={`py-2 px-1 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'EVENT'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                Sự kiện
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('OTHER');
                  setColor('amber');
                }}
                className={`py-2 px-1 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  type === 'OTHER'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Khác
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
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Chọn Thứ trong tuần
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
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Ngày diễn ra (Dương lịch)
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

          {/* 5. Chọn màu nhận diện môn học */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              Màu sắc hiển thị trên thời khóa biểu
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_OPTIONS.map((col) => {
                const isSelected = color === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => setColor(col.key)}
                    title={col.name}
                    className={`w-7 h-7 rounded-full ${col.bg} transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? 'ring-3 ring-slate-900 ring-offset-2 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Ghi chú / Mô tả */}
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
