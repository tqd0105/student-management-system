'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ApiService from '@/services/ApiService';
import { 
  Plus, Save, Trash2, X, Check, Edit3, Eye, MessageSquare, 
  Calendar, Search, Download, Users, Award, BookOpen, AlertCircle,
  ExternalLink, FileCheck, Link2, Clock, ChevronLeft, ChevronRight,
  AlertTriangle, FileText, Sparkles, CheckCircle2, Pencil, RefreshCw,
  Maximize2, Minimize2, Filter, LayoutList, Table as TableIcon
} from 'lucide-react';

interface GradebookProps {
  classId: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ClassMaterial {
  id: string;
  title: string;
  url: string;
  type: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  attachmentUrl?: string | null;
  materialId?: string | null;
  material?: ClassMaterial | null;
}

interface Grade {
  studentId: string;
  assignmentId: string;
  score: number | null;
  feedback: string | null;
  submissionUrl?: string | null;
  submissionNotes?: string | null;
  submittedAt?: string | null;
}

interface AssignmentFormData {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DDTHH:mm
  materialId: string;
  attachmentUrl: string;
}

interface SpeedGraderState {
  isOpen: boolean;
  assignmentId: string;
  studentIndex: number;
  score: string;
  feedback: string;
  isSaving: boolean;
}

// ─── Helper Functions for Date & Time ──────────────────────────────────────────

const toDatetimeLocal = (isoString?: string | null) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getPresetDeadline = (daysAhead: number, hours = 23, minutes = 59) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hours, minutes, 0, 0);
  return toDatetimeLocal(d.toISOString());
};

const formatDeadlineDisplay = (dueDateStr?: string | null) => {
  if (!dueDateStr) return null;
  const d = new Date(dueDateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getDeadlineStatus = (dueDateStr?: string | null) => {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: 'Hết hạn',
      detail: absDays === 0 ? 'Hôm nay' : `${absDays} ngày trước`,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      isOverdue: true,
    };
  }
  if (diffHours <= 24) {
    return {
      label: `Còn ${diffHours}h`,
      detail: 'Sắp hết hạn',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      isOverdue: false,
    };
  }
  return {
    label: `Còn ${diffDays} ngày`,
    detail: 'Đang mở',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    isOverdue: false,
  };
};

