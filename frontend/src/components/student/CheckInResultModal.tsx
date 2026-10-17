'use client';

import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  WifiOff,
  Wifi,
  ShieldCheck,
  AlertCircle,
  TimerOff,
  UserX,
  AlertOctagon,
  X,
  Camera,
  RefreshCw,
  BookOpen,
  Calendar,
  Laptop,
  Smartphone,
  ChevronRight,
  Info,
  Ban,
  MapPin,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

export type CheckInModalType =
  | 'SUCCESS'
  | 'LATE'
  | 'NETWORK_MISMATCH'
  | 'DEVICE_SHARING_DETECTED'
  | 'LOCATION_OUT_OF_BOUNDS'
  | 'ALREADY_CHECKED_IN'
  | 'QR_EXPIRED'
  | 'NOT_ENROLLED'
  | 'ERROR';

export interface CheckInModalData {
  isOpen: boolean;
  type: CheckInModalType;
  title?: string;
  message?: string;
  studentName?: string;
  studentCode?: string;
  className?: string;
  sessionTitle?: string;
  checkinTime?: string | Date;
  status?: string;
  minutesDiff?: number;
  clientIp?: string;
  networkName?: string;
  // Network mismatch diagnostics
  detectedIp?: string;
  requiredNetwork?: string;
  requiredIp?: string;
  // Anti-Fraud GPS & Device diagnostics
  distanceMeters?: number | null;
  allowedRadius?: number | null;
  deviceId?: string | null;
}

interface CheckInResultModalProps {
  data: CheckInModalData | null;
  onClose: () => void;
  onRetryScan?: () => void;
}

