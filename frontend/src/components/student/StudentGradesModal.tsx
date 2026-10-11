/**
 * StudentGradesModal — Student View
 * Bảng Điểm & Báo Cáo Học Lực Học Thuật (Academic Transcript / Gradebook)
 * Student Management System - DTECH TEAM
 * 
 * Nâng cấp in ấn chuyên nghiệp:
 * - Hỗ trợ in khổ ngang A4 Landscape chuyên dụng (@page { size: A4 landscape; margin: 8mm 10mm; }).
 * - Khắc phục triệt để lỗi in 2 trang trùng nhau bằng cách tách biệt Screen Modal và Print Document.
 * - Ẩn hoàn toàn giao diện nền và popup fixed khi in, chỉ in bản học thuật phẳng chuẩn thể thức.
 */

'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ApiService from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Award,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Printer,
  TrendingUp,
  FileCheck,
  MessageSquare,
  Loader2,
  Sparkles,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface AssignmentGrade {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  score: number | null;
  feedback: string | null;
  gradedAt: string | null;
  submissionUrl?: string | null;
  submissionNotes?: string | null;
  submittedAt?: string | null;
}

interface ClassGrades {
  classId: string;
  className: string;
  teacherName: string;
  teacherEmail: string;
  totalAssignments: number;
  gradedCount: number;
  averageScore: number | null;
  assignments: AssignmentGrade[];
}

interface StudentGradesModalProps {
  onClose: () => void;
}