export default function Gradebook({ classId }: GradebookProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [loading, setLoading] = useState(true);

  // Chế độ: false = Xem điểm (View Mode), true = Sửa điểm (Edit Mode)
  const [isEditMode, setIsEditMode] = useState(false);

  // Tìm kiếm học sinh
  const [searchQuery, setSearchQuery] = useState('');

  // Trạng thái đang chỉnh sửa inline bảng tính
  const [editingGrades, setEditingGrades] = useState<Record<string, number | string>>({});
  const [editingFeedbacks, setEditingFeedbacks] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Form Thêm cột điểm
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState<AssignmentFormData>({ 
    title: '', 
    description: '', 
    dueDate: '',
    materialId: '',
    attachmentUrl: '',
  });

  // Modal Sửa Cột điểm (Hạn nộp, tài liệu, mô tả)
  const [editingAssignmentModal, setEditingAssignmentModal] = useState<{
    isOpen: boolean;
    id: string;
    data: AssignmentFormData;
  }>({
    isOpen: false,
    id: '',
    data: { title: '', description: '', dueDate: '', materialId: '', attachmentUrl: '' }
  });

  // SpeedGrader (Chấm điểm nhanh theo luồng học sinh)
  const [speedGrader, setSpeedGrader] = useState<SpeedGraderState>({
    isOpen: false,
    assignmentId: '',
    studentIndex: 0,
    score: '',
    feedback: '',
    isSaving: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cấu hình hiển thị cột điểm và giao diện (Thẻ cho Mobile / Bảng tính)
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('table');
  const [columnFilter, setColumnFilter] = useState<'all' | 'need_grading' | 'active' | 'overdue' | 'recent_5'>('all');
  const [columnSearch, setColumnSearch] = useState('');
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // State kiểm soát client mount cho React Portal
  const [mounted, setMounted] = useState(false);

  // Tự động chọn chế độ Dạng Thẻ trên màn hình điện thoại (< 768px) để tối ưu trải nghiệm & thiết lập mounted
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewLayout('cards');
    }
  }, []);

  // Đếm số ô đã chỉnh sửa chưa lưu
  const unsavedCount = new Set([
    ...Object.keys(editingGrades), 
    ...Object.keys(editingFeedbacks)
  ]).size;

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Fetch students
      const stuRes = await ApiService.getClassStudents(classId);
      if (stuRes.success) {
        setStudents(stuRes.data.map((s: any) => ({ id: s.id, name: s.name, email: s.email })));
      }

      // Fetch assignments
      const assnRes = await ApiService.getClassAssignments(classId);
      if (assnRes.success) setAssignments(assnRes.data);

      // Fetch class materials for linking
      try {
        const matRes = await ApiService.getClassMaterials(classId);
        if (matRes.success && Array.isArray(matRes.data)) {
          setMaterials(matRes.data);
        }
      } catch (err) {
        console.warn('Could not load class materials', err);
      }

      // Fetch grades
      const gradeRes = await ApiService.getClassGrades(classId);
      if (gradeRes.success) {
        const gradeMap: Record<string, Grade> = {};
        gradeRes.data.forEach((g: any) => {
          gradeMap[`${g.studentId}_${g.assignmentId}`] = g;
        });
        setGrades(gradeMap);
      }
    } catch (error) {
      console.error("Failed to load gradebook", error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tự động đồng bộ khi quay lại tab hoặc khi có sự kiện nộp bài/chấm điểm
  useEffect(() => {
    const handleSync = () => {
      if (!isEditMode || unsavedCount === 0) {
        fetchData(true);
      }
    };
    const handleFocus = () => {
      if (!isEditMode || unsavedCount === 0) {
        fetchData(true);
      }
    };

    window.addEventListener('sms:refresh-grades', handleSync);
    window.addEventListener('sms:refresh-assignments', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('sms:refresh-grades', handleSync);
      window.removeEventListener('sms:refresh-assignments', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData, isEditMode, unsavedCount]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // ─── ASSIGNMENT ACTIONS ───────────────────────────────────────────────────────

  const handleAddAssignment = async () => {
    if (!newAssignment.title.trim()) return;
    try {
      const payload = {
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim() || undefined,
        dueDate: newAssignment.dueDate ? new Date(newAssignment.dueDate).toISOString() : null,
        attachmentUrl: newAssignment.attachmentUrl.trim() || null,
        materialId: newAssignment.materialId || null,
      };

      const res = await ApiService.createAssignment(classId, payload);
      if (res.success) {
        setAssignments([...assignments, res.data]);
        setIsAddingAssignment(false);
        setNewAssignment({ title: '', description: '', dueDate: '', materialId: '', attachmentUrl: '' });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-assignments'));
        }
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi khi thêm cột điểm');
    }
  };

  const handleOpenEditAssignment = (assn: Assignment) => {
    setEditingAssignmentModal({
      isOpen: true,
      id: assn.id,
      data: {
        title: assn.title,
        description: assn.description || '',
        dueDate: toDatetimeLocal(assn.dueDate),
        materialId: assn.materialId || '',
        attachmentUrl: assn.attachmentUrl || '',
      }
    });
  };

  const handleSaveEditAssignment = async () => {
    if (!editingAssignmentModal.id || !editingAssignmentModal.data.title.trim()) return;
    try {
      const payload = {
        title: editingAssignmentModal.data.title.trim(),
        description: editingAssignmentModal.data.description.trim() || null,
        dueDate: editingAssignmentModal.data.dueDate ? new Date(editingAssignmentModal.data.dueDate).toISOString() : null,
        attachmentUrl: editingAssignmentModal.data.attachmentUrl.trim() || null,
        materialId: editingAssignmentModal.data.materialId || null,
      };

      const res = await ApiService.updateAssignment(editingAssignmentModal.id, payload);
      if (res.success) {
        setAssignments(prev => prev.map(a => a.id === editingAssignmentModal.id ? res.data : a));
        setEditingAssignmentModal({
          isOpen: false,
          id: '',
          data: { title: '', description: '', dueDate: '', materialId: '', attachmentUrl: '' }
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-assignments'));
        }
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi khi cập nhật cột điểm');
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa cột điểm này? Tất cả điểm và bài nộp liên quan sẽ bị xóa vĩnh viễn.')) return;
    try {
      const res = await ApiService.deleteAssignment(id);
      if (res.success) {
        setAssignments(assignments.filter(a => a.id !== id));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-assignments'));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ─── INLINE TABLE EDITING ────────────────────────────────────────────────────

  const handleGradeChange = (studentId: string, assignmentId: string, value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [`${studentId}_${assignmentId}`]: value
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    sIdx: number,
    aIdx: number
  ) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextElem = document.getElementById(`grade-cell-${sIdx + 1}-${aIdx}`);
      if (nextElem) (nextElem as HTMLInputElement).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevElem = document.getElementById(`grade-cell-${sIdx - 1}-${aIdx}`);
      if (prevElem) (prevElem as HTMLInputElement).focus();
    }
  };

  const handleSwitchMode = (targetEditMode: boolean) => {
    if (isEditMode && !targetEditMode && unsavedCount > 0) {
      const confirmLeave = confirm(
        `Bạn đang có ${unsavedCount} thay đổi điểm/nhận xét chưa lưu. Nếu chuyển sang Chế độ Xem, các thay đổi này sẽ bị hủy.\n\nBạn có chắc muốn tiếp tục không?`
      );
      if (!confirmLeave) return;
      setEditingGrades({});
      setEditingFeedbacks({});
    }
    setIsEditMode(targetEditMode);
  };

  const handleCancelEdit = () => {
    if (unsavedCount > 0) {
      if (!confirm(`Bạn có chắc muốn hủy bỏ ${unsavedCount} thay đổi chưa lưu?`)) return;
    }
    setEditingGrades({});
    setEditingFeedbacks({});
    setIsEditMode(false);
  };

  const saveGrades = async () => {
    setIsSaving(true);
    const keysToUpdate = new Set([
      ...Object.keys(editingGrades), 
      ...Object.keys(editingFeedbacks)
    ]);

    const updates = Array.from(keysToUpdate).map(key => {
      const [studentId, assignmentId] = key.split('_');
      const g = grades[key];
      
      const scoreVal = editingGrades[key] !== undefined 
        ? (editingGrades[key] === '' ? null : Number(editingGrades[key]))
        : (g?.score ?? null);

      const feedbackVal = editingFeedbacks[key] !== undefined
        ? (editingFeedbacks[key] === '' ? null : editingFeedbacks[key])
        : (g?.feedback ?? null);

      return {
        studentId,
        assignmentId,
        score: scoreVal,
        feedback: feedbackVal
      };
    });

    try {
      const res = await ApiService.updateGrades(classId, updates);
      if (res.success) {
        setEditingGrades({});
        setEditingFeedbacks({});
        setIsEditMode(false);
        fetchData();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-grades'));
        }
        alert('Đã lưu điểm và nhận xét thành công!');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi khi lưu điểm');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── SPEEDGRADER WORKFLOW ────────────────────────────────────────────────────

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Lọc danh sách cột điểm theo tìm kiếm & bộ lọc trạng thái
  const filteredAssignments = React.useMemo(() => {
    let list = [...assignments];
    if (columnSearch.trim()) {
      const q = columnSearch.toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        (a.description && a.description.toLowerCase().includes(q))
      );
    }
    if (columnFilter === 'need_grading') {
      list = list.filter(a => 
        students.some(s => {
          const g = grades[`${s.id}_${a.id}`];
          return !!g?.submissionUrl && (g?.score === null || g?.score === undefined);
        })
      );
    } else if (columnFilter === 'active') {
      list = list.filter(a => a.dueDate && new Date(a.dueDate).getTime() >= Date.now());
    } else if (columnFilter === 'overdue') {
      list = list.filter(a => a.dueDate && new Date(a.dueDate).getTime() < Date.now());
    } else if (columnFilter === 'recent_5') {
      list = list.slice(-5);
    }
    return list;
  }, [assignments, columnSearch, columnFilter, students, grades]);

  // Đếm số cột có bài nộp cần chấm
  const needGradingCount = React.useMemo(() => {
    return assignments.filter(a => 
      students.some(s => {
        const g = grades[`${s.id}_${a.id}`];
        return !!g?.submissionUrl && (g?.score === null || g?.score === undefined);
      })
    ).length;
  }, [assignments, students, grades]);

  // Điều hướng cuộn ngang bảng điểm mượt mà
  const handleScrollTable = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({
        left: direction === 'left' ? -380 : 380,
        behavior: 'smooth'
      });
    }
  };

  const handleJumpToColumn = (assignmentId: string) => {
    if (!assignmentId) return;
    const colEl = document.getElementById(`col-header-${assignmentId}`);
    if (colEl) {
      colEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  const openSpeedGrader = (assignmentId: string, studentIdx: number) => {
    const student = filteredStudents[studentIdx];
    if (!student) return;
    const key = `${student.id}_${assignmentId}`;
    const g = grades[key];
    const currentScore = editingGrades[key] !== undefined 
      ? String(editingGrades[key]) 
      : (g?.score !== null && g?.score !== undefined ? String(g.score) : '');
    const currentFeedback = editingFeedbacks[key] !== undefined 
      ? editingFeedbacks[key] 
      : (g?.feedback || '');

    setSpeedGrader({
      isOpen: true,
      assignmentId,
      studentIndex: studentIdx,
      score: currentScore,
      feedback: currentFeedback,
      isSaving: false,
    });
  };

  const handleSaveSpeedGrader = async (advanceNext: boolean) => {
    const student = filteredStudents[speedGrader.studentIndex];
    const assignment = assignments.find(a => a.id === speedGrader.assignmentId);
    if (!student || !assignment) return;

    const key = `${student.id}_${assignment.id}`;
    const scoreNum = speedGrader.score.trim() === '' ? null : Number(speedGrader.score);

    if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
      alert('Điểm số phải nằm trong khoảng từ 0 đến 10');
      return;
    }

    setSpeedGrader(prev => ({ ...prev, isSaving: true }));
    try {
      const res = await ApiService.updateGrades(classId, [{
        studentId: student.id,
        assignmentId: assignment.id,
        score: scoreNum,
        feedback: speedGrader.feedback.trim() || null,
      }]);

      if (res.success) {
        // Cập nhật state grades ngay lập tức
        setGrades(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            studentId: student.id,
            assignmentId: assignment.id,
            score: scoreNum,
            feedback: speedGrader.feedback.trim() || null,
          }
        }));

        // Xóa khỏi bộ nhớ đệm chưa lưu nếu có
        setEditingGrades(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setEditingFeedbacks(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sms:refresh-grades'));
        }

        if (advanceNext) {
          const nextIdx = speedGrader.studentIndex + 1;
          if (nextIdx < filteredStudents.length) {
            const nextStudent = filteredStudents[nextIdx];
            const nextKey = `${nextStudent.id}_${assignment.id}`;
            const nextG = grades[nextKey];
            setSpeedGrader({
              isOpen: true,
              assignmentId: assignment.id,
              studentIndex: nextIdx,
              score: nextG?.score !== null && nextG?.score !== undefined ? String(nextG.score) : '',
              feedback: nextG?.feedback || '',
              isSaving: false,
            });
            return;
          } else {
            alert('🎉 Đã chấm xong học sinh cuối cùng trong danh sách!');
          }
        }

        setSpeedGrader(prev => ({ ...prev, isOpen: false, isSaving: false }));
      }
    } catch (err) {
      console.error('Error saving grade in SpeedGrader:', err);
      alert('Lỗi khi lưu điểm');
      setSpeedGrader(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleNavigateStudent = (direction: 'prev' | 'next') => {
    const newIdx = direction === 'prev' 
      ? Math.max(0, speedGrader.studentIndex - 1) 
      : Math.min(filteredStudents.length - 1, speedGrader.studentIndex + 1);

    if (newIdx === speedGrader.studentIndex) return;

    const nextStudent = filteredStudents[newIdx];
    const nextKey = `${nextStudent.id}_${speedGrader.assignmentId}`;
    const nextG = grades[nextKey];

    setSpeedGrader(prev => ({
      ...prev,
      studentIndex: newIdx,
      score: nextG?.score !== null && nextG?.score !== undefined ? String(nextG.score) : '',
      feedback: nextG?.feedback || '',
    }));
  };

  // Tham chiếu callback cho phím tắt SpeedGrader
  const speedGraderRef = React.useRef({ speedGrader, handleSaveSpeedGrader, handleNavigateStudent });
  useEffect(() => {
    speedGraderRef.current = { speedGrader, handleSaveSpeedGrader, handleNavigateStudent };
  });

  // Lắng nghe phím tắt bàn phím khi SpeedGrader đang mở (Ctrl+Enter, ESC, Ctrl+Mũi tên)
  useEffect(() => {
    if (!speedGrader.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpeedGrader(prev => ({ ...prev, isOpen: false }));
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        speedGraderRef.current.handleSaveSpeedGrader(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        speedGraderRef.current.handleNavigateStudent('prev');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        speedGraderRef.current.handleNavigateStudent('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speedGrader.isOpen]);

  // ─── CSV EXPORT ──────────────────────────────────────────────────────────────

  const exportToCSV = () => {
    if (students.length === 0 || assignments.length === 0) {
      alert('Chưa có dữ liệu học sinh hoặc cột điểm để xuất file.');
      return;
    }
    const headers = [
      'STT', 
      'Họ và tên', 
      'Email', 
      ...assignments.map(a => `"${a.title.replace(/"/g, '""')}"`), 
      'Điểm TB'
    ];
    const rows = students.map((student, idx) => {
      let total = 0, count = 0;
      const scores = assignments.map(a => {
        const key = `${student.id}_${a.id}`;
        const g = grades[key];
        const editedVal = editingGrades[key];
        let val: number | null = null;
        if (editedVal !== undefined) {
          val = editedVal === '' ? null : Number(editedVal);
        } else if (g && g.score !== null) {
          val = g.score;
        }
        if (val !== null && !isNaN(val)) {
          total += val;
          count++;
          return val;
        }
        return '';
      });
      const avg = count > 0 ? (total / count).toFixed(1) : '';
      return [idx + 1, `"${student.name}"`, student.email, ...scores, avg];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bang_diem_lop_${classId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null || score === undefined) {
      return <span className="text-gray-300 font-medium">—</span>;
    }
    if (score >= 8.5) {
      return <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">{score}</span>;
    }
    if (score >= 7.0) {
      return <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">{score}</span>;
    }
    if (score >= 5.0) {
      return <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">{score}</span>;
    }
    return <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">{score}</span>;
  };

  // Thống kê nhanh toàn lớp
  let totalAllScores = 0;
  let countAllScores = 0;
  let studentsPassCount = 0;

  students.forEach(student => {
    let sTotal = 0, sCount = 0;
    assignments.forEach(a => {
      const g = grades[`${student.id}_${a.id}`];
      if (g && g.score !== null && !isNaN(g.score)) {
        sTotal += g.score;
        sCount++;
        totalAllScores += g.score;
        countAllScores++;
      }
    });
    if (sCount > 0 && (sTotal / sCount) >= 5.0) {
      studentsPassCount++;
    }
  });

  const classOverallAvg = countAllScores > 0 ? (totalAllScores / countAllScores).toFixed(1) : '—';
  const passRate = students.length > 0 ? Math.round((studentsPassCount / students.length) * 100) : 0;

  if (loading) return <div className="p-8 text-center text-gray-500">Đang tải bảng điểm...</div>;

  // Active SpeedGrader entities
  const activeSpeedGraderStudent = filteredStudents[speedGrader.studentIndex];
  const activeSpeedGraderAssignment = assignments.find(a => a.id === speedGrader.assignmentId);
  const activeSpeedGraderKey = activeSpeedGraderStudent && activeSpeedGraderAssignment 
    ? `${activeSpeedGraderStudent.id}_${activeSpeedGraderAssignment.id}` 
    : '';
  const activeSpeedGraderGrade = activeSpeedGraderKey ? grades[activeSpeedGraderKey] : null;
  const isSubmissionLate = Boolean(
    activeSpeedGraderGrade?.submittedAt && 
    activeSpeedGraderAssignment?.dueDate && 
    new Date(activeSpeedGraderGrade.submittedAt) > new Date(activeSpeedGraderAssignment.dueDate)
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
      {/* Primary Toolbar with Mode Switcher */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap justify-between items-center gap-3">
        
        {/* Left: Mode Segmented Switch */}
        <div className="flex items-center gap-3">
          <div className="inline-flex bg-gray-200/90 p-1 rounded-xl shadow-inner border border-gray-200">
            <button
              type="button"
              onClick={() => handleSwitchMode(false)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isEditMode
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye size={15} />
              <span>Chế độ Xem </span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode(true)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isEditMode
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 size={15} />
              <span>Chế độ Sửa </span>
              {unsavedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-gray-900 font-bold">
                  {unsavedCount}
                </span>
              )}
            </button>
          </div>

          {isEditMode ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Đang chỉnh sửa
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Chỉ xem (An toàn)
            </span>
          )}
        </div>

        {/* Right: Actions based on Mode */}
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button 
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3.5 py-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <X size={14} /> Hủy bỏ
              </button>
              <button 
                onClick={saveGrades}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <Save size={14} /> 
                <span>{isSaving ? 'Đang lưu...' : unsavedCount > 0 ? `Lưu thay đổi (${unsavedCount})` : 'Lưu bảng điểm'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
                title="Tải lại bảng điểm & bài nộp mới nhất từ học sinh"
              >
                <RefreshCw size={13} className={isRefreshing || loading ? 'animate-spin text-indigo-600' : 'text-gray-500'} />
                <span className='hidden sm:block'>{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
                title="Xuất bảng điểm ra file CSV Excel"
              >
                <Download size={14} /> 
              <span className='hidden sm:block'>Xuất CSV</span>
              </button>
              <button 
                onClick={() => setIsAddingAssignment(true)}
                className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Plus size={14} /> Thêm Cột Điểm / Bài Tập
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode Notice Banner */}
      {isEditMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>Mẹo nhập điểm:</strong> Nhập điểm trực tiếp vào ô, dùng phím <strong>Mũi tên Lên / Xuống</strong> hoặc <strong>Enter</strong> để chuyển học sinh. Bấm biểu tượng <Sparkles size={13} className="inline mx-0.5 text-indigo-600" /> hoặc nút chấm bài để duyệt link bài nộp của học sinh và chấm theo chuỗi.
            </span>
          </div>
          <button 
            onClick={() => setIsAddingAssignment(true)}
            className="shrink-0 text-indigo-700 hover:text-indigo-900 font-semibold underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} /> Thêm cột điểm
          </button>
        </div>
      )}

      {/* View Mode Stats & Search Bar */}
      {!isEditMode && (
        <div className="p-3 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Statistics */}
          <div className="flex items-center gap-4 text-gray-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-gray-400" />
              <span>Sĩ số: <strong className="text-gray-800">{students.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-gray-400" />
              <span>Cột điểm: <strong className="text-gray-800">{assignments.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award size={14} className="text-indigo-500" />
              <span>Điểm TB lớp: <strong className="text-indigo-700">{classOverallAvg}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Tỉ lệ đạt (≥5.0): <strong className="text-emerald-700">{passRate}%</strong></span>
            </div>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email học sinh..."
              className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
            />
          </div>
        </div>
      )}

      {/* Add Assignment Form Modal / Inline Panel */}
      {isAddingAssignment && (
        <div className="p-4 bg-indigo-50/90 border-b border-indigo-100 flex flex-col gap-3.5 animate__animated animate__fadeInDown animate__faster">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
              <Plus size={15} className="text-indigo-600" /> Tạo Cột Điểm / Bài Tập Mới
            </span>
            <button 
              onClick={() => setIsAddingAssignment(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
            {/* Tên cột điểm */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên cột điểm / Bài tập *</label>
              <input 
                type="text" 
                value={newAssignment.title}
                onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                placeholder="VD: Kiểm tra giữa kỳ, Bài tập 1..."
                autoFocus
              />
            </div>

            {/* Hạn nộp ngày & giờ */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Clock size={12} className="text-indigo-600" /> Hạn nộp (Ngày & Giờ)
                </label>
                {newAssignment.dueDate && (
                  <button
                    type="button"
                    onClick={() => setNewAssignment({...newAssignment, dueDate: ''})}
                    className="text-[10px] text-rose-600 hover:underline"
                  >
                    Xóa hạn
                  </button>
                )}
              </div>
              <input 
                type="datetime-local" 
                value={newAssignment.dueDate}
                onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-mono"
              />
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setNewAssignment({...newAssignment, dueDate: getPresetDeadline(0)})}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-indigo-100 text-gray-600 border border-gray-200"
                >
                  Hôm nay 23:59
                </button>
                <button
                  type="button"
                  onClick={() => setNewAssignment({...newAssignment, dueDate: getPresetDeadline(3)})}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-indigo-100 text-gray-600 border border-gray-200"
                >
                  +3 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setNewAssignment({...newAssignment, dueDate: getPresetDeadline(7)})}
                  className="px-1.5 py-0.5 text-[10px] rounded bg-white hover:bg-indigo-100 text-gray-600 border border-gray-200"
                >
                  +7 ngày
                </button>
              </div>
            </div>

            {/* Liên kết tài liệu học tập từ lớp */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <BookOpen size={12} className="text-indigo-600" /> Đính kèm tài liệu từ lớp
              </label>
              <select
                value={newAssignment.materialId}
                onChange={(e) => {
                  const val = e.target.value;
                  const selectedMat = materials.find(m => m.id === val);
                  setNewAssignment({
                    ...newAssignment,
                    materialId: val,
                    attachmentUrl: selectedMat ? selectedMat.url : ""
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white truncate"
              >
                <option value="">-- Không chọn tài liệu lớp --</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.type.toUpperCase()}] {m.title}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1 truncate">
                {materials.length > 0 ? `Có ${materials.length} tài liệu trong lớp` : 'Chưa có tài liệu nào trong lớp'}
              </p>
            </div>

            {/* Link đề bài / tài liệu trực tiếp */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Link2 size={12} className="text-indigo-600" /> Hoặc Link đề bài / tài liệu
              </label>
              <input 
                type="url" 
                value={newAssignment.attachmentUrl}
                onChange={e => setNewAssignment({...newAssignment, attachmentUrl: e.target.value})}
                className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-mono"
                placeholder="https://drive.google.com/... hoặc link đề Docs"
              />
            </div>
          </div>

          {/* Mô tả / Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả / Yêu cầu bài tập (Tùy chọn)</label>
            <input 
              type="text" 
              value={newAssignment.description}
              onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              placeholder="VD: Nộp link Google Drive ở chế độ xem, code đẩy lên GitHub..."
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <button 
              onClick={() => setIsAddingAssignment(false)} 
              className="bg-white border border-gray-300 text-gray-700 px-3.5 py-1.5 rounded-lg hover:bg-gray-100 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button 
              onClick={handleAddAssignment} 
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Check size={15} /> Tạo cột điểm & bài tập
            </button>
          </div>
        </div>
      )}

      {/* Edit Assignment Column Modal (Rendered via Portal to overlay independent of parent containers) */}
      {mounted && editingAssignmentModal.isOpen && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingAssignmentModal(prev => ({ ...prev, isOpen: false }));
            }
          }}
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg animate__animated animate__zoomIn animate__faster overflow-hidden my-auto"
          >
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Pencil size={15} className="text-indigo-600" /> Sửa Cột Điểm / Hạn Nộp / Tài Liệu
              </h4>
              <button 
                onClick={() => setEditingAssignmentModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tên cột điểm *</label>
                <input 
                  type="text" 
                  value={editingAssignmentModal.data.title}
                  onChange={e => setEditingAssignmentModal({
                    ...editingAssignmentModal,
                    data: { ...editingAssignmentModal.data, title: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-gray-700 flex items-center gap-1">
                    <Clock size={13} className="text-indigo-600" /> Hạn nộp bài (Ngày & Giờ)
                  </label>
                  {editingAssignmentModal.data.dueDate && (
                    <button
                      type="button"
                      onClick={() => setEditingAssignmentModal({
                        ...editingAssignmentModal,
                        data: { ...editingAssignmentModal.data, dueDate: '' }
                      })}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Xóa hạn nộp
                    </button>
                  )}
                </div>
                <input 
                  type="datetime-local" 
                  value={editingAssignmentModal.data.dueDate}
                  onChange={e => setEditingAssignmentModal({
                    ...editingAssignmentModal,
                    data: { ...editingAssignmentModal.data, dueDate: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-mono"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingAssignmentModal({
                      ...editingAssignmentModal,
                      data: { ...editingAssignmentModal.data, dueDate: getPresetDeadline(0) }
                    })}
                    className="px-2 py-0.5 text-[10px] rounded bg-gray-100 hover:bg-indigo-100 text-gray-700 border border-gray-200 cursor-pointer"
                  >
                    Hôm nay 23:59
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAssignmentModal({
                      ...editingAssignmentModal,
                      data: { ...editingAssignmentModal.data, dueDate: getPresetDeadline(3) }
                    })}
                    className="px-2 py-0.5 text-[10px] rounded bg-gray-100 hover:bg-indigo-100 text-gray-700 border border-gray-200 cursor-pointer"
                  >
                    +3 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingAssignmentModal({
                      ...editingAssignmentModal,
                      data: { ...editingAssignmentModal.data, dueDate: getPresetDeadline(7) }
                    })}
                    className="px-2 py-0.5 text-[10px] rounded bg-gray-100 hover:bg-indigo-100 text-gray-700 border border-gray-200 cursor-pointer"
                  >
                    +7 ngày
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <BookOpen size={13} className="text-indigo-600" /> Liên kết tài liệu từ lớp
                </label>
                <select
                  value={editingAssignmentModal.data.materialId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const selectedMat = materials.find(m => m.id === val);
                    setEditingAssignmentModal({
                      ...editingAssignmentModal,
                      data: {
                        ...editingAssignmentModal.data,
                        materialId: val,
                        attachmentUrl: selectedMat ? selectedMat.url : editingAssignmentModal.data.attachmentUrl
                      }
                    });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white cursor-pointer"
                >
                  <option value="">-- Không liên kết tài liệu lớp --</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      [{m.type.toUpperCase()}] {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <Link2 size={13} className="text-indigo-600" /> Hoặc Link tài liệu / đề bài trực tiếp
                </label>
                <input 
                  type="url" 
                  value={editingAssignmentModal.data.attachmentUrl}
                  onChange={e => setEditingAssignmentModal({
                    ...editingAssignmentModal,
                    data: { ...editingAssignmentModal.data, attachmentUrl: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white font-mono"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Mô tả / Yêu cầu</label>
                <textarea 
                  rows={2}
                  value={editingAssignmentModal.data.description}
                  onChange={e => setEditingAssignmentModal({
                    ...editingAssignmentModal,
                    data: { ...editingAssignmentModal.data, description: e.target.value }
                  })}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none bg-white resize-none"
                />
              </div>
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button 
                onClick={() => setEditingAssignmentModal(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100 cursor-pointer"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveEditAssignment}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <Check size={14} /> Cập nhật
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Column Management Toolbar for Large Gradebooks ─── */}
      <div className="px-3 py-2 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
        {/* Left: Quick Filter Chips & Column Search */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-500 font-semibold flex items-center gap-1 mr-1 text-[11px]">
            <Filter size={13} className="text-gray-400" /> Cột điểm:
          </span>
          <button
            type="button"
            onClick={() => setColumnFilter('all')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              columnFilter === 'all' 
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tất cả ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setColumnFilter('need_grading')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              columnFilter === 'need_grading' 
                ? 'bg-amber-600 text-white shadow-2xs font-semibold' 
                : needGradingCount > 0 
                ? 'bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            title="Các cột có học sinh đã nộp bài nhưng giáo viên chưa chấm điểm"
          >
            <span>Cần chấm</span>
            {needGradingCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                columnFilter === 'need_grading' ? 'bg-amber-800 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {needGradingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setColumnFilter('active')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              columnFilter === 'active' 
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Đang mở
          </button>
          <button
            type="button"
            onClick={() => setColumnFilter('overdue')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              columnFilter === 'overdue' 
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold' 
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Đã hết hạn
          </button>
          {assignments.length > 5 && (
            <button
              type="button"
              onClick={() => setColumnFilter('recent_5')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                columnFilter === 'recent_5' 
                  ? 'bg-indigo-600 text-white shadow-2xs font-semibold' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              5 bài gần nhất
            </button>
          )}

          {/* Quick Search for Columns */}
          <div className="relative ml-1 min-w-[130px] max-w-[170px]">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              value={columnSearch}
              onChange={(e) => setColumnSearch(e.target.value)}
              placeholder="Tìm cột điểm..."
              className="w-full pl-6 pr-5 py-0.5 border border-gray-300 rounded-md text-[11px] outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
            />
            {columnSearch && (
              <button 
                type="button"
                onClick={() => setColumnSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Right: Display Controls (View Mode, Jump to column, Compact mode, Scroll arrows) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher: Cards vs Table */}
          <div className="inline-flex bg-gray-200/90 p-0.5 rounded-lg border border-gray-300 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'cards'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Giao diện dạng thẻ từng học sinh (Tối ưu nhất cho điện thoại & máy tính bảng)"
            >
              <LayoutList size={13} />
              <span>Dạng Thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Giao diện bảng tính đầy đủ (Spreadsheet)"
            >
              <TableIcon size={13} />
              <span>Dạng Bảng</span>
            </button>
          </div>

          {/* Table-only controls */}
          {viewLayout === 'table' && (
            <>
              {/* Jump to column dropdown */}
              {assignments.length > 3 && (
                <select
                  onChange={(e) => {
                    handleJumpToColumn(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                  className="px-2 py-1 border border-gray-300 rounded-md text-[11px] bg-white text-gray-700 outline-none focus:ring-1 focus:ring-indigo-400 max-w-[125px] sm:max-w-[145px] truncate cursor-pointer"
                >
                  <option value="" disabled>Nhảy tới cột...</option>
                  {assignments.map((a, i) => (
                    <option key={a.id} value={a.id}>
                      {i + 1}. {a.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Density Toggle (Compact vs Comfortable) */}
              <button
                type="button"
                onClick={() => setIsCompactMode(!isCompactMode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  isCompactMode 
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title={isCompactMode ? 'Chế độ Thu gọn (tiết kiệm không gian). Bấm để chuyển sang Đầy đủ' : 'Chế độ Đầy đủ (chi tiết bài nộp). Bấm để chuyển sang Thu gọn'}
              >
                {isCompactMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                <span className="hidden sm:inline">{isCompactMode ? 'Thu gọn' : 'Đầy đủ'}</span>
              </button>

              {/* Horizontal Scroll Navigation */}
              <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScrollTable('left')}
                  className="p-1 hover:bg-gray-100 text-gray-600 transition-colors border-r border-gray-200 cursor-pointer"
                  title="Cuộn sang trái"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScrollTable('right')}
                  className="p-1 hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                  title="Cuộn sang phải"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── CARD VIEW (DÀNH CHO MOBILE & TABLET) ─────────────────────────────────── */}
      {viewLayout === 'cards' && (
        <div className="p-3 sm:p-4 bg-slate-50/70 space-y-3.5 flex-1 overflow-y-auto max-h-[calc(100vh-270px)]">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {students.length === 0 
                  ? 'Lớp hiện chưa có học sinh nào.' 
                  : 'Không tìm thấy học sinh phù hợp với từ khóa.'}
              </p>
            </div>
          ) : (
            filteredStudents.map((student, sIdx) => {
              // Tính điểm TB và thống kê riêng cho từng học sinh
              let total = 0, count = 0;
              let submittedCount = 0;
              let gradedCount = 0;

              assignments.forEach(a => {
                const key = `${student.id}_${a.id}`;
                const g = grades[key];
                const editedVal = editingGrades[key];
                
                let scoreToUse: number | null = null;
                if (editedVal !== undefined) {
                  scoreToUse = editedVal === '' ? null : Number(editedVal);
                } else if (g && g.score !== null) {
                  scoreToUse = g.score;
                }

                if (scoreToUse !== null && !isNaN(scoreToUse)) {
                  total += scoreToUse;
                  count++;
                  gradedCount++;
                }

                if (g?.submissionUrl) {
                  submittedCount++;
                }
              });

              const avg = count > 0 ? (total / count).toFixed(1) : '—';
              const avgNum = avg !== '—' ? parseFloat(avg) : null;

              return (
                <div 
                  key={student.id} 
                  className="bg-white rounded-xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all overflow-hidden"
                >
                  {/* Student Card Header */}
                  <div className="p-3 sm:p-3.5 bg-gradient-to-r from-gray-50/90 via-white to-indigo-50/40 border-b border-gray-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-xs sm:text-sm truncate" title={student.name}>
                            {student.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-normal">#{sIdx + 1}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate" title={student.email}>
                          {student.email}
                        </p>
                      </div>
                    </div>

                    {/* Right: GPA Badge & Graded Count */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right hidden xs:block">
                        <span className="text-[10px] text-gray-400 block leading-tight">Đã chấm</span>
                        <span className="text-xs font-semibold text-gray-700">{gradedCount}/{assignments.length}</span>
                      </div>

                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shadow-2xs ${
                        avgNum !== null && avgNum >= 8.0 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                          : avgNum !== null && avgNum >= 6.5 
                          ? 'bg-blue-50 text-blue-700 border-blue-300' 
                          : avgNum !== null && avgNum >= 5.0 
                          ? 'bg-amber-50 text-amber-700 border-amber-300' 
                          : avgNum !== null 
                          ? 'bg-rose-50 text-rose-700 border-rose-300' 
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        <Award size={14} className={avgNum !== null && avgNum >= 8.0 ? 'text-emerald-600' : 'text-indigo-600'} />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold uppercase leading-none opacity-75">ĐTB</span>
                          <span className="text-xs font-black leading-tight">{avg}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Student Card Assignment Items */}
                  <div className="p-2 sm:p-3 divide-y divide-gray-100">
                    {filteredAssignments.length === 0 ? (
                      <div className="py-4 text-center text-xs text-gray-400">
                        Không có cột điểm nào phù hợp bộ lọc hiện tại.
                      </div>
                    ) : (
                      filteredAssignments.map((assn, aIdx) => {
                        const key = `${student.id}_${assn.id}`;
                        const g = grades[key];
                        const currentScore = editingGrades[key] !== undefined 
                          ? editingGrades[key] 
                          : (g?.score ?? '');
                        const currentFeedback = editingFeedbacks[key] !== undefined 
                          ? editingFeedbacks[key] 
                          : (g?.feedback || '');
                        const isScoreEdited = editingGrades[key] !== undefined;
                        const isFeedbackEdited = editingFeedbacks[key] !== undefined;
                        const hasFeedback = Boolean(currentFeedback && String(currentFeedback).trim());
                        const hasSubmission = Boolean(g?.submissionUrl);
                        const isLate = Boolean(
                          hasSubmission && 
                          assn.dueDate && 
                          g?.submittedAt && 
                          new Date(g.submittedAt) > new Date(assn.dueDate)
                        );
                        const deadlineStatus = getDeadlineStatus(assn.dueDate);
                        const deadlineText = formatDeadlineDisplay(assn.dueDate);
                        const materialLink = assn.material?.url || assn.attachmentUrl;
                        const materialTitle = assn.material?.title || 'Tài liệu / Đề bài';

                        return (
                          <div 
                            key={assn.id} 
                            className={`py-2 px-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                              (isScoreEdited || isFeedbackEdited) ? 'bg-amber-50/70 border border-amber-200' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Left: Assignment Details & Badges */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 text-xs truncate max-w-[220px] sm:max-w-none" title={assn.title}>
                                  {assn.title}
                                </span>
                                {assn.dueDate && (
                                  <span 
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${deadlineStatus?.color || 'bg-gray-100 text-gray-700'}`}
                                    title={`Hạn nộp: ${deadlineText}`}
                                  >
                                    <Clock size={10} />
                                    <span>{deadlineText?.split(' ')[0]} {deadlineStatus?.label}</span>
                                  </span>
                                )}
                                {materialLink && (
                                  <a
                                    href={materialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 hover:bg-indigo-100 transition-colors truncate max-w-[140px]"
                                    title={`Mở tài liệu: ${materialTitle}`}
                                  >
                                    <BookOpen size={10} className="shrink-0 text-indigo-500" />
                                    <span className="truncate">{materialTitle}</span>
                                  </a>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {hasSubmission ? (
                                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                    isLate ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'
                                  }`}>
                                    <FileCheck size={12} className={isLate ? 'text-amber-600' : 'text-emerald-600'} />
                                    <span>{isLate ? 'Đã nộp (Nộp trễ)' : 'Đã nộp bài'}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400">
                                    Chưa nộp bài
                                  </span>
                                )}

                                {hasFeedback && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded font-medium" title={currentFeedback}>
                                    <MessageSquare size={10} className="fill-amber-400" />
                                    <span className="max-w-[130px] truncate">{currentFeedback}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: Score Value / Editing Input & Action Button */}
                            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                              {isEditMode ? (
                                /* Chế độ Sửa trên Mobile Card */
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-gray-500 font-medium">Điểm:</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    value={currentScore}
                                    onChange={(e) => handleGradeChange(student.id, assn.id, e.target.value)}
                                    className={`w-14 h-8 px-1 text-center font-bold text-xs border rounded-lg outline-none transition-all ${
                                      isScoreEdited 
                                        ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300 text-gray-900' 
                                        : 'border-gray-300 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 text-gray-800'
                                    }`}
                                    placeholder="-"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => openSpeedGrader(assn.id, sIdx)}
                                    className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                      hasSubmission 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                    title="Mở SpeedGrader để xem bài nộp & nhận xét"
                                  >
                                    <Sparkles size={12} className={hasSubmission ? 'text-emerald-600' : 'text-indigo-600'} />
                                    <span>Chấm</span>
                                  </button>
                                </div>
                              ) : (
                                /* Chế độ Xem trên Mobile Card */
                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-gray-400">Điểm:</span>
                                    {getScoreBadge(g?.score ?? null)}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openSpeedGrader(assn.id, sIdx)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                      hasSubmission 
                                        ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs' 
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
                                    }`}
                                  >
                                    <Eye size={12} />
                                    <span>{hasSubmission ? 'Chấm bài' : 'Xem'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── TABLE VIEW (SPREADSHEET / DESKTOP OPTIMIZED) ─────────────────────────── */}
      {viewLayout === 'table' && (
        <div ref={tableContainerRef} className="overflow-x-auto flex-1 relative select-text">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="text-xs text-gray-600 bg-gray-50/90 border-b">
              <tr>
                {/* Cột Tên Học Sinh (Sticky bên trái, độ rộng co dãn linh hoạt theo thiết bị) */}
                <th className="px-2.5 sm:px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-30 w-32 sm:w-56 md:w-64 min-w-[8rem] sm:min-w-[14rem] md:min-w-[16rem] max-w-[8.5rem] sm:max-w-none border-r border-b whitespace-nowrap shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)]">
                  <span className="truncate block">Học Sinh ({filteredStudents.length}/{students.length})</span>
                </th>

                {/* Danh sách các cột điểm (Đã lọc) */}
                {filteredAssignments.map((assn, aIdx) => {
                  const deadlineStatus = getDeadlineStatus(assn.dueDate);
                  const deadlineText = formatDeadlineDisplay(assn.dueDate);
                  const submittedCount = students.filter(s => !!grades[`${s.id}_${assn.id}`]?.submissionUrl).length;
                  const materialLink = assn.material?.url || assn.attachmentUrl;
                  const materialTitle = assn.material?.title || 'Tài liệu / Đề bài';

                  return (
                    <th 
                      key={assn.id} 
                      id={`col-header-${assn.id}`}
                      className={`font-semibold border-r border-b group bg-gray-50/90 align-top transition-all ${
                        isCompactMode 
                          ? 'px-2 py-2 min-w-[85px] sm:min-w-[96px] max-w-[110px]' 
                          : 'px-3 sm:px-3.5 py-2.5 sm:py-3 min-w-[140px] sm:min-w-[170px] max-w-[210px]'
                      }`}
                    >
                      {isCompactMode ? (
                        /* Compact Mode Header */
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-0.5">
                            <span 
                              className="font-bold text-gray-900 text-[11px] truncate max-w-[68px] block cursor-help" 
                              title={`${assn.title}${assn.dueDate ? `\nHạn nộp: ${deadlineText}` : ''}`}
                            >
                              {assn.title}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAssignment(assn)}
                                className="text-gray-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                                title="Sửa cột điểm"
                              >
                                <Pencil size={11} />
                              </button>
                              {isEditMode && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteAssignment(assn.id)}
                                  className="text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer"
                                  title="Xóa cột điểm"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-gray-500 pt-0.5 border-t border-gray-100">
                            {assn.dueDate ? (
                              <span 
                                className={`font-medium ${deadlineStatus?.isOverdue ? 'text-rose-600 font-bold' : 'text-gray-600'}`}
                                title={`Hạn: ${deadlineText}`}
                              >
                                ⏰ {deadlineText?.split(' ')[0]}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}

                            <span 
                              className={`font-bold ${submittedCount === students.length && students.length > 0 ? 'text-emerald-700' : 'text-gray-600'}`}
                              title={`${submittedCount}/${students.length} học sinh nộp`}
                            >
                              {submittedCount}/{students.length}
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Comfortable Mode Header */
                        <div className="flex flex-col gap-1.5">
                          {/* Title & Quick Actions */}
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-gray-900 text-xs truncate max-w-[130px]" title={assn.title}>
                              {assn.title}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditAssignment(assn)}
                                className="text-gray-400 hover:text-indigo-600 p-0.5 rounded transition-colors cursor-pointer"
                                title="Sửa hạn nộp / thông tin cột điểm"
                              >
                                <Pencil size={12} />
                              </button>
                              {isEditMode && (
                                <button 
                                  onClick={() => handleDeleteAssignment(assn.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded cursor-pointer"
                                  title="Xóa cột điểm này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Due Date & Time Badge */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {assn.dueDate ? (
                              <span 
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${deadlineStatus?.color || 'bg-gray-100 text-gray-700'}`}
                                title={`Hạn nộp: ${deadlineText} (${deadlineStatus?.detail || ''})`}
                              >
                                <Clock size={10} />
                                <span>{deadlineText?.split(' ')[0]} {deadlineStatus?.label}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Không thời hạn</span>
                            )}

                            {/* Submission count badge */}
                            <span 
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                submittedCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}
                              title={`${submittedCount} trên tổng số ${students.length} học sinh đã nộp bài`}
                            >
                              <FileCheck size={10} />
                              <span>{submittedCount}/{students.length} nộp</span>
                            </span>
                          </div>

                          {/* Linked Material Pill */}
                          {materialLink && (
                            <a
                              href={materialLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 transition-colors truncate max-w-full cursor-pointer"
                              title={`Mở tài liệu: ${materialTitle}\n${materialLink}`}
                            >
                              <BookOpen size={11} className="shrink-0 text-indigo-500" />
                              <span className="truncate">{materialTitle}</span>
                              <ExternalLink size={10} className="shrink-0 ml-auto opacity-70" />
                            </a>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}

                {/* Cột Điểm TB (Ở cuối bảng - Tiêu chuẩn và không che khuất cột điểm) */}
                <th className="px-3 sm:px-4 py-3 font-bold min-w-[85px] sm:min-w-[95px] bg-slate-50 border-b border-l border-gray-200 text-center whitespace-nowrap text-indigo-950">
                  <div className="flex items-center justify-center gap-1">
                    <Award size={13} className="text-indigo-600" />
                    <span>Điểm TB</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={filteredAssignments.length + 2} className="text-center py-12 text-gray-400">
                    {students.length === 0 
                      ? 'Lớp hiện chưa có học sinh nào.' 
                      : 'Không tìm thấy học sinh phù hợp với từ khóa.'}
                  </td>
                </tr>
              ) : filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter size={24} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-600">
                        Không có cột điểm nào phù hợp với bộ lọc hiện tại.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setColumnFilter('all'); setColumnSearch(''); }}
                        className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        Hiển thị lại tất cả {assignments.length} cột điểm
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, sIdx) => {
                  // Tính điểm trung bình môn của từng học sinh (trên toàn bộ bài tập để chuẩn xác)
                  let total = 0, count = 0;
                  assignments.forEach(a => {
                    const key = `${student.id}_${a.id}`;
                    const g = grades[key];
                    const editedVal = editingGrades[key];
                    
                    let scoreToUse: number | null = null;
                    if (editedVal !== undefined) {
                      scoreToUse = editedVal === '' ? null : Number(editedVal);
                    } else if (g && g.score !== null) {
                      scoreToUse = g.score;
                    }

                    if (scoreToUse !== null && !isNaN(scoreToUse)) {
                      total += scoreToUse;
                      count++;
                    }
                  });
                  const avg = count > 0 ? (total / count).toFixed(1) : '—';

                  return (
                    <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Student Name (Sticky Left - Tối ưu độ rộng trên mobile) */}
                      <td className="px-2.5 sm:px-4 py-2 sm:py-2.5 font-medium text-gray-800 sticky left-0 bg-white border-r border-b whitespace-nowrap z-20 w-32 sm:w-56 md:w-64 min-w-[8rem] sm:min-w-[14rem] md:min-w-[16rem] max-w-[8.5rem] sm:max-w-none shadow-[4px_0_10px_-2px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate min-w-0">
                            <p className="font-semibold text-gray-800 text-xs truncate" title={student.name}>{student.name}</p>
                            <p className="text-[10px] text-gray-400 font-normal truncate hidden sm:block" title={student.email}>{student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Assignment Cells */}
                      {filteredAssignments.map((assn, aIdx) => {
                        const key = `${student.id}_${assn.id}`;
                        const g = grades[key];
                        const currentScore = editingGrades[key] !== undefined 
                          ? editingGrades[key] 
                          : (g?.score ?? '');
                        const currentFeedback = editingFeedbacks[key] !== undefined 
                          ? editingFeedbacks[key] 
                          : (g?.feedback || '');
                        const isScoreEdited = editingGrades[key] !== undefined;
                        const isFeedbackEdited = editingFeedbacks[key] !== undefined;
                        const hasFeedback = Boolean(currentFeedback && String(currentFeedback).trim());
                        const hasSubmission = Boolean(g?.submissionUrl);
                        const isLate = Boolean(
                          hasSubmission && 
                          assn.dueDate && 
                          g?.submittedAt && 
                          new Date(g.submittedAt) > new Date(assn.dueDate)
                        );

                        return (
                          <td 
                            key={assn.id} 
                            className={`border-r border-b text-center transition-colors relative ${
                              isCompactMode ? 'px-1 py-1.5' : 'px-2 py-2'
                            } ${
                              (isScoreEdited || isFeedbackEdited) ? 'bg-amber-50/70' : ''
                            }`}
                          >
                            {isEditMode ? (
                              /* Sửa Điểm (Edit Mode) */
                              <div className="flex items-center justify-center gap-1">
                                <input 
                                  id={`grade-cell-${sIdx}-${aIdx}`}
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  value={currentScore}
                                  onChange={(e) => handleGradeChange(student.id, assn.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, sIdx, aIdx)}
                                  className={`${
                                    isCompactMode ? 'w-11 px-1 py-1 text-xs' : 'w-14 px-1.5 py-1 text-xs'
                                  } text-center font-bold border rounded outline-none transition-all ${
                                    isScoreEdited 
                                      ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-300 text-gray-900' 
                                      : 'border-gray-300 bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 text-gray-800'
                                  }`}
                                  placeholder="-"
                                />

                                {/* SpeedGrader button */}
                                <button
                                  type="button"
                                  onClick={() => openSpeedGrader(assn.id, sIdx)}
                                  className={`${isCompactMode ? 'p-0.5' : 'p-1'} rounded transition-colors relative cursor-pointer ${
                                    hasSubmission 
                                      ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' 
                                      : hasFeedback 
                                      ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' 
                                      : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-100'
                                  }`}
                                  title={hasSubmission ? (isLate ? 'Đã nộp bài (NỘP TRỄ) - Bấm để duyệt & chấm' : 'Đã nộp bài - Bấm để duyệt & chấm') : 'Mở bộ chấm điểm SpeedGrader'}
                                >
                                  {hasSubmission ? (
                                    <FileCheck size={isCompactMode ? 12 : 14} className={isLate ? 'text-amber-600' : 'text-emerald-600'} />
                                  ) : (
                                    <MessageSquare size={isCompactMode ? 11 : 13} className={hasFeedback ? 'fill-amber-500' : ''} />
                                  )}
                                  {hasFeedback && hasSubmission && (
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              /* Xem Điểm (View Mode) */
                              isCompactMode ? (
                                /* Compact View Cell */
                                <div 
                                  onClick={() => openSpeedGrader(assn.id, sIdx)}
                                  className="flex items-center justify-center gap-1 cursor-pointer py-1 px-0.5 rounded hover:bg-indigo-50/60 transition-colors group/cell"
                                  title={`Bấm để mở SpeedGrader xem bài nộp & chi tiết`}
                                >
                                  {getScoreBadge(g?.score ?? null)}
                                  {hasSubmission && (
                                    <span 
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLate ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                      title={isLate ? 'Đã nộp trễ' : 'Đã nộp đúng hạn'}
                                    />
                                  )}
                                  {hasFeedback && !hasSubmission && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Có nhận xét" />
                                  )}
                                </div>
                              ) : (
                                /* Comfortable View Cell */
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {getScoreBadge(g?.score ?? null)}

                                    {/* Submission badge / icon */}
                                    {hasSubmission && (
                                      <button
                                        type="button"
                                        onClick={() => openSpeedGrader(assn.id, sIdx)}
                                        className={`inline-flex items-center gap-0.5 p-1 rounded transition-colors cursor-pointer ${
                                          isLate ? 'text-amber-700 hover:bg-amber-100' : 'text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                        title={`Đã nộp bài ${isLate ? '(NỘP TRỄ)' : '(ĐÚNG HẠN)'}\nNộp lúc: ${g?.submittedAt ? new Date(g.submittedAt).toLocaleString('vi-VN') : ''}\nBấm để mở SpeedGrader`}
                                      >
                                        <FileCheck size={13} />
                                        {isLate && (
                                          <span className="text-[9px] font-bold px-1 rounded bg-amber-200 text-amber-900">Trễ</span>
                                        )}
                                      </button>
                                    )}

                                    {hasFeedback && (
                                      <button
                                        type="button"
                                        onClick={() => openSpeedGrader(assn.id, sIdx)}
                                        className="text-amber-500 hover:text-amber-600 p-0.5 transition-colors cursor-pointer"
                                        title={`Nhận xét: "${currentFeedback}"`}
                                      >
                                        <MessageSquare size={12} className="fill-amber-400" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Quick button to open SpeedGrader on hover */}
                                  <button
                                    type="button"
                                    onClick={() => openSpeedGrader(assn.id, sIdx)}
                                    className="font-bold group-hover:inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:underline cursor-pointer"
                                  >
                                    <span>Chấm / Xem</span>
                                  </button>
                                </div>
                              )
                            )}
                          </td>
                        );
                      })}

                      {/* Cột Điểm TB (Ở cuối bảng) */}
                      <td className="px-3 sm:px-4 py-2.5 font-bold text-center bg-slate-50/40 border-b border-l border-gray-200 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          avg !== '—' && parseFloat(avg) >= 8.0 
                            ? 'bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200' 
                            : avg !== '—' && parseFloat(avg) >= 6.5 
                            ? 'bg-blue-50 text-blue-700 font-extrabold border border-blue-200' 
                            : avg !== '—' && parseFloat(avg) >= 5.0 
                            ? 'bg-amber-50 text-amber-700 font-extrabold border border-amber-200' 
                            : avg !== '—' 
                            ? 'bg-rose-50 text-rose-700 font-extrabold border border-rose-200' 
                            : 'text-gray-400 font-normal'
                        }`}>
                          {avg}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── SPEEDGRADER DIALOG (Rendered via Portal to document.body, fully independent of parent modals) ─── */}
      {mounted && speedGrader.isOpen && activeSpeedGraderStudent && activeSpeedGraderAssignment && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSpeedGrader(prev => ({ ...prev, isOpen: false }));
            }
          }}
          className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-4 md:p-6 overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl animate__animated animate__zoomIn animate__faster overflow-hidden flex flex-col max-h-[88vh] my-auto"
          >
            
            {/* SpeedGrader Header (shrink-0 đảm bảo không bao giờ bị co mất trên laptop) */}
            <div className="p-3.5 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/40 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm whitespace-nowrap">Bộ Chấm Điểm Nhanh</h3>
                    <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 truncate max-w-[120px] sm:max-w-[200px]" title={activeSpeedGraderAssignment.title}>
                      {activeSpeedGraderAssignment.title}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 truncate">
                    {activeSpeedGraderAssignment.dueDate ? (
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-gray-400 shrink-0" />
                        <span>Hạn nộp: {formatDeadlineDisplay(activeSpeedGraderAssignment.dueDate)}</span>
                      </span>
                    ) : (
                      'Bài tập không giới hạn hạn nộp'
                    )}
                  </p>
                </div>
              </div>

              {/* Navigation Counter & Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-2xs overflow-hidden h-7 sm:h-8">
                  <button
                    type="button"
                    onClick={() => handleNavigateStudent('prev')}
                    disabled={speedGrader.studentIndex <= 0}
                    className="px-2 h-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-gray-600 cursor-pointer transition-colors"
                    title="Học sinh trước (Ctrl+←)"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                    {speedGrader.studentIndex + 1} / {filteredStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNavigateStudent('next')}
                    disabled={speedGrader.studentIndex >= filteredStudents.length - 1}
                    className="px-2 h-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white text-gray-600 cursor-pointer transition-colors"
                    title="Học sinh tiếp theo (Ctrl+→)"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button 
                  onClick={() => setSpeedGrader(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer shrink-0 transition-colors"
                  title="Đóng bộ chấm điểm (ESC)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* SpeedGrader Body (min-h-0 flex-1 overflow-y-auto đảm bảo scroll mượt mà không đẩy ép header/footer) */}
            <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 min-h-0 overscroll-contain">
              {/* Student info bar */}
              <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
                    {activeSpeedGraderStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight truncate" title={activeSpeedGraderStudent.name}>
                      {activeSpeedGraderStudent.name}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-gray-500 truncate" title={activeSpeedGraderStudent.email}>
                      {activeSpeedGraderStudent.email}
                    </p>
                  </div>
                </div>

                {/* Submission Status Badge */}
                <div className="shrink-0 flex sm:justify-end">
                  {activeSpeedGraderGrade?.submissionUrl ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                      isSubmissionLate 
                        ? 'bg-amber-100 text-amber-800 border-amber-300' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      <FileCheck size={13} />
                      <span>{isSubmissionLate ? 'ĐÃ NỘP (NỘP TRỄ)' : 'ĐÃ NỘP ĐÚNG HẠN'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                      <Clock size={13} />
                      <span>CHƯA NỘP BÀI</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Student Submission Card */}
              {activeSpeedGraderGrade?.submissionUrl ? (
                <div className="p-3 sm:p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 sm:space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <FileText size={14} /> Bài làm của học sinh:
                    </span>
                    <a
                      href={activeSpeedGraderGrade.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Mở link bài nộp</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] sm:text-xs font-mono text-indigo-700 break-all select-all">
                    {activeSpeedGraderGrade.submissionUrl}
                  </div>

                  {activeSpeedGraderGrade.submissionNotes && (
                    <div className="text-xs text-gray-700 bg-white/80 p-2 sm:p-2.5 rounded-lg border border-emerald-100 italic">
                      &ldquo;{activeSpeedGraderGrade.submissionNotes}&rdquo;
                    </div>
                  )}

                  {activeSpeedGraderGrade.submittedAt && (
                    <p className="text-[10px] sm:text-[11px] text-gray-500">
                      Thời gian nộp: {new Date(activeSpeedGraderGrade.submittedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>Học sinh này chưa nộp link bài làm. Thầy/cô vẫn có thể chấm điểm trực tiếp nếu học sinh đã nộp bài trên lớp hoặc bài thi giấy.</span>
                </div>
              )}

              {/* Linked Material reference (if any) */}
              {(activeSpeedGraderAssignment.material || activeSpeedGraderAssignment.attachmentUrl) && (
                <div className="p-2.5 sm:p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-indigo-900 min-w-0">
                    <BookOpen size={14} className="text-indigo-600 shrink-0" />
                    <span className="truncate">Tài liệu / Đề bài: <strong className="font-semibold">{activeSpeedGraderAssignment.material?.title || 'Đề bài đính kèm'}</strong></span>
                  </div>
                  <a
                    href={activeSpeedGraderAssignment.material?.url || activeSpeedGraderAssignment.attachmentUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline shrink-0"
                  >
                    <span>Xem đề</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Score & Feedback Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1 sm:pt-2">
                {/* Điểm số */}
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Điểm số (Thang 10) *
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={speedGrader.score}
                    onChange={(e) => setSpeedGrader(prev => ({ ...prev, score: e.target.value }))}
                    className="w-full text-center text-xl sm:text-2xl font-black py-1.5 sm:py-2 px-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white text-gray-900 shadow-inner"
                    placeholder="—"
                    autoFocus
                  />
                  {/* Quick score chips */}
                  <div className="grid grid-cols-7 sm:grid-cols-4 gap-1 mt-1.5 sm:mt-2">
                    {['10', '9', '8', '7', '6', '5', '0'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSpeedGrader(prev => ({ ...prev, score: val }))}
                        className={`py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                          speedGrader.score === val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lời nhận xét */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Lời nhận xét & Góp ý cho học sinh
                  </label>
                  <textarea 
                    rows={3}
                    value={speedGrader.feedback}
                    onChange={(e) => setSpeedGrader(prev => ({ ...prev, feedback: e.target.value }))}
                    className="w-full text-xs p-2.5 sm:p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white resize-none leading-relaxed"
                    placeholder="VD: Làm bài rất tốt, lập luận chặt chẽ... hoặc Cần chú ý lại công thức câu 3..."
                  />
                  {/* Quick feedback phrase chips */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[
                      'Làm bài rất tốt!',
                      'Đúng hạn, lập luận tốt',
                      'Cần trình bày cẩn thận hơn',
                      'Cần bổ sung dẫn chứng'
                    ].map(phrase => (
                      <button
                        key={phrase}
                        type="button"
                        onClick={() => setSpeedGrader(prev => ({
                          ...prev,
                          feedback: prev.feedback ? `${prev.feedback}. ${phrase}` : phrase
                        }))}
                        className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-indigo-100 text-gray-600 border border-gray-200 transition-colors cursor-pointer"
                      >
                        + {phrase}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SpeedGrader Footer (shrink-0 đảm bảo không bao giờ bị co mất trên laptop) */}
            <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                Nhấn <strong>Ctrl + Enter</strong> hoặc bấm nút để lưu & chuyển tiếp
              </span>

              <div className="flex items-center gap-1.5 sm:gap-2 w-full xs:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSpeedGrader(prev => ({ ...prev, isOpen: false }))}
                  className="px-3 sm:px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 cursor-pointer flex-1 xs:flex-initial text-center"
                >
                  Đóng
                </button>

                <button
                  type="button"
                  disabled={speedGrader.isSaving}
                  onClick={() => handleSaveSpeedGrader(false)}
                  className="px-3.5 sm:px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex-1 xs:flex-initial text-center"
                >
                  {speedGrader.isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>

                <button
                  type="button"
                  disabled={speedGrader.isSaving}
                  onClick={() => handleSaveSpeedGrader(true)}
                  className="px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 flex-1 xs:flex-initial text-center whitespace-nowrap"
                >
                  <Check size={14} />
                  <span>{speedGrader.isSaving ? 'Đang lưu...' : 'Lưu & tiếp tục'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
