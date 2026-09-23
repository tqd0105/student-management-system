'use client';

import React, { useState, useEffect } from 'react';
import ApiService from '@/services/ApiService';
import { 
  CreditCard, Search, Filter, Plus, Edit3, Trash2, X, Check, 
  Download, AlertCircle, CheckCircle2, Clock, DollarSign, 
  Calendar, User, BookOpen, ArrowUpRight, Wallet
} from 'lucide-react';

interface TuitionFee {
  id: string;
  studentId: string;
  classId: string | null;
  title: string;
  amount: number;
  paidAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
  remainingAmount?: number;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    studentProfile?: {
      studentCode?: string | null;
      phone?: string | null;
    } | null;
  };
  class: {
    id: string;
    name: string;
  } | null;
}

interface TuitionStats {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  completionRate: number;
  totalInvoices: number;
  paidCount: number;
  unpaidCount: number;
  partialCount: number;
  overdueCount: number;
}

interface ClassItem {
  id: string;
  name: string;
}

interface TuitionManagementModalProps {
  onClose: () => void;
  classes: ClassItem[];
}

export default function TuitionManagementModal({ onClose, classes }: TuitionManagementModalProps) {
  const [fees, setFees] = useState<TuitionFee[]>([]);
  const [stats, setStats] = useState<TuitionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Danh sách tất cả học sinh để chọn khi tạo khoản thu
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  // Modal: Tạo khoản thu mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    studentId: '',
    classId: '',
    title: '',
    amount: '',
    dueDate: '',
    note: '',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal: Ghi nhận thanh toán / Thu tiền
  const [paymentFee, setPaymentFee] = useState<TuitionFee | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'BANK_TRANSFER',
    paidAt: new Date().toISOString().slice(0, 10),
    note: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal: Chỉnh sửa khoản thu
  const [editingFee, setEditingFee] = useState<TuitionFee | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    dueDate: '',
    note: '',
    classId: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, [selectedClassId, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feesRes, statsRes] = await Promise.all([
        ApiService.getTuitionFees({
          classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: search || undefined,
        }),
        ApiService.getTuitionStats(selectedClassId !== 'ALL' ? selectedClassId : undefined),
      ]);

      if (feesRes.success) setFees(feesRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu học phí:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await ApiService.getManagedStudents();
      if (res.success) setAvailableStudents(res.data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách học sinh:', err);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      studentId: availableStudents.length > 0 ? availableStudents[0].id : '',
      classId: selectedClassId !== 'ALL' ? selectedClassId : '',
      title: '',
      amount: '',
      dueDate: '',
      note: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateFee = async () => {
    if (!createForm.studentId) {
      alert('Vui lòng chọn học sinh.');
      return;
    }
    if (!createForm.title.trim()) {
      alert('Vui lòng nhập tên khoản thu.');
      return;
    }
    const numAmount = Number(createForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Số tiền học phí phải lớn hơn 0.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await ApiService.createTuitionFee({
        studentId: createForm.studentId,
        classId: createForm.classId || undefined,
        title: createForm.title.trim(),
        amount: numAmount,
        dueDate: createForm.dueDate || undefined,
        note: createForm.note.trim() || undefined,
      });

      if (res.success) {
        alert('Tạo khoản thu học phí thành công!');
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể tạo khoản thu'}`);
      }
    } catch (err) {
      console.error('Lỗi tạo khoản thu:', err);
      alert('Lỗi kết nối khi tạo khoản thu');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleOpenPayment = (fee: TuitionFee) => {
    setPaymentFee(fee);
    const rem = Math.max(0, fee.amount - fee.paidAmount);
    setPaymentForm({
      amountPaid: rem.toString(),
      paymentMethod: 'BANK_TRANSFER',
      paidAt: new Date().toISOString().slice(0, 10),
      note: '',
    });
  };

  const handleRecordPayment = async () => {
    if (!paymentFee) return;
    const payNum = Number(paymentForm.amountPaid);
    if (isNaN(payNum) || payNum <= 0) {
      alert('Vui lòng nhập số tiền thanh toán hợp lệ (lớn hơn 0).');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await ApiService.recordTuitionPayment(paymentFee.id, {
        amountPaid: payNum,
        paymentMethod: paymentForm.paymentMethod,
        paidAt: paymentForm.paidAt,
        note: paymentForm.note.trim() || undefined,
      });

      if (res.success) {
        alert('Đã ghi nhận thanh toán thành công!');
        setPaymentFee(null);
        fetchData();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể ghi nhận'}`);
      }
    } catch (err) {
      console.error('Lỗi ghi nhận thanh toán:', err);
      alert('Lỗi kết nối khi ghi nhận thanh toán');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOpenEdit = (fee: TuitionFee) => {
    setEditingFee(fee);
    setEditForm({
      title: fee.title,
      amount: fee.amount.toString(),
      dueDate: fee.dueDate ? fee.dueDate.slice(0, 10) : '',
      note: fee.note || '',
      classId: fee.classId || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFee) return;
    const numAmount = Number(editForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Số tiền học phí phải lớn hơn 0.');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await ApiService.updateTuitionFee(editingFee.id, {
        title: editForm.title.trim(),
        amount: numAmount,
        dueDate: editForm.dueDate || undefined,
        note: editForm.note.trim() || undefined,
        classId: editForm.classId || undefined,
      });

      if (res.success) {
        alert('Cập nhật khoản thu thành công!');
        setEditingFee(null);
        fetchData();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể cập nhật'}`);
      }
    } catch (err) {
      console.error('Lỗi sửa khoản thu:', err);
      alert('Lỗi kết nối khi cập nhật khoản thu');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteFee = async (feeId: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa khoản thu "${title}" này? Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await ApiService.deleteTuitionFee(feeId);
      if (res.success) {
        fetchData();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể xóa'}`);
      }
    } catch (err) {
      console.error('Lỗi xóa khoản thu:', err);
      alert('Lỗi kết nối khi xóa khoản thu');
    }
  };

  // Xuất file CSV báo cáo học phí
  const exportToCSV = () => {
    if (fees.length === 0) {
      alert('Không có dữ liệu học phí để xuất.');
      return;
    }

    const headers = ['STT', 'MSSV', 'Họ và tên', 'Email', 'Khoản thu', 'Lớp học', 'Số tiền (VNĐ)', 'Đã nộp (VNĐ)', 'Còn nợ (VNĐ)', 'Trạng thái', 'Hạn nộp', 'Ngày nộp', 'Hình thức', 'Ghi chú'];
    const rows = filteredFees.map((f, idx) => {
      const mssv = f.student.studentProfile?.studentCode || '—';
      const className = f.class?.name || 'Chung';
      const rem = Math.max(0, f.amount - f.paidAmount);
      const statusText = 
        f.status === 'PAID' ? 'Đã đóng đủ' : 
        f.status === 'PARTIAL' ? 'Đóng một phần' : 
        f.status === 'OVERDUE' ? 'Quá hạn' : 'Chưa đóng';

      return [
        idx + 1,
        `"${mssv}"`,
        `"${f.student.name}"`,
        `"${f.student.email}"`,
        `"${f.title.replace(/"/g, '""')}"`,
        `"${className}"`,
        f.amount,
        f.paidAmount,
        rem,
        `"${statusText}"`,
        f.dueDate ? f.dueDate.slice(0, 10) : '',
        f.paidAt ? f.paidAt.slice(0, 10) : '',
        `"${f.paymentMethod || ''}"`,
        `"${(f.note || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_hoc_phi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lọc cục bộ theo từ khóa
  const filteredFees = fees.filter(f => {
    const q = search.toLowerCase();
    const studentName = f.student.name.toLowerCase();
    const studentEmail = f.student.email.toLowerCase();
    const mssv = (f.student.studentProfile?.studentCode || '').toLowerCase();
    const title = f.title.toLowerCase();

    return studentName.includes(q) || studentEmail.includes(q) || mssv.includes(q) || title.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 size={12} /> Đã đóng đủ
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
            <Clock size={12} /> Đóng 1 phần
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs animate-pulse">
            <AlertCircle size={12} /> Quá hạn
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 shadow-2xs">
            <Clock size={12} /> Chưa đóng
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate__animated animate__zoomIn animate__faster">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-amber-600 via-indigo-700 to-indigo-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Wallet size={22} className="text-white" />
            </div> */}
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight"> Quản Lý Học Phí & Công Nợ</h2>
              <p className="text-xs text-amber-100 font-medium">Theo dõi các khoản thu học phí, ghi nhận thanh toán và báo cáo công nợ</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>

        {/* 4 KPI Summary Cards */}
        {stats && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Tổng học phí</span>
                <DollarSign size={16} className="text-indigo-500" />
              </div>
              <p className="text-base sm:text-lg font-extrabold text-gray-900">{formatVND(stats.totalAmount)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{stats.totalInvoices} phiếu khoản thu</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Đã thu về</span>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
              <p className="text-base sm:text-lg font-extrabold text-emerald-600">{formatVND(stats.paidAmount)}</p>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">{stats.paidCount} phiếu đã đóng đủ</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Còn nợ / Chưa nộp</span>
                <AlertCircle size={16} className="text-rose-500" />
              </div>
              <p className="text-base sm:text-lg font-extrabold text-rose-600">{formatVND(stats.remainingAmount)}</p>
              <p className="text-[11px] text-rose-600/80 font-medium mt-0.5">{stats.unpaidCount} chưa nộp • {stats.partialCount} nộp 1 phần</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between text-gray-500 mb-1">
                <span className="text-xs font-semibold">Tỷ lệ hoàn thành</span>
                <span className="text-xs font-bold text-indigo-600">{stats.completionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.completionRate)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                {stats.overdueCount > 0 ? (
                  <span className="text-rose-600 font-bold">⚠️ Có {stats.overdueCount} khoản quá hạn</span>
                ) : (
                  <span className="text-emerald-600">Không có khoản quá hạn</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Toolbar: Filters & Actions */}
        <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start gap-2.5 flex-wrap flex-1 min-w-[250px]">
            {/* Search Input */}
            <div className="relative min-w-[100px] max-w-sm flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên học sinh, email, MSSV, khoản thu..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
              />
            </div>

            {/* Class Filter */}
            <div className='flex gap-2'>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 border border-gray-300 rounded-xl text-xs">
              <BookOpen size={14} className="text-gray-500" />
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
              >
                <option value="ALL">Tất cả các lớp</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 border border-gray-300 rounded-xl text-xs">
              <Filter size={14} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent outline-none font-semibold text-gray-700 cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PAID">Đã đóng đủ</option>
                <option value="PARTIAL">Đóng một phần</option>
                <option value="UNPAID">Chưa đóng</option>
                <option value="OVERDUE">Quá hạn nộp</option>
              </select>
            </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row sm:flex-col md:flex-row items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
              title="Xuất file CSV báo cáo học phí"
            >
              <Download size={14} />
              <span>Xuất CSV</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span> Tạo Khoản Thu </span>
            </button>
          </div>
        </div>

        {/* Tuition Fees Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-xs">Đang tải danh sách học phí...</p>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard size={48} className="mx-auto mb-2 text-gray-300" />
              <p className="font-bold text-gray-600">Chưa có khoản thu học phí nào</p>
              <p className="text-xs text-gray-400 mt-1">Bấm "+ Tạo Khoản Thu / Ghi Nợ" để tạo phiếu thu học phí cho học sinh.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-600 uppercase bg-gray-100/80 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Học Sinh</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Khoản Thu</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Lớp</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-right">Số Tiền</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-right">Đã Nộp</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-right">Còn Nợ</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap">Hạn Nộp</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="px-4 py-3 font-bold whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFees.map((f) => {
                  const mssv = f.student.studentProfile?.studentCode || '—';
                  const rem = Math.max(0, f.amount - f.paidAmount);

                  return (
                    <tr key={f.id} className="hover:bg-indigo-50/20 transition-colors">
                      {/* Student info */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                            {mssv}
                          </span>
                          <div>
                            <p className="font-bold text-gray-800 text-xs sm:text-sm">{f.student.name}</p>
                            <p className="text-[11px] text-gray-400">{f.student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Title & Note */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800 text-xs sm:text-sm whitespace-nowrap">{f.title}</p>
                        {f.note && <p className="text-[11px] text-gray-400 italic truncate max-w-xs">{f.note}</p>}
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {f.class ? (
                          <span className="px-2 py-0.5 bg-gray-100 rounded font-medium border border-gray-200">
                            {f.class.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Chung</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap">
                        {formatVND(f.amount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatVND(f.paidAmount)}
                      </td>

                      {/* Remaining Amount */}
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                        <span className={rem > 0 ? 'text-rose-600' : 'text-gray-400'}>
                          {formatVND(rem)}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {f.dueDate ? (
                          <span className={f.status === 'OVERDUE' ? 'text-rose-600 font-bold' : 'text-gray-600'}>
                            {new Date(f.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(f.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {f.status !== 'PAID' && (
                            <button
                              onClick={() => handleOpenPayment(f)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Ghi nhận nộp tiền"
                            >
                              <CreditCard size={13} />
                              <span>Thu tiền</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(f)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa khoản thu"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteFee(f.id, f.title)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            title="Xóa khoản thu"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: TẠO KHOẢN THU / GHI NỢ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base">Tạo Khoản Thu / Ghi Nợ Học Sinh</h3>
                <p className="text-xs text-blue-100">Tạo phiếu học phí hoặc ghi nợ riêng lẻ cho từng học sinh</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Chọn học sinh */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Chọn Học Sinh *</label>
                <select
                  value={createForm.studentId}
                  onChange={e => setCreateForm({ ...createForm, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white font-medium"
                >
                  <option value="">-- Chọn học sinh nhận khoản thu --</option>
                  {availableStudents.map(s => {
                    const code = s.profile?.studentCode ? `[${s.profile.studentCode}] ` : '';
                    return (
                      <option key={s.id} value={s.id}>
                        {code}{s.name} ({s.email})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Gắn với lớp học */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lớp học liên quan (Tùy chọn)</label>
                <select
                  value={createForm.classId}
                  onChange={e => setCreateForm({ ...createForm, classId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                >
                  <option value="">-- Khoản thu chung / Không thuộc lớp cụ thể --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Tên khoản thu & Quick suggestion chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tên khoản thu / Nội dung nộp *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium"
                  placeholder="VD: Học phí Tháng 9/2026, Tiền nợ giáo trình..."
                />
                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    `Học phí Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
                    'Học phí Khóa học',
                    'Khoản nợ học phí đợt 1',
                    'Tiền tài liệu & giáo trình'
                  ].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, title: chip })}
                      className="px-2 py-0.5 rounded text-[11px] bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 text-gray-600 border border-gray-200 transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số tiền & Hạn nộp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="10000"
                    value={createForm.amount}
                    onChange={e => setCreateForm({ ...createForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold text-gray-900"
                    placeholder="VD: 1500000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hạn nộp</label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={createForm.note}
                  onChange={e => setCreateForm({ ...createForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
                  placeholder="Ghi chú về hình thức thanh toán hoặc hoàn cảnh giảm trừ học phí..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateFee}
                disabled={isSubmittingCreate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSubmittingCreate ? 'Đang tạo...' : 'Tạo Khoản Thu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GHI NHẬN THANH TOÁN / THU HỌC PHÍ */}
      {paymentFee && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base">Ghi Nhận Thu Học Phí</h3>
                <p className="text-xs text-emerald-100">Học sinh: {paymentFee.student.name}</p>
              </div>
              <button 
                onClick={() => setPaymentFee(null)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Thông tin khoản thu hiện tại */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 space-y-1.5 text-xs text-gray-700">
                <p className="font-bold text-sm text-emerald-900">{paymentFee.title}</p>
                <div className="flex justify-between">
                  <span>Tổng số tiền:</span>
                  <span className="font-bold">{formatVND(paymentFee.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Đã nộp trước đó:</span>
                  <span className="font-bold text-emerald-600">{formatVND(paymentFee.paidAmount)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200 text-sm font-extrabold text-rose-600">
                  <span>Số tiền còn nợ:</span>
                  <span>{formatVND(Math.max(0, paymentFee.amount - paymentFee.paidAmount))}</span>
                </div>
              </div>

              {/* Số tiền nộp lần này */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Số tiền nộp lần này (VNĐ) *</label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={paymentForm.amountPaid}
                  onChange={e => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-base font-extrabold text-emerald-700 bg-white"
                  placeholder="Nhập số tiền..."
                />
              </div>

              {/* Phương thức thanh toán & Ngày nộp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phương thức</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="CASH">Tiền mặt</option>
                    <option value="MOMO">Ví MoMo</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày nộp</label>
                  <input
                    type="date"
                    value={paymentForm.paidAt}
                    onChange={e => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>
              </div>

              {/* Ghi chú thanh toán */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú thanh toán</label>
                <input
                  type="text"
                  value={paymentForm.note}
                  onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  placeholder="VD: Mẹ chuyển khoản, nộp tại quầy..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setPaymentFee(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSubmittingPayment ? 'Đang ghi nhận...' : 'Xác Nhận Thu Tiền'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA KHOẢN THU */}
      {editingFee && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-gray-800">Sửa Khoản Thu Học Phí</h3>
                <p className="text-xs text-gray-500">Học sinh: {editingFee.student.name}</p>
              </div>
              <button 
                onClick={() => setEditingFee(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tên khoản thu *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số tiền (VNĐ) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="10000"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Hạn nộp</label>
                  <input
                    type="date"
                    value={editForm.dueDate}
                    onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={editForm.note}
                  onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingFee(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSubmittingEdit ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