export default function StudentGradesModal({ onClose }: StudentGradesModalProps) {
  const { user } = useAuth();
  const [gradesData, setGradesData] = useState<ClassGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  const fetchGrades = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await ApiService.getStudentGrades();
      if (res && res.success && Array.isArray(res.data)) {
        setGradesData(res.data);
      } else {
        if (!isSilent) setError(res?.message || 'Không thể tải bảng điểm.');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải bảng điểm:', err);
      if (!isSilent) setError(err?.message || 'Lỗi kết nối tới máy chủ.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  // Tự động đồng bộ khi quay lại tab trình duyệt — throttle 30 giây
  useEffect(() => {
    let lastFocusFetch = 0;
    const THROTTLE_MS = 30_000;

    const handleSync = () => {
      fetchGrades(true);
    };
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusFetch >= THROTTLE_MS) {
        lastFocusFetch = now;
        fetchGrades(true);
      }
    };

    window.addEventListener('sms:refresh-grades', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('sms:refresh-grades', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchGrades(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Tính GPA tích lũy trên tất cả các bài tập đã có điểm
  const allGradedScores = gradesData.flatMap((c) =>
    c.assignments.filter((a) => a.score !== null && a.score !== undefined).map((a) => a.score as number)
  );

  const overallAvg =
    allGradedScores.length > 0
      ? parseFloat((allGradedScores.reduce((acc, s) => acc + s, 0) / allGradedScores.length).toFixed(2))
      : null;

  // Quy đổi điểm GPA thang 4.0
  const gpa4Scale =
    overallAvg !== null
      ? (overallAvg * 0.4).toFixed(2)
      : null;

  // Xếp loại học lực học thuật
  const getAcademicRank = (avg: number | null) => {
    if (avg === null) return { text: 'Chưa có xếp loại', pill: 'bg-gray-100 text-gray-600 border-gray-200' };
    if (avg >= 9.0) return { text: 'Xuất sắc', pill: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' };
    if (avg >= 8.0) return { text: 'Giỏi', pill: 'bg-blue-50 text-blue-700 border-blue-300 font-bold' };
    if (avg >= 6.5) return { text: 'Khá', pill: 'bg-indigo-50 text-indigo-700 border-indigo-300 font-semibold' };
    if (avg >= 5.0) return { text: 'Trung bình', pill: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold' };
    return { text: 'Cần cố gắng', pill: 'bg-rose-50 text-rose-700 border-rose-300 font-semibold' };
  };

  const rankInfo = getAcademicRank(overallAvg);

  const totalAssignmentsCount = gradesData.reduce((acc, c) => acc + c.totalAssignments, 0);
  const totalGradedCount = allGradedScores.length;

  const getScoreBadge = (score: number | null) => {
    if (score === null || score === undefined) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-400">
          Chưa chấm
        </span>
      );
    }

    if (score >= 8.5) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
          {score.toFixed(1)} / 10 · Giỏi
        </span>
      );
    }
    if (score >= 7.0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs">
          {score.toFixed(1)} / 10 · Khá
        </span>
      );
    }
    if (score >= 5.0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs">
          {score.toFixed(1)} / 10 · Đạt
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs">
        {score.toFixed(1)} / 10 · Cần thi lại
      </span>
    );
  };

  const filteredData =
    selectedClassId === 'ALL'
      ? gradesData
      : gradesData.filter((c) => c.classId === selectedClassId);

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div id="student-grades-portal-root">
      {/* ── CSS PRINT RULES (ĐẢM BẢO KHỔ NGANG LANDSCAPE VÀ KHÔNG IN TRÙNG 2 TRANG) ── */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          /* Ẩn tất cả phần tử bên ngoài Modal Portal trong document.body */
          body > *:not(#student-grades-portal-root) {
            display: none !important;
          }
          #student-grades-portal-root {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Ẩn giao diện tương tác Screen Modal khi in */
          #student-grades-screen-view {
            display: none !important;
          }
          /* Hiển thị văn bản in ấn chuẩn học thuật phẳng */
          #student-grades-print-doc {
            display: block !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            page-break-after: avoid;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #d1d5db !important;
          }
        }
      `}</style>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. GIAO DIỆN TƯƠNG TÁC MÀN HÌNH (SCREEN VIEW)                             */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div
        id="student-grades-screen-view"
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center print:hidden"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal Container */}
        <div className="relative z-10 w-full sm:max-w-5xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col h-[95dvh] sm:h-auto sm:max-h-[92vh] animate__animated animate__zoomIn animate__faster">
          {/* ── Top Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/80 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 shrink-0 shadow-2xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate flex items-center gap-2">
                  <span>Bảng Điểm Học Vụ & Thành Tích</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] border ${rankInfo.pill}`}>
                    {rankInfo.text}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Báo cáo học tập chính thức, điểm số và nhận xét từ giảng viên
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
                title="Tải lại bảng điểm mới nhất"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="In bảng điểm khổ ngang A4 (Landscape)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In bảng điểm (Khổ ngang A4)</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ── Academic Summary Cards ────────────────────────────────────── */}
          {!loading && !error && gradesData.length > 0 && (
            <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-white grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              {/* GPA Thang 10 */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Điểm TB (Hệ 10)</span>
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xl font-extrabold text-amber-900 mt-1">
                  {overallAvg !== null ? `${overallAvg} / 10` : '—'}
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">Quy đổi thang 4: {gpa4Scale || '—'}</p>
              </div>

              {/* Xếp Loại */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border border-blue-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800">Xếp loại học lực</span>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-xl font-extrabold text-blue-900 mt-1">{rankInfo.text}</p>
                <p className="text-[10px] text-blue-700 mt-0.5">Dựa trên các bài đã có điểm</p>
              </div>

              {/* Tỷ Lệ Đã Chấm */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Bài đã đánh giá</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl font-extrabold text-emerald-900 mt-1">
                  {totalGradedCount} / {totalAssignmentsCount}
                </p>
                <p className="text-[10px] text-emerald-700 mt-0.5">
                  {totalAssignmentsCount > 0
                    ? `Đạt ${Math.round((totalGradedCount / totalAssignmentsCount) * 100)}% tiến độ`
                    : 'Chưa có bài tập'}
                </p>
              </div>

              {/* Số Lớp Học */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-800">Lớp học phần</span>
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-extrabold text-purple-900 mt-1">{gradesData.length} môn</p>
                <p className="text-[10px] text-purple-700 mt-0.5">Đang theo học kỳ này</p>
              </div>
            </div>
          )}

          {/* ── Class Filter Tabs ─────────────────────────────────────────── */}
          {gradesData.length > 1 && (
            <div className="px-6 pt-3 pb-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setSelectedClassId('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedClassId === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                Tất cả các môn ({gradesData.length})
              </button>
              {gradesData.map((c) => (
                <button
                  key={c.classId}
                  onClick={() => setSelectedClassId(c.classId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedClassId === c.classId
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {c.className}
                </button>
              ))}
            </div>
          )}

          {/* ── Content: Gradebook Table per Class ────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50">
            {loading ? (
              <div className="text-center py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 size={32} className="animate-spin text-amber-500" />
                <p className="text-xs font-medium text-gray-500">Đang tải bảng điểm học vụ...</p>
              </div>
            ) : error ? (
              <div className="text-center py-14 px-4 max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <p className="text-sm font-semibold text-gray-800">{error}</p>
                <button
                  onClick={() => fetchGrades()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : gradesData.length === 0 ? (
              <div className="text-center py-20 text-gray-400 space-y-2">
                <BookOpen size={44} className="mx-auto text-gray-300" />
                <p className="text-sm font-bold text-gray-700">Chưa có dữ liệu bảng điểm</p>
                <p className="text-xs text-gray-400">
                  Khi giảng viên chấm điểm các bài tập hoặc cột điểm học phần, kết quả sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              filteredData.map((cls) => (
                <div
                  key={cls.classId}
                  className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/90 shadow-xs overflow-hidden"
                >
                  {/* Class Header Banner */}
                  <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-indigo-600" />
                        <h4 className="text-sm font-bold text-gray-900">{cls.className}</h4>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Giảng viên phụ trách: <span className="font-semibold text-gray-700">{cls.teacherName}</span> ({cls.teacherEmail})
                      </p>
                    </div>

                    {/* Class Score Summary */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium">Tiến độ</p>
                        <p className="text-xs font-semibold text-gray-700">
                          {cls.gradedCount} / {cls.totalAssignments} bài
                        </p>
                      </div>
                      <div className="pl-4 border-l border-gray-200 text-right">
                        <p className="text-[10px] text-gray-400 font-medium">ĐTB Môn</p>
                        {cls.averageScore !== null ? (
                          <p
                            className={`text-base font-extrabold ${
                              cls.averageScore >= 8.0
                                ? 'text-emerald-600'
                                : cls.averageScore >= 6.5
                                ? 'text-blue-600'
                                : cls.averageScore >= 5.0
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {cls.averageScore.toFixed(1)} / 10
                          </p>
                        ) : (
                          <p className="text-xs font-semibold text-gray-400">—</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  {cls.assignments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      Môn học này hiện chưa có cột điểm hoặc bài kiểm tra nào.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-[11px] text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                          <tr>
                            <th className="px-5 py-3 whitespace-nowrap">Bài Đánh Giá / Kiểm Tra</th>
                            <th className="px-4 py-3 whitespace-nowrap">Hạn Nộp</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">Điểm Số</th>
                            <th className="px-5 py-3 whitespace-nowrap">Nhận Xét Của Giảng Viên</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">Bài Nộp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {cls.assignments.map((assn) => {
                            const isSubmitted = Boolean(assn.submissionUrl);
                            return (
                              <tr key={assn.id} className="hover:bg-slate-50/80 transition-colors">
                                {/* Title */}
                                <td className="px-5 py-3.5">
                                  <p className="font-bold text-gray-900 text-xs leading-snug">{assn.title}</p>
                                  {assn.description && (
                                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 max-w-xs">
                                      {assn.description}
                                    </p>
                                  )}
                                </td>

                                {/* Due Date */}
                                <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>
                                      {assn.dueDate
                                        ? new Date(assn.dueDate).toLocaleDateString('vi-VN')
                                        : 'Không giới hạn'}
                                    </span>
                                  </div>
                                </td>

                                {/* Score Badge */}
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  {getScoreBadge(assn.score)}
                                </td>

                                {/* Teacher Feedback */}
                                <td className="px-5 py-3.5 max-w-sm">
                                  {assn.feedback ? (
                                    <div className="flex items-start gap-1.5 p-2 rounded-xl bg-amber-50/70 border border-amber-200/60 text-amber-900 text-[11px]">
                                      <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                      <span className="leading-relaxed">{assn.feedback}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-300 italic">—</span>
                                  )}
                                </td>

                                {/* Submitted Work Link */}
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  {isSubmitted ? (
                                    <a
                                      href={assn.submissionUrl!}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                                      title="Xem bài làm đã nộp"
                                    >
                                      <FileCheck className="w-3 h-3 text-indigo-600" />
                                      <span>Xem bài làm</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </a>
                                  ) : (
                                    <span className="text-gray-300 text-[11px] italic">Chưa nộp</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Tổng cộng: {gradesData.length} môn học · {allGradedScores.length} bài đã chấm
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. BẢN IN HỌC VỤ KHỔ NGANG A4 LANDSCAPE (CHỈ HIỂN THỊ KHI IN)              */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div id="student-grades-print-doc" className="hidden print:block text-black bg-white w-full">
        {/* Header Quốc hiệu & Đơn vị đào tạo */}
        <div className="flex justify-between items-start border-b-2 border-black pb-2.5 mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900">BỘ GIÁO DỤC VÀ ĐÀO TẠO</p>
            <p className="text-xs font-black uppercase text-gray-950">HỆ THỐNG QUẢN TRỊ ĐÀO TẠO & HỌC VỤ SMS</p>
            <p className="text-[10px] text-gray-600">Đơn vị phát triển: LightBrave / DTECH TEAM</p>
          </div>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p className="text-xs font-bold text-gray-950 underline underline-offset-4 decoration-1">Độc lập - Tự do - Hạnh phúc</p>
            <p className="text-[9px] text-gray-500 italic mt-1">
              Thời gian in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Tiêu đề Bảng Điểm */}
        <div className="text-center my-2">
          <h1 className="text-base font-black uppercase tracking-wide text-gray-950">
            BẢNG ĐIỂM HỌC TẬP VÀ ĐÁNH GIÁ KẾT QUẢ ĐÀO TẠO
          </h1>
          <p className="text-[11px] font-medium text-gray-600 italic">
            (OFFICIAL ACADEMIC TRANSCRIPT & PERFORMANCE RECORD)
          </p>
        </div>

        {/* Thông tin sinh viên */}
        <div className="border border-gray-400 rounded p-2.5 bg-gray-50/30 mb-2.5 text-xs grid grid-cols-3 gap-x-4 gap-y-1">
          <div>
            <span className="text-gray-600 font-medium">Họ và tên:</span>{' '}
            <strong className="text-gray-950 font-bold uppercase">{user?.name || 'Học sinh'}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Mã số sinh viên (MSSV):</span>{' '}
            <strong className="text-gray-950 font-bold">{user?.studentProfile?.studentCode || 'Chưa cập nhật'}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Email:</span>{' '}
            <span className="text-gray-900">{user?.email || '—'}</span>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Niên khóa:</span>{' '}
            <strong className="text-gray-900">Năm học 2026 - 2027</strong>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Hệ đào tạo:</span>{' '}
            <span className="text-gray-900 font-semibold">Chính quy</span>
          </div>
          <div>
            <span className="text-gray-600 font-medium">Phạm vi bảng điểm:</span>{' '}
            <strong className="text-gray-900">
              {selectedClassId === 'ALL' ? `Toàn bộ ${gradesData.length} môn học phần` : `Môn: ${filteredData[0]?.className || ''}`}
            </strong>
          </div>
        </div>

        {/* Khung tổng kết chỉ số thành tích (Academic Summary KPI) */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-center text-xs">
          <div className="border border-gray-400 rounded p-1.5 bg-gray-50/60">
            <span className="text-[10px] text-gray-600 uppercase block font-semibold">ĐTB Tích Lũy (Hệ 10)</span>
            <span className="text-sm font-black text-gray-950">{overallAvg !== null ? `${overallAvg} / 10` : '—'}</span>
          </div>
          <div className="border border-gray-400 rounded p-1.5 bg-gray-50/60">
            <span className="text-[10px] text-gray-600 uppercase block font-semibold">Quy Đổi Thang 4 (GPA)</span>
            <span className="text-sm font-black text-gray-950">{gpa4Scale || '—'} / 4.0</span>
          </div>
          <div className="border border-gray-400 rounded p-1.5 bg-gray-50/60">
            <span className="text-[10px] text-gray-600 uppercase block font-semibold">Xếp Loại Học Lực</span>
            <span className="text-sm font-black text-gray-950">{rankInfo.text}</span>
          </div>
          <div className="border border-gray-400 rounded p-1.5 bg-gray-50/60">
            <span className="text-[10px] text-gray-600 uppercase block font-semibold">Tiến Độ Đã Chấm</span>
            <span className="text-sm font-black text-gray-950">{totalGradedCount} / {totalAssignmentsCount} bài</span>
          </div>
        </div>

        {/* Bảng tổng hợp các môn học phần (Course-by-Course Table) */}
        <div className="mb-3">
          <table className="w-full text-xs text-left border border-gray-400">
            <thead className="bg-gray-100 font-bold uppercase text-[10px] text-gray-900">
              <tr>
                <th className="p-1.5 text-center w-8">STT</th>
                <th className="p-1.5">Học Phần / Môn Học</th>
                <th className="p-1.5">Giảng Viên Phụ Trách</th>
                <th className="p-1.5 text-center w-24">Tiến Độ Bài</th>
                <th className="p-1.5 text-center w-20">ĐTB (Hệ 10)</th>
                <th className="p-1.5 text-center w-16">Hệ 4</th>
                <th className="p-1.5 text-center w-24">Xếp Loại</th>
                <th className="p-1.5 text-center w-24">Kết Quả</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500 italic">
                    Chưa có dữ liệu môn học hoặc điểm số
                  </td>
                </tr>
              ) : (
                filteredData.map((cls, idx) => {
                  const classAvg = cls.averageScore;
                  const classAvg4 = classAvg !== null ? (classAvg * 0.4).toFixed(2) : '—';
                  const classRank = getAcademicRank(classAvg).text;
                  const isPass = classAvg !== null ? classAvg >= 5.0 : null;

                  return (
                    <tr key={cls.classId} className="border-t border-gray-300">
                      <td className="p-1.5 text-center font-medium">{idx + 1}</td>
                      <td className="p-1.5 font-bold text-gray-950">{cls.className}</td>
                      <td className="p-1.5 text-gray-700">{cls.teacherName}</td>
                      <td className="p-1.5 text-center">{cls.gradedCount} / {cls.totalAssignments}</td>
                      <td className="p-1.5 text-center font-black">
                        {classAvg !== null ? classAvg.toFixed(1) : '—'}
                      </td>
                      <td className="p-1.5 text-center font-semibold">{classAvg4}</td>
                      <td className="p-1.5 text-center font-medium">{classRank}</td>
                      <td className="p-1.5 text-center font-bold">
                        {isPass === null ? (
                          <span className="text-gray-400">Đang học</span>
                        ) : isPass ? (
                          <span className="text-emerald-800">ĐẠT</span>
                        ) : (
                          <span className="text-rose-800">CẦN THI LẠI</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bảng chi tiết từng đầu điểm & nhận xét của giảng viên */}
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase text-gray-900 mb-1">
            Chi tiết các bài kiểm tra & Nhận xét của Giảng viên:
          </p>
          <table className="w-full text-[11px] text-left border border-gray-400">
            <thead className="bg-gray-100 font-bold uppercase text-[10px] text-gray-900">
              <tr>
                <th className="p-1.5 text-center w-8">STT</th>
                <th className="p-1.5 w-44">Học Phần</th>
                <th className="p-1.5 w-52">Tên Bài Đánh Giá / Kiểm Tra</th>
                <th className="p-1.5 text-center w-24">Hạn Nộp</th>
                <th className="p-1.5 text-center w-20">Điểm (Hệ 10)</th>
                <th className="p-1.5">Nhận Xét Của Giảng Viên</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let rowCount = 0;
                const rows = filteredData.flatMap((cls) =>
                  cls.assignments.map((assn) => {
                    rowCount++;
                    return (
                      <tr key={assn.id} className="border-t border-gray-300">
                        <td className="p-1.5 text-center font-medium">{rowCount}</td>
                        <td className="p-1.5 font-semibold text-gray-900">{cls.className}</td>
                        <td className="p-1.5 font-medium">{assn.title}</td>
                        <td className="p-1.5 text-center text-gray-600">
                          {assn.dueDate ? new Date(assn.dueDate).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="p-1.5 text-center font-bold">
                          {assn.score !== null && assn.score !== undefined ? `${assn.score.toFixed(1)}` : 'Chưa chấm'}
                        </td>
                        <td className="p-1.5 text-gray-700 italic">
                          {assn.feedback ? assn.feedback : '—'}
                        </td>
                      </tr>
                    );
                  })
                );

                if (rows.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-gray-500 italic">
                        Chưa có đầu điểm nào được ghi nhận.
                      </td>
                    </tr>
                  );
                }
                return rows;
              })()}
            </tbody>
          </table>
        </div>

        {/* Chữ ký xác nhận 3 bên */}
        <div className="mt-4 pt-1 break-inside-avoid">
          <div className="text-right text-[11px] italic text-gray-700 mb-2">
            Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </div>
          <div className="grid grid-cols-3 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-gray-900">SINH VIÊN</p>
              <p className="text-[10px] text-gray-500 italic">(Ký và ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-900 uppercase">{user?.name || ''}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-gray-900">CỐ VẤN HỌC TẬP / GIẢNG VIÊN</p>
              <p className="text-[10px] text-gray-500 italic">(Ký và ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-900">
                {filteredData.length === 1 ? filteredData[0].teacherName : 'Giảng viên phụ trách'}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-gray-900">XÁC NHẬN CỦA NHÀ TRƯỜNG</p>
              <p className="text-[10px] text-gray-500 italic">(Ký tên và đóng dấu)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-gray-900">PHÒNG ĐÀO TẠO & HỌC VỤ</p>
            </div>
          </div>
          <div className="border-t border-gray-400 mt-4 pt-1 flex justify-between text-[9px] text-gray-500">
            <span>* Bảng điểm được kết xuất tự động từ Hệ thống Quản trị Học vụ SMS. Mọi chỉnh sửa thủ công đều không hợp lệ.</span>
            <span>Mã bảo thực: SMS-TRANSCRIPT-{new Date().getFullYear()}-{user?.studentProfile?.studentCode || 'STU'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
