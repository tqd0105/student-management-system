'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  BookOpen,
  Copy,
  Check,
  Building2,
  Info,
  RefreshCw,
  FileText,
  ShieldCheck
} from 'lucide-react';
import ApiService from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';

interface TuitionFee {
  id: string;
  studentId: string;
  classId?: string;
  class?: {
    id: string;
    name: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  };
  title: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'UNPAID' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  note?: string;
  createdAt: string;
}

interface TuitionSummary {
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
}

interface StudentTuitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentTuitionModal({ isOpen, onClose }: StudentTuitionModalProps) {
  const { user } = useAuth();
  const [fees, setFees] = useState<TuitionFee[]>([]);
  const [summary, setSummary] = useState<TuitionSummary>({ totalAmount: 0, totalPaid: 0, totalRemaining: 0 });
  const [studentProfileData, setStudentProfileData] = useState<{ studentCode?: string; name?: string } | null>(null);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTuitionData();
    }
  }, [isOpen]);

  const loadTuitionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [feeRes, profileRes] = await Promise.all([
        ApiService.getStudentTuitionFees(),
        ApiService.getStudentProfile().catch(() => null)
      ]);

      if (feeRes?.success) {
        const feeList: TuitionFee[] = feeRes.data || [];
        setFees(feeList);
        setSummary(feeRes.summary || { totalAmount: 0, totalPaid: 0, totalRemaining: 0 });
        if (feeRes.student?.studentCode) {
          setStudentProfileData({
            studentCode: feeRes.student.studentCode,
            name: feeRes.student.name
          });
        }
        if (feeList.length > 0) {
          const unpaid = feeList.find(f => f.status !== 'PAID');
          setSelectedFeeId(unpaid ? unpaid.id : feeList[0].id);
        }
      } else {
        setError(feeRes?.message || 'Không thể tải dữ liệu học phí');
      }

      if (profileRes?.success && profileRes?.data?.studentProfile?.studentCode) {
        setStudentProfileData(prev => ({
          studentCode: profileRes.data.studentProfile.studentCode,
          name: profileRes.data.name || prev?.name || user?.name
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const toUnaccentedUpper = (str: string): string => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/\//g, ' ')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const studentCode = studentProfileData?.studentCode || user?.studentProfile?.studentCode || '';
  const studentName = studentProfileData?.name || user?.name || 'Học sinh';

  // Lấy khoản thu đang được chọn hoặc khoản đầu tiên chưa hoàn tất
  const selectedFee = fees.find(f => f.id === selectedFeeId) || fees.find(f => f.status !== 'PAID') || fees[0] || null;
  const currentFeeTitle = selectedFee ? selectedFee.title : 'Hoc phi';

  const cleanCode = toUnaccentedUpper(studentCode || 'SV');
  const cleanName = toUnaccentedUpper(studentName);
  const cleanTitle = toUnaccentedUpper(currentFeeTitle);
  const transferSyntax = `${cleanCode} - ${cleanName} - ${cleanTitle}`;

  const filteredFees = fees.filter(f => {
    if (activeFilter === 'PAID') return f.status === 'PAID';
    if (activeFilter === 'UNPAID') return f.status !== 'PAID';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn tất
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Đóng một phần
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> Quá hạn nộp
          </span>
        );
      case 'WAIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            Miễn giảm
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5" /> Chờ thanh toán
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide flex items-center gap-2">
                Học Phí & Công Nợ Cá Nhân
                {studentCode && (
                  <span className="text-xs font-mono bg-white/25 px-2.5 py-0.5 rounded-full border border-white/40">
                    MSSV: {studentCode}
                  </span>
                )}
              </h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                Theo dõi chi tiết các khoản học phí, lịch sử đóng và hướng dẫn chuyển khoản
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTuitionData}
              disabled={loading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              title="Làm mới"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Tổng tiền học phí</p>
                <p className="text-lg font-bold text-slate-800">{formatVND(summary.totalAmount)}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Đã thanh toán</p>
                <p className="text-lg font-bold text-emerald-600">{formatVND(summary.totalPaid)}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${summary.totalRemaining > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Còn phải nộp (Công nợ)</p>
                <p className={`text-lg font-bold ${summary.totalRemaining > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                  {formatVND(summary.totalRemaining)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Alert Banner if debt exists */}
          {summary.totalRemaining > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900">
                  Bạn có khoản học phí chưa hoàn tất với tổng số tiền {formatVND(summary.totalRemaining)}.
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  Vui lòng kiểm tra hạn nộp bên dưới và chuyển khoản theo thông tin tài khoản của nhà trường để tránh bị gián đoạn môn học.
                </p>
              </div>
            </div>
          )}

          {/* User Guide for selecting fee */}
          {fees.some(f => f.status !== 'PAID') && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/80 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
              <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-sm">
                <Info className="w-4 h-4" />
              </div>
              <div className="text-xs text-blue-900 leading-relaxed">
                <p className="font-bold text-blue-950 text-sm mb-0.5 flex items-center gap-1.5">
                  <span className='uppercase'> Hướng dẫn chọn khoản thu để đóng</span>
                  {/* <span className="text-[11px] font-normal text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">Dễ dàng</span> */}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1 text-slate-700">
                  <span><strong>Nhấp trực tiếp vào dòng khoản thu</strong> trong bảng bên dưới để chọn khoản cần thanh toán.</span>
                  {/* <span className="hidden sm:inline">•</span>
                  <span>Hoặc bấm nút <strong className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-semibold">Chép cú pháp</strong> tại khoản đó để tự động cập nhật mã QR và nội dung chuyển khoản tương ứng bên dưới.</span> */}
                </div>
              </div>
            </div>
          )}

          {/* Tuition Invoices Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Danh Sách Khoản Thu & Nợ</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {fees.length} khoản
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeFilter === 'ALL' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({fees.length})
                </button>
                <button
                  onClick={() => setActiveFilter('UNPAID')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeFilter === 'UNPAID' ? 'bg-white text-rose-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chưa xong ({fees.filter(f => f.status !== 'PAID').length})
                </button>
                <button
                  onClick={() => setActiveFilter('PAID')}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    activeFilter === 'PAID' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đã nộp ({fees.filter(f => f.status === 'PAID').length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
                <p className="text-sm">Đang tải dữ liệu học phí...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-rose-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="text-sm font-medium">{error}</p>
                <button
                  onClick={loadTuitionData}
                  className="mt-3 text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-100"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredFees.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
                <p className="text-base font-semibold text-slate-700">Không có khoản học phí nào</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Hiện tại không có khoản thu nào theo bộ lọc đã chọn. Hãy liên hệ văn phòng giáo viên nếu có câu hỏi.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                      <th className="py-3.5 px-4">Khoản thu / Lớp học</th>
                      <th className="py-3.5 px-4 text-right">Số tiền</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Đã nộp</th>
                      <th className="py-3.5 px-4 text-right">Còn lại</th>
                      <th className="py-3.5 px-4">Hạn nộp</th>
                      <th className="py-3.5 px-4 text-center">Trạng thái</th>
                      <th className="py-3.5 px-4 text-center">Cú pháp nộp</th>
                      <th className="py-3.5 px-4">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredFees.map((fee) => {
                      const isSelected = selectedFee?.id === fee.id;
                      const feeSyntax = `${cleanCode} - ${cleanName} - ${toUnaccentedUpper(fee.title)}`;
                      return (
                        <tr
                          key={fee.id}
                          onClick={() => setSelectedFeeId(fee.id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-300' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                              )}
                              <div className="font-semibold text-slate-900 whitespace-nowrap">{fee.title}</div>
                            </div>
                            {fee.class ? (
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                <span>{fee.class.name}</span>
                                {fee.class.teacher?.name && (
                                  <span className="text-slate-400">({fee.class.teacher.name})</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 mt-0.5">Khoản thu riêng cá nhân</div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-slate-900">
                            {formatVND(fee.amount)}
                          </td>
                          <td className="py-4 px-4 text-right font-medium text-emerald-600">
                            {formatVND(fee.paidAmount)}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-rose-600">
                            {formatVND(fee.remainingAmount)}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {fee.dueDate ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{new Date(fee.dueDate).toLocaleDateString('vi-VN')}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Không có</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {getStatusBadge(fee.status)}
                          </td>
                          <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {fee.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đã xong</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFeeId(fee.id);
                                  copyToClipboard(feeSyntax, `row-${fee.id}`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
                                title={`Sao chép: ${feeSyntax}`}
                              >
                                {copiedText === `row-${fee.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-bold">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Chép cú pháp</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 max-w-xs truncate">
                            {fee.note || (fee.paidAt ? `Đã thanh toán ngày ${new Date(fee.paidAt).toLocaleDateString('vi-VN')}` : '—')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bank Transfer Guide Card / Completion Message */}
          {fees.length > 0 && fees.every(f => f.status === 'PAID') ? (
            /* Khi tất cả học phí đã hoàn tất toàn bộ */
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-600/50 text-center">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Học Phí Đã Hoàn Tất Toàn Bộ</h4>
              <p className="text-sm text-emerald-100 max-w-lg mx-auto leading-relaxed">
                Xin chúc mừng! Toàn bộ các khoản học phí và lệ phí của bạn đều đã được thanh toán đầy đủ. Cảm ơn bạn đã luôn hoàn thành nghĩa vụ tài chính đúng hạn.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-xs text-emerald-200 border border-white/15">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Hồ sơ tài chính sinh viên ở trạng thái xuất sắc và không có công nợ tồn đọng.</span>
              </div>
            </div>
          ) : selectedFee?.status === 'PAID' ? (
            /* Khi học sinh đang bấm chọn vào một khoản đã hoàn tất */
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">Khoản Thu Đã Được Thanh Toán Hoàn Tất</h4>
                  <p className="text-xs text-emerald-300 font-medium">
                    {selectedFee.title} — Số tiền: {formatVND(selectedFee.amount)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-300">
                {selectedFee.paidAt
                  ? `Khoản thu này đã được xác nhận hoàn tất vào ngày ${new Date(selectedFee.paidAt).toLocaleDateString('vi-VN')}. `
                  : 'Khoản thu này đã hoàn tất thanh toán 100%. '}
                Bạn không cần thực hiện thêm bất kỳ giao dịch chuyển khoản nào cho khoản thu này.
              </p>
              {fees.some(f => f.status !== 'PAID') && (
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    Bạn vẫn còn khoản thu khác chưa hoàn tất:
                  </span>
                  <button
                    onClick={() => {
                      const firstUnpaid = fees.find(f => f.status !== 'PAID');
                      if (firstUnpaid) setSelectedFeeId(firstUnpaid.id);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center gap-1 w-fit"
                  >
                    <span>Chuyển sang khoản cần đóng</span>
                    <span>➔</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Hiện Thẻ Hướng Dẫn Chuyển Khoản Học Phí khi khoản đó chưa thanh toán */
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-base text-white">Hướng Dẫn Chuyển Khoản Học Phí</h4>
                </div>
                {fees.length > 0 && (
                  <div className="flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-slate-300">Khoản đang chọn:</span>
                    <select
                      value={selectedFee?.id || ''}
                      onChange={(e) => setSelectedFeeId(e.target.value)}
                      className="bg-slate-800 text-emerald-300 font-semibold outline-none rounded px-2 py-0.5 cursor-pointer border border-emerald-500/30"
                    >
                      {fees.map((f) => (
                        <option key={f.id} value={f.id} className="text-slate-900 bg-white">
                          {f.title} ({formatVND(f.remainingAmount > 0 ? f.remainingAmount : f.amount)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 block">Ngân hàng thụ hưởng</span>
                      <span className="font-semibold text-white">Vietcombank (Ngân hàng Ngoại thương Việt Nam)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 block">Số tài khoản</span>
                      <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">1029384756</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard('1029384756', 'account')}
                      className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                    >
                      {copiedText === 'account' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div>
                      <span className="text-xs text-slate-400 block">Chủ tài khoản</span>
                      <span className="font-semibold text-white">TRUNG TAM DTECH MANAGEMENT</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400">Nội dung chuyển khoản (Bắt buộc)</span>
                        {selectedFee && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 truncate max-w-[180px]">
                            {selectedFee.title}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-sm font-bold text-amber-300 break-all">{transferSyntax}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(transferSyntax, 'syntax')}
                      className="px-2.5 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-all border border-amber-400/30 shrink-0"
                    >
                      {copiedText === 'syntax' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code Demo / Instruction */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                  <div className="bg-white p-3 rounded-xl shadow-md mb-3">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=2|99|01029384756|${encodeURIComponent(studentName)}||0|0|${encodeURIComponent(transferSyntax)}`}
                      alt="VietQR Chuyển khoản"
                      className="w-36 h-36 object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-300 font-medium">Quét mã QR qua ứng dụng ngân hàng</p>
                  {selectedFee && (
                    <p className="text-xs text-emerald-400 font-bold mt-1">
                      Cần nộp: {formatVND(selectedFee.remainingAmount > 0 ? selectedFee.remainingAmount : selectedFee.amount)}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Hệ thống sẽ tự động đối soát và cập nhật trạng thái học phí khi nhận được khoản thanh toán.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
