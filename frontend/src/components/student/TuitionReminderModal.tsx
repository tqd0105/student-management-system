'use client';

import React from 'react';
import {
  Bell,
  X,
  CreditCard,
  AlertCircle,
  Clock,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface UnpaidFeeItem {
  id: string;
  title: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  dueDate?: string | null;
  class?: {
    id: string;
    name: string;
  } | null;
}

interface TuitionReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTuition: () => void;
  fees: UnpaidFeeItem[];
  totalRemaining: number;
  studentName?: string;
  studentCode?: string;
}

export default function TuitionReminderModal({
  isOpen,
  onClose,
  onOpenTuition,
  fees,
  totalRemaining,
  studentName,
  studentCode
}: TuitionReminderModalProps) {
  if (!isOpen) return null;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const hasOverdue = fees.some(f => f.status === 'OVERDUE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col transform transition-all animate-scaleUp">
        {/* Header */}
        <div className={`px-6 py-5 text-white flex items-center justify-between ${
          hasOverdue
            ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600'
            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white shadow-inner">
              {hasOverdue ? (
                <ShieldAlert className="w-6 h-6 text-white animate-bounce" />
              ) : (
                <Bell className="w-6 h-6 text-white animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-wide flex items-center gap-2">
                {hasOverdue ? 'Cảnh Báo: Quá Hạn Học Phí' : 'Nhắc Nhở: Học Phí Cần Nộp'}
              </h3>
              <p className="text-white/90 text-xs mt-0.5">
                {studentName ? `${studentName} ` : 'Học sinh '}
                {studentCode && <span className="font-mono bg-white/20 px-1.5 py-0.2 rounded font-semibold">({studentCode})</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Đóng (Để sau)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 bg-slate-50/60 max-h-[70vh] overflow-y-auto">
          {/* Total Debt Highlight Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Tổng tiền còn phải nộp</p>
              <p className={`text-2xl font-black ${hasOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                {formatVND(totalRemaining)}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
              hasOverdue
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {fees.length} khoản chưa nộp
            </div>
          </div>

          {/* List of unpaid items */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chi tiết các khoản thu:
            </p>
            {fees.map((fee) => {
              const isOverdue = fee.status === 'OVERDUE';
              return (
                <div
                  key={fee.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-800 truncate">{fee.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      {fee.class && (
                        <span className="flex items-center gap-1 text-slate-600">
                          <BookOpen className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">{fee.class.name}</span>
                        </span>
                      )}
                      {fee.dueDate && (
                        <span className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                          <Calendar className="w-3 h-3" />
                          <span>Hạn: {new Date(fee.dueDate).toLocaleDateString('vi-VN')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-slate-900">
                      {formatVND(fee.remainingAmount > 0 ? fee.remainingAmount : fee.amount)}
                    </p>
                    {isOverdue ? (
                      <span className="inline-block text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.2 rounded-full border border-rose-200">
                        Quá hạn
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.2 rounded-full border border-amber-200">
                        Chờ nộp
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Friendly Guidance Note */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Vui lòng hoàn thành học phí đúng thời hạn để tránh bị gián đoạn việc tham gia lớp học và kỳ thi. Bạn có thể xem chi tiết tài khoản ngân hàng và mã VietQR để thanh toán ngay.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Để sau (Nhắc lại phiên sau)
          </button>
          <button
            onClick={onOpenTuition}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Thanh toán ngay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