export default function CheckInResultModal({
  data,
  onClose,
  onRetryScan,
}: CheckInResultModalProps) {
  if (!data || !data.isOpen) return null;

  const {
    type,
    title,
    message,
    studentName,
    studentCode,
    className,
    sessionTitle,
    checkinTime,
    status,
    minutesDiff,
    clientIp,
    networkName,
    detectedIp,
    requiredNetwork,
    requiredIp,
    distanceMeters,
    allowedRadius,
    deviceId,
  } = data;

  // Haptic feedback for mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'SUCCESS') {
          navigator.vibrate([80, 50, 80]);
        } else if (type === 'LATE' || type === 'ALREADY_CHECKED_IN') {
          navigator.vibrate([100]);
        } else {
          navigator.vibrate([150, 80, 150]);
        }
      } catch {
        // Ignore haptics errors if blocked
      }
    }
  }, [type]);

  const formatDateTime = (dateVal?: string | Date) => {
    if (!dateVal) return '';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      return d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' - ' + d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(dateVal);
    }
  };

  // Render Theme Configuration
  const getConfig = () => {
    switch (type) {
      case 'SUCCESS':
        return {
          headerBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600',
          iconBg: 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-400/20',
          icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={2.5} />,
          badge: {
            text: 'Có mặt đúng giờ',
            color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            dot: 'bg-emerald-500',
          },
          defaultTitle: 'Điểm Danh Thành Công!',
          defaultDesc: message || 'Bạn đã được ghi nhận có mặt đúng giờ cho buổi học này.',
          btnColor: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25',
          showRetry: false,
        };

      case 'LATE':
        return {
          headerBg: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
          iconBg: 'bg-amber-50 text-amber-600 ring-8 ring-amber-400/20',
          icon: <Clock className="w-12 h-12 text-amber-500" strokeWidth={2.5} />,
          badge: {
            text: `Đi muộn ${minutesDiff ? `(+${minutesDiff} phút)` : ''}`,
            color: 'bg-amber-100 text-amber-800 border-amber-300',
            dot: 'bg-amber-500',
          },
          defaultTitle: 'Điểm Danh Thành Công (Muộn)',
          defaultDesc: message || `Bạn đã được ghi nhận có mặt nhưng trễ so với giờ bắt đầu ${minutesDiff ? `(${minutesDiff} phút)` : ''}.`,
          btnColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25',
          showRetry: false,
        };

      case 'DEVICE_SHARING_DETECTED':
        return {
          headerBg: 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700',
          iconBg: 'bg-rose-50 text-rose-600 ring-8 ring-rose-400/20',
          icon: <Smartphone className="w-12 h-12 text-rose-500 animate-pulse" strokeWidth={2.5} />,
          badge: {
            text: 'Trùng thiết bị điểm danh',
            color: 'bg-rose-100 text-rose-800 border-rose-300',
            dot: 'bg-rose-500',
          },
          defaultTitle: 'Phát Hiện Dùng Chung Thiết Bị!',
          defaultDesc: message || 'Thiết bị này đã được một sinh viên khác sử dụng để điểm danh trong buổi học này.',
          btnColor: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25',
          showRetry: false,
        };

      case 'LOCATION_OUT_OF_BOUNDS':
        return {
          headerBg: 'bg-gradient-to-br from-amber-600 via-rose-600 to-amber-700',
          iconBg: 'bg-rose-50 text-rose-600 ring-8 ring-rose-400/20',
          icon: <MapPin className="w-12 h-12 text-rose-500 animate-bounce " strokeWidth={2.5} />,
          badge: {
            text: 'Ngoài phạm vi phòng học',
            color: 'bg-rose-100 text-rose-800 border-rose-300',
            dot: 'bg-rose-500',
          },
          defaultTitle: 'Vị Trí Ngoài Khu Vực Lớp Học!',
          defaultDesc: message || 'Vị trí GPS của bạn đang ở ngoài khu vực phòng học do giảng viên quy định.',
          btnColor: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25',
          showRetry: true,
        };

      case 'NETWORK_MISMATCH':
        return {
          headerBg: 'bg-gradient-to-br from-rose-500 via-red-500 to-rose-600',
          iconBg: 'bg-rose-50 text-rose-600 ring-8 ring-rose-400/20',
          icon: <Ban className="w-12 h-12 text-rose-500 animate-pulse" strokeWidth={2.5} />,
          badge: {
            text: 'Không đúng Vị trí lớp học',
            color: 'bg-rose-100 text-rose-800 border-rose-300',
            dot: 'bg-rose-500',
          },
          defaultTitle: 'Chưa Đúng Vị Trí Điểm Danh',
          defaultDesc: message || 'Bạn đang không kết nối vào mạng Wi-Fi phòng học do giảng viên yêu cầu.',
          btnColor: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25',
          showRetry: true,
        };

      case 'ALREADY_CHECKED_IN':
        return {
          headerBg: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600',
          iconBg: 'bg-blue-50 text-blue-600 ring-8 ring-blue-400/20',
          icon: <ShieldCheck className="w-12 h-12 text-blue-500" strokeWidth={2.5} />,
          badge: {
            text: status === 'LATE' ? 'Đã điểm danh (Muộn)' : 'Đã điểm danh',
            color: 'bg-blue-100 text-blue-800 border-blue-300',
            dot: 'bg-blue-500',
          },
          defaultTitle: 'Đã Điểm Danh Trước Đó',
          defaultDesc: message || 'Bạn đã hoàn tất điểm danh cho buổi học này rồi, không cần quét lại.',
          btnColor: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25',
          showRetry: false,
        };

      case 'QR_EXPIRED':
        return {
          headerBg: 'bg-gradient-to-br from-slate-600 via-zinc-700 to-slate-700',
          iconBg: 'bg-slate-100 text-slate-700 ring-8 ring-slate-400/20',
          icon: <TimerOff className="w-12 h-12 text-slate-600" strokeWidth={2.5} />,
          badge: {
            text: 'QR hết hiệu lực',
            color: 'bg-slate-100 text-slate-800 border-slate-300',
            dot: 'bg-slate-500',
          },
          defaultTitle: 'Mã QR Hết Hạn / Đã Đổi',
          defaultDesc: message || 'Mã QR vừa quét đã hết hạn hoặc phiên điểm danh đã đóng. Vui lòng nhìn lên màn hình giảng viên để quét mã mới.',
          btnColor: 'bg-slate-800 hover:bg-slate-900 shadow-slate-500/25',
          showRetry: true,
        };

      case 'NOT_ENROLLED':
        return {
          headerBg: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700',
          iconBg: 'bg-purple-50 text-purple-600 ring-8 ring-purple-400/20',
          icon: <UserX className="w-12 h-12 text-purple-600" strokeWidth={2.5} />,
          badge: {
            text: 'Chưa đăng ký lớp',
            color: 'bg-purple-100 text-purple-800 border-purple-300',
            dot: 'bg-purple-500',
          },
          defaultTitle: 'Không Thuộc Danh Sách Lớp',
          defaultDesc: message || 'Bạn chưa có tên trong danh sách sinh viên của lớp học này.',
          btnColor: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25',
          showRetry: false,
        };

      case 'ERROR':
      default:
        return {
          headerBg: 'bg-gradient-to-br from-rose-600 via-red-600 to-rose-700',
          iconBg: 'bg-red-50 text-red-600 ring-8 ring-red-400/20',
          icon: <AlertOctagon className="w-12 h-12 text-red-500" strokeWidth={2.5} />,
          badge: {
            text: 'Không thành công',
            color: 'bg-red-100 text-red-800 border-red-300',
            dot: 'bg-red-500',
          },
          defaultTitle: 'Điểm Danh Không Thành Công',
          defaultDesc: message || 'Đã xảy ra lỗi trong quá trình quét mã. Vui lòng thử lại.',
          btnColor: 'bg-red-600 hover:bg-red-700 shadow-red-500/25',
          showRetry: true,
        };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden border border-gray-100 flex flex-col transform transition-all animate-in zoom-in-95 duration-200 my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Header Bar */}
        <div className={`relative px-6 pt-7 pb-12 text-white shrink-0 ${config.headerBg}`}>
          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Title */}
          <div className="relative text-center pr-6 pl-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-sm mb-2">
              <span className={`w-2 h-2 rounded-full ${type === 'SUCCESS' ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`} />
              {config.badge.text}
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {title || config.defaultTitle}
            </h2>
          </div>
        </div>

        {/* Center Floating Icon Badge */}
        <div className="relative -mt-9 flex justify-center z-10 shrink-0">
          <div className={`p-3.5 sm:p-4 rounded-2xl shadow-xl border-4 border-white ${config.iconBg}`}>
            {config.icon}
          </div>
        </div>

        {/* Body Content */}
        <div className="px-5 sm:px-6 pt-2 pb-6 flex-1 flex flex-col overflow-y-auto overscroll-contain">
          {/* Message Description */}
          <p className="text-sm text-center text-gray-600 font-medium leading-relaxed px-2">
            {config.defaultDesc}
          </p>

          {/* Info Card: Success or Recorded Attendance */}
          {(studentName || className || sessionTitle || checkinTime) && (
            <div className="mt-4 p-4 rounded-2xl bg-gray-50/90 border border-gray-100 space-y-2.5 text-xs text-gray-700 shadow-xs">
              {studentName && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                    Sinh viên:
                  </span>
                  <span className="font-bold text-gray-900 text-right truncate max-w-[200px]">
                    {studentName} {studentCode ? `(${studentCode})` : ''}
                  </span>
                </div>
              )}

              {className && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-gray-500 shrink-0" />
                    Lớp học:
                  </span>
                  <span className="font-semibold text-gray-900 text-right truncate max-w-[200px]">
                    {className}
                  </span>
                </div>
              )}

              {sessionTitle && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                    Buổi học:
                  </span>
                  <span className="font-semibold text-gray-900 text-right truncate max-w-[200px]">
                    {sessionTitle}
                  </span>
                </div>
              )}

              {checkinTime && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                    Thời gian:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatDateTime(checkinTime)}
                  </span>
                </div>
              )}

              {/* Attendance Status Row */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                <span className="text-gray-400 font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Trạng thái:
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                  type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  type === 'LATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  type === 'ALREADY_CHECKED_IN' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {config.badge.text}
                </span>
              </div>

              {distanceMeters !== undefined && distanceMeters !== null && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                    Vị trí phòng học:
                  </span>
                  <span className="font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200 text-xs">
                    Cách ~{distanceMeters}m 
                  </span>
                </div>
              )}

              {networkName && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                  <span className="text-gray-400 font-medium flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-emerald-600 shrink-0" />
                    Xác thực mạng:
                  </span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {networkName}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Location Out of Bounds Diagnostics */}
          {type === 'LOCATION_OUT_OF_BOUNDS' && (
            <div className="mt-4 space-y-3">
              <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-rose-600" />
                    Khoảng cách thực tế:
                  </span>
                  <span className="font-bold text-rose-900 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200">
                    {distanceMeters !== undefined && distanceMeters !== null ? `~${distanceMeters} mét` : 'Ngoài phạm vi'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-gray-600">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    Bán kính lớp cho phép:
                  </span>
                  <span className="font-semibold text-gray-800 bg-white px-2 py-0.5 rounded text-[11px] border border-gray-200">
                    {allowedRadius ? `${allowedRadius} mét` : '100 mét'}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  <Info className="w-3.5 h-3.5" />
                  Lưu ý để điểm danh hợp lệ:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1">
                  <li>Bạn cần có mặt trực tiếp tại phòng học để quét mã.</li>
                  <li>Bật định vị GPS với độ chính xác cao trên điện thoại.</li>
                  <li>Di chuyển vào trong phòng học và bấm nút <strong>&quot;Quét lại mã QR&quot;</strong>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Device Sharing Diagnostics */}
          {type === 'DEVICE_SHARING_DETECTED' && (
            <div className="mt-4 space-y-3">
              <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Quy định Chống Điểm Danh Hộ</span>
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px]">
                  Hệ thống Anti-Fraud phát hiện thiết bị di động này vừa được sử dụng để điểm danh cho một sinh viên khác trong cùng buổi học.
                </p>
                {deviceId && (
                  <div className="pt-1.5 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">Mã định danh thiết bị:</span>
                    <span className="font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                      {deviceId.slice(0, 16)}...
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[11px] text-gray-700 space-y-1">
                <p className="font-bold text-gray-800">Hướng giải quyết:</p>
                <p>Mỗi sinh viên phải tự đăng nhập và quét mã bằng thiết bị của chính mình. Nếu bạn mượn máy hoặc có sự cố, vui lòng báo ngay cho Giảng viên để được điểm danh thủ công.</p>
              </div>
            </div>
          )}

          {/* Network Mismatch Diagnostics Box */}
          {type === 'NETWORK_MISMATCH' && (
            <div className="mt-4 space-y-3">
              <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-rose-700 font-semibold flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-rose-600" />
                    Wi-Fi phòng học yêu cầu:
                  </span>
                  <span className="font-bold text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-rose-200">
                    {requiredNetwork || 'Mạng lớp học'}
                  </span>
                </div>

                {detectedIp && (
                  <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-gray-600">
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <Smartphone className="w-3.5 h-3.5" />
                      IP hiện tại của bạn:
                    </span>
                    <span className="font-mono text-gray-800 bg-rose-100/70 px-1.5 py-0.5 rounded text-[11px]">
                      {detectedIp}
                    </span>
                  </div>
                )}
              </div>

              {/* Step-by-step guidance */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  <Info className="w-3.5 h-3.5" />
                  Các bước cần làm để điểm danh:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-800/90 pl-1">
                  <li>Kết nối điện thoại vào đúng mạng Wi-Fi của lớp học</li>
                  <li>Tắt 4G/LTE và tắt mọi phần mềm VPN (1.1.1.1, Warp, v.v.)</li>
                  <li>Bấm nút <strong>&quot;Quét lại mã QR&quot;</strong> bên dưới</li>
                </ol>
              </div>
            </div>
          )}

          {/* Expired QR tip */}
          {type === 'QR_EXPIRED' && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Giảng viên thường xoay vòng mã QR tự động sau mỗi 10-30 giây để chống gian lận. Bạn chỉ cần giơ máy quét lại mã QR hiện tại trên màn chiếu.
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            {config.showRetry && onRetryScan ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetryScan();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer ${config.btnColor}`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Quét lại mã QR</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer ${config.btnColor}`}
              >
                {type === 'SUCCESS' ? 'Hoàn tất' : 'Đã hiểu'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
