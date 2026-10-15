'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  PauseCircle,
  PlayCircle,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  CalendarRange,
  Infinity as InfinityIcon,
  MessageSquare,
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { ScheduleEventItem } from './ScheduleCalendarView';

interface PauseScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedEvent?: ScheduleEventItem) => void;
  event: ScheduleEventItem | null;
}

const QUICK_REASONS = [
  { label: 'Nghỉ lễ / Tết', icon: '🏖️', text: 'Nghỉ lễ theo quy định của Bộ Giáo dục và Đào tạo' },
  { label: 'Giảng viên công tác', icon: '🩺', text: 'Giảng viên bận lịch công tác ' },
  { label: 'Bảo trì phòng học', icon: '🏢', text: 'Phòng học tạm dừng để nâng cấp, bảo trì kỹ thuật' },
  { label: 'Tuần thi tập trung', icon: '📝', text: 'Tạm ngưng học lý thuyết để phục vụ tuần thi tập trung' },
  { label: 'Dời lịch học', icon: '🔄', text: 'Dời lịch sang buổi học bù theo thông báo' },
  { label: 'Thời tiết xấu', icon: '🌧️', text: 'Nghỉ do điều kiện thời tiết bất khả kháng' },
];

export default function PauseScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  event,
}: PauseScheduleModalProps) {
  const [pauseMode, setPauseMode] = useState<'INDEFINITE' | 'DATE_RANGE'>('DATE_RANGE');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseStartDate, setPauseStartDate] = useState('');
  const [pauseEndDate, setPauseEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !event) return;

    setErrorMessage(null);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (event.isPaused) {
      setPauseReason(event.pauseReason || 'Tạm ngưng theo kế hoạch');
      if (event.pauseStartDate || event.pauseEndDate) {
        setPauseMode('DATE_RANGE');
        setPauseStartDate(event.pauseStartDate ? event.pauseStartDate.slice(0, 10) : todayStr);
        setPauseEndDate(event.pauseEndDate ? event.pauseEndDate.slice(0, 10) : '');
      } else {
        setPauseMode('INDEFINITE');
        setPauseStartDate(todayStr);
        const defaultEnd = new Date();
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        setPauseEndDate(defaultEnd.toISOString().slice(0, 10));
      }
    } else {
      // Mặc định tạm ngưng 1 tuần
      setPauseMode('DATE_RANGE');
      setPauseReason('Giảng viên bận lịch công tác / nghỉ phép');
      setPauseStartDate(todayStr);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setPauseEndDate(nextWeek.toISOString().slice(0, 10));
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  // Xử lý nút chọn nhanh số ngày tạm ngưng
  const handleQuickDuration = (days: number) => {
    const base = pauseStartDate ? new Date(pauseStartDate) : new Date();
    const target = new Date(base);
    target.setDate(base.getDate() + days);
    setPauseEndDate(target.toISOString().slice(0, 10));
  };

  const handleEndMonth = () => {
    const base = pauseStartDate ? new Date(pauseStartDate) : new Date();
    const endOfMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    setPauseEndDate(endOfMonth.toISOString().slice(0, 10));
  };

  // Xác nhận Tạm ngưng
  const handleConfirmPause = async () => {
    setErrorMessage(null);

    if (!pauseReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do tạm ngưng để học sinh và giảng viên nắm thông tin');
      return;
    }

    if (pauseMode === 'DATE_RANGE') {
      if (!pauseStartDate) {
        setErrorMessage('Vui lòng chọn ngày bắt đầu tạm ngưng');
        return;
      }
      if (!pauseEndDate) {
        setErrorMessage('Vui lòng chọn ngày kết thúc tạm ngưng');
        return;
      }
      if (pauseStartDate > pauseEndDate) {
        setErrorMessage('Ngày kết thúc tạm ngưng phải sau hoặc bằng ngày bắt đầu');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        isPaused: true,
        pauseReason: pauseReason.trim(),
        pauseStartDate: pauseMode === 'DATE_RANGE' ? new Date(pauseStartDate).toISOString() : null,
        pauseEndDate: pauseMode === 'DATE_RANGE' ? new Date(pauseEndDate).toISOString() : null,
      };

      const res = await ApiService.togglePauseScheduleEvent(event.id, payload);
      if (res && res.success) {
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMessage(res?.message || 'Không thể cập nhật trạng thái tạm ngưng');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ khi tạm ngưng lịch');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở lại lịch (Khôi phục hoạt động)
  const handleResumeSchedule = async () => {
    setErrorMessage(null);
    try {
      setSubmitting(true);
      const payload = {
        isPaused: false,
        pauseReason: null,
        pauseStartDate: null,
        pauseEndDate: null,
      };

      const res = await ApiService.togglePauseScheduleEvent(event.id, payload);
      if (res && res.success) {
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMessage(res?.message || 'Không thể khôi phục lịch');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi máy chủ khi khôi phục lịch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* --- HEADER --- */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              event.isPaused ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300/50' : 'bg-orange-100 text-orange-700 ring-2 ring-orange-300/50'
            }`}>
              <PauseCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {event.isPaused ? 'Cấu hình Tạm ngưng' : 'Tạm ngưng Lịch học'}
                </h3>
                {event.isPaused && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                    Đang tạm dừng
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 line-clamp-1">
                {event.title} • {event.startTime} – {event.endTime} {event.room ? `(${event.room})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* --- NỘI DUNG CUỘN --- */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5 flex-1 text-xs">
          
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2.5 font-bold animate-in shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner nếu lịch đang tạm ngưng */}
          {event.isPaused && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-black text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Trạng thái: Đang tạm ngưng</span>
                </div>
                <button
                  type="button"
                  onClick={handleResumeSchedule}
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-200 cursor-pointer transition-all active:scale-95"
                >
                  <PlayCircle className="w-4 h-4" />
                  Mở lại lịch ngay
                </button>
              </div>
              <div className="pl-6 pt-2 mt-2 border-t-1 border-gray-200">
                {event.pauseReason && (
                  <p className="text-xs text-amber-800 font-medium">
                    Lý do: <strong>{event.pauseReason}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1. CHỌN CHẾ ĐỘ TẠM NGƯNG */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Hình thức tạm ngưng <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Card 1: Theo khoảng thời gian */}
              <button
                type="button"
                onClick={() => setPauseMode('DATE_RANGE')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  pauseMode === 'DATE_RANGE'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  pauseMode === 'DATE_RANGE' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <CalendarRange className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Theo khoảng thời gian</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium leading-snug">
                    Tự động hoạt động lại sau khi hết hạn.
                  </div>
                </div>
              </button>

              {/* Card 2: Vô thời hạn */}
              <button
                type="button"
                onClick={() => setPauseMode('INDEFINITE')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  pauseMode === 'INDEFINITE'
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20 text-slate-900 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  pauseMode === 'INDEFINITE' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <InfinityIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-xs">Tạm ngưng vô thời hạn</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium leading-snug">
                    Chỉ hoạt động lại khi bạn chủ động ấn "Mở lại lịch".
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. CHỌN KHOẢNG NGÀY NẾU CHỌN DATE_RANGE */}
          {pauseMode === 'DATE_RANGE' && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 text-xs">
                  Khoảng ngày áp dụng tạm ngưng
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Bắt đầu tạm ngưng từ:
                  </label>
                  <input
                    type="date"
                    value={pauseStartDate}
                    onChange={(e) => setPauseStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Đến hết ngày:
                  </label>
                  <input
                    type="date"
                    value={pauseEndDate}
                    onChange={(e) => setPauseEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

            </div>
          )}

          {/* 3. LÝ DO TẠM NGƯNG */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                2. Lý do tạm ngưng <span className="text-rose-500">*</span>
              </label>
            </div>

            {/* Chips gợi ý nhanh */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_REASONS.map((r, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPauseReason(r.text)}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    pauseReason === r.text
                      ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs scale-102'
                      : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>

            {/* Input lý do */}
            <textarea
              rows={2}
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Nhập lý do cụ thể hoặc ghi chú dặn dò học sinh (ví dụ: Nghỉ Tết Nguyên Đán, học bù vào ngày...)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
            />
          </div>


        </div>

        {/* --- FOOTER HÀNH ĐỘNG --- */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          {event.isPaused ? (
            <button
              type="button"
              onClick={handleResumeSchedule}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-emerald-600" />
              Khôi phục hoạt động
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleConfirmPause}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-200/80 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <PauseCircle className="w-4 h-4" />
              {submitting ? 'Đang lưu...' : event.isPaused ? 'Cập nhật tạm ngưng' : 'Xác nhận tạm ngưng'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
