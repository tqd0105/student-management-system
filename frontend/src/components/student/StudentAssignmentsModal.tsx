/**
 * StudentAssignmentsModal — Student View
 * Quản lý bài tập & nộp bài dạng Link (Google Drive, GitHub, Docs, Figma...)
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '@/services/ApiService';
import {
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Send,
  Link2,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Edit3,
  Calendar,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';

export interface StudentAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  attachmentUrl?: string | null;
  material?: {
    id: string;
    title: string;
    url: string;
    type: string;
  } | null;
  classId: string;
  className: string;
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  status: AssignmentStatus;
  isSubmitted: boolean;
  isGraded: boolean;
  isOverdue: boolean;
  submission: {
    url: string | null;
    notes: string | null;
    submittedAt: string | null;
  };
  grade: {
    score: number | null;
    feedback: string | null;
    gradedAt: string | null;
  };
}

interface AssignmentsSummary {
  total: number;
  pendingCount: number;
  submittedCount: number;
  gradedCount: number;
  overdueCount: number;
}

interface StudentAssignmentsModalProps {
  initialClassId?: string;
  onClose: () => void;
}

export default function StudentAssignmentsModal({ initialClassId, onClose }: StudentAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [summary, setSummary] = useState<AssignmentsSummary>({
    total: 0,
    pendingCount: 0,
    submittedCount: 0,
    gradedCount: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedDescId, setExpandedDescId] = useState<string | null>(null);

  // Submission Form Modal state
  const [activeSubmission, setActiveSubmission] = useState<StudentAssignment | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchAssignments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getStudentAssignments({
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
      });

      if (res && res.success && Array.isArray(res.data)) {
        setAssignments(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        setLastRefreshedAt(new Date());
      } else {
        if (!isSilent) setError(res?.message || 'Không thể tải danh sách bài tập.');
      }
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
      if (!isSilent) setError(err?.message || 'Lỗi kết nối tới máy chủ.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Tự động đồng bộ khi quay lại tab trình duyệt hoặc có sự kiện cập nhật bài tập
  useEffect(() => {
    const handleSync = () => {
      fetchAssignments(true);
    };
    const handleFocus = () => {
      fetchAssignments(true);
    };

    window.addEventListener('sms:refresh-assignments', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('sms:refresh-assignments', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAssignments]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAssignments(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Unique classes from assignments for the class filter
  const classOptions = Array.from(
    new Map(assignments.map((a) => [a.classId, { id: a.classId, name: a.className }])).values()
  );

  // Format countdown & due date
  const formatDueDate = (dueDateStr: string | null) => {
    if (!dueDateStr) return { text: 'Không giới hạn hạn nộp', isUrgent: false, isOverdue: false };
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const formattedTime = due.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    if (diffMs < 0) {
      const absDays = Math.abs(diffDays);
      return {
        text: `Đã hết hạn (${absDays === 0 ? 'Hôm nay' : `${absDays} ngày trước`} - ${formattedTime})`,
        isUrgent: false,
        isOverdue: true,
      };
    }

    if (diffHours <= 24) {
      return {
        text: `Hạn nộp: Còn ${diffHours} giờ (${formattedTime})`,
        isUrgent: true,
        isOverdue: false,
      };
    }

    return {
      text: `Hạn nộp: Còn ${diffDays} ngày (${formattedTime})`,
      isUrgent: diffDays <= 2,
      isOverdue: false,
    };
  };

  // Open submission dialog
  const openSubmitDialog = (item: StudentAssignment) => {
    setActiveSubmission(item);
    setSubmissionUrl(item.submission.url || '');
    setSubmissionNotes(item.submission.notes || '');
    setSubmitError('');
    setSubmitSuccess('');
  };

  // Handle submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;

    if (!submissionUrl.trim()) {
      setSubmitError('Vui lòng nhập đường link bài làm của bạn.');
      return;
    }

    // Basic URL check
    if (!/^https?:\/\//i.test(submissionUrl.trim())) {
      setSubmitError('Đường link cần bắt đầu bằng http:// hoặc https://');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      const res = await ApiService.submitAssignment(activeSubmission.id, {
        submissionUrl: submissionUrl.trim(),
        submissionNotes: submissionNotes.trim() || undefined,
      });

      if (res && res.success) {
        setSubmitSuccess('Nộp bài thành công!');
        await fetchAssignments(true);
        // Thông báo đồng bộ dữ liệu toàn hệ thống
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-assignments'));
        }
        setTimeout(() => {
          setActiveSubmission(null);
          setSubmitSuccess('');
        }, 1200);
      } else {
        setSubmitError(res?.message || 'Không thể nộp bài tập.');
      }
    } catch (err: any) {
      console.error('Error submitting:', err);
      setSubmitError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = assignments.filter((item) => {
    const matchClass = selectedClassId === 'ALL' || item.classId === selectedClassId;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.className.toLowerCase().includes(q) ||
      item.teacher.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q));

    return matchClass && matchStatus && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate__animated animate__zoomIn animate__faster">
        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate flex items-center gap-2">
                <span>Bài Tập & Hạn Nộp</span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {summary.total} bài tập
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                Quản lý tiến độ bài tập về nhà, đồ án và nộp sản phẩm học tập
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title={`Bấm để tải lại dữ liệu mới nhất (Cập nhật lúc ${lastRefreshedAt.toLocaleTimeString('vi-VN')})`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer shrink-0"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Quick Stats Row ────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <button
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-700">⏳ Cần nộp</span>
              <span className="text-base font-bold text-amber-900">{summary.pendingCount}</span>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'overdue'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-rose-700">🚨 Quá hạn</span>
              <span className="text-base font-bold text-rose-900">{summary.overdueCount}</span>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'submitted' ? 'all' : 'submitted')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/20'
                : 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-blue-700">📤 Đã nộp</span>
              <span className="text-base font-bold text-blue-900">{summary.submittedCount}</span>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'graded' ? 'all' : 'graded')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              statusFilter === 'graded'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
                : 'bg-gray-50/60 border-gray-200/80 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-700">✅ Đã chấm</span>
              <span className="text-base font-bold text-emerald-900">{summary.gradedCount}</span>
            </div>
          </button>
        </div>

        {/* ── Toolbar: Class Filter + Search ────────────────────────────── */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên bài tập, môn học, giảng viên..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/60"
            />
          </div>

          {classOptions.length > 1 && (
            <div className="sm:w-56">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 bg-gray-50/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ALL">Tất cả lớp học ({classOptions.length})</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 border border-dashed border-gray-300 transition-colors cursor-pointer"
            >
              Bỏ lọc
            </button>
          )}
        </div>

        {/* ── Content: Assignments List ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium text-gray-500">Đang tải danh sách bài tập...</span>
            </div>
          ) : error ? (
            <div className="text-center py-14 px-4 max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-semibold text-gray-800">{error}</p>
              <button
                onClick={() => fetchAssignments()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Thử lại</span>
              </button>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <FileText className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">
                {search || statusFilter !== 'all'
                  ? 'Không tìm thấy bài tập phù hợp'
                  : 'Hiện tại chưa có bài tập nào'}
              </p>
              <p className="text-xs text-gray-400">
                {search || statusFilter !== 'all'
                  ? 'Thử thay đổi từ khóa hoặc bộ lọc trạng thái'
                  : 'Giảng viên chưa tạo bài tập nào cho các lớp của bạn.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredAssignments.map((item) => {
                const dueInfo = formatDueDate(item.dueDate);
                const isExpanded = expandedDescId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col gap-3"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {item.className}
                        </span>
                        <span className="text-xs text-gray-500">GV: {item.teacher.name}</span>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {item.status === 'graded' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã chấm: {item.grade.score}đ</span>
                          </span>
                        ) : item.status === 'submitted' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Đã nộp · Chờ chấm</span>
                          </span>
                        ) : item.status === 'overdue' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Quá hạn</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Chưa nộp</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="text-base font-bold text-gray-900 leading-snug">{item.title}</h4>

                      {item.description && (
                        <div className="mt-1.5">
                          <p
                            className={`text-xs text-gray-600 leading-relaxed ${
                              isExpanded ? '' : 'line-clamp-2'
                            }`}
                          >
                            {item.description}
                          </p>
                          {item.description.length > 120 && (
                            <button
                              onClick={() => setExpandedDescId(isExpanded ? null : item.id)}
                              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 mt-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Thu gọn' : 'Xem thêm yêu cầu'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Due Date & Material Links */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span
                          className={`font-medium ${
                            dueInfo.isOverdue
                              ? 'text-rose-600 font-semibold'
                              : dueInfo.isUrgent
                              ? 'text-amber-600 font-semibold'
                              : 'text-gray-500'
                          }`}
                        >
                          {dueInfo.text}
                        </span>
                      </div>

                      {(item.material || item.attachmentUrl) && (
                        <a
                          href={item.material?.url || item.attachmentUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors shadow-2xs group"
                          title="Mở tài liệu / đề bài đính kèm cho bài tập này"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                          <span>Tài liệu / Đề bài: <strong className="font-bold underline">{item.material?.title || 'Xem tài liệu'}</strong></span>
                          <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                        </a>
                      )}
                    </div>

                    {/* Submitted Work Preview Box (if submitted) */}
                    {item.isSubmitted && item.submission.url && (
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Link2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-semibold text-gray-700">Bài làm đã nộp:</span>
                            <a
                              href={item.submission.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline font-mono truncate max-w-xs cursor-pointer"
                            >
                              {item.submission.url}
                            </a>
                          </div>
                          <a
                            href={item.submission.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-indigo-600 p-1 cursor-pointer shrink-0"
                            title="Mở link bài làm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {item.submission.notes && (
                          <p className="text-[11px] text-gray-500 italic pl-5">
                            Ghi chú: {item.submission.notes}
                          </p>
                        )}
                        {item.submission.submittedAt && (
                          <p className="text-[10px] text-gray-400 pl-5">
                            Nộp lúc: {new Date(item.submission.submittedAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Teacher Feedback (if graded) */}
                    {item.isGraded && item.grade.feedback && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Nhận xét của giảng viên ({item.grade.score}đ):</span>
                        </div>
                        <p className="text-emerald-900 pl-5 leading-relaxed">{item.grade.feedback}</p>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-gray-400">
                        {item.isGraded
                          ? 'Bài tập đã được chấm điểm'
                          : item.isSubmitted
                          ? 'Bạn có thể cập nhật lại bài nộp trước khi giảng viên chấm'
                          : 'Hãy nộp link bài làm đúng hạn'}
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        {!item.isGraded ? (
                          <button
                            onClick={() => openSubmitDialog(item)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                              item.isSubmitted
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                            }`}
                          >
                            {item.isSubmitted ? (
                              <>
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa bài nộp</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Nộp bài ngay</span>
                              </>
                            )}
                          </button>
                        ) : (
                          item.submission.url && (
                            <a
                              href={item.submission.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Xem lại bài làm</span>
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Hiển thị {filteredAssignments.length} / {summary.total} bài tập
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* ── Submission Dialog ───────────────────────────────────────────── */}
      {activeSubmission && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {activeSubmission.isSubmitted ? 'Cập Nhật Bài Nộp' : 'Nộp Bài Tập'}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                  {activeSubmission.title} · <span className="font-semibold text-indigo-600">{activeSubmission.className}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveSubmission(null)}
                className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Submission URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Đường dẫn bài làm (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc github.com/..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50"
                  required
                />
              </div>

              {/* Helper Notice for Cloud Links */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-semibold">Lưu ý quyền truy cập:</p>
                  <p className="text-indigo-700 mt-0.5">
                    Đối với Google Drive, hãy chọn <b>Chia sẻ → Bất kỳ ai có đường liên kết đều có thể xem</b> để giảng viên có thể chấm bài của bạn.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú cho giảng viên (không bắt buộc)
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Nhắn nhủ thêm cho giảng viên (ví dụ: tài khoản demo, link figma frame 2...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/50 resize-none"
                />
              </div>

              {/* Status messages */}
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubmission(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{activeSubmission.isSubmitted ? 'Cập nhật bài nộp' : 'Xác nhận nộp bài'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
