'use client';

import React, { useState, useEffect } from 'react';
import ApiService from '@/services/ApiService';
import { 
  Users, Search, Filter, Plus, Edit3, X, Check, Phone, 
  Calendar, MapPin, User, BookOpen, AlertCircle, Shield, Award 
} from 'lucide-react';

interface StudentProfile {
  id?: string;
  studentCode?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  status?: string;
  notes?: string | null;
}

interface ManagedStudent {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
  profile: StudentProfile | null;
  enrolledClasses: { id: string; name: string; isActive?: boolean }[];
}

interface ClassItem {
  id: string;
  name: string;
}

interface StudentManagementModalProps {
  onClose: () => void;
  classes: ClassItem[];
  onDataChanged?: () => void;
}

export default function StudentManagementModal({
  onClose,
  classes,
  onDataChanged,
}: StudentManagementModalProps) {
  const [students, setStudents] = useState<ManagedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Sửa hồ sơ học sinh
  const [editingStudent, setEditingStudent] = useState<ManagedStudent | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    studentCode: '',
    phone: '',
    dateOfBirth: '',
    gender: 'MALE',
    address: '',
    parentName: '',
    parentPhone: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Modal Tạo học sinh mới
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: '',
    email: '',
    password: '',
    studentCode: '',
    phone: '',
    gender: 'MALE',
    classId: '',
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [selectedClassId]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getManagedStudents({
        search: search || undefined,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
      });
      if (res.success) {
        setStudents(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách học sinh:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (student: ManagedStudent) => {
    setEditingStudent(student);
    const p = student.profile;
    setProfileForm({
      name: student.name || '',
      studentCode: p?.studentCode || '',
      phone: p?.phone || '',
      dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
      gender: p?.gender || 'MALE',
      address: p?.address || '',
      parentName: p?.parentName || '',
      parentPhone: p?.parentPhone || '',
      status: p?.status || 'ACTIVE',
      notes: p?.notes || '',
    });
  };

  const handleSaveProfile = async () => {
    if (!editingStudent) return;
    setIsSavingProfile(true);
    try {
      const res = await ApiService.updateStudentProfile(editingStudent.id, profileForm);
      if (res.success) {
        alert('Cập nhật hồ sơ học sinh thành công!');
        setEditingStudent(null);
        fetchStudents();
        onDataChanged?.();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể cập nhật'}`);
      }
    } catch (err: any) {
      console.error('Lỗi lưu hồ sơ:', err);
      alert('Lỗi kết nối khi cập nhật hồ sơ');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateStudent = async () => {
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim()) {
      alert('Vui lòng nhập Họ tên và Email của học sinh.');
      return;
    }
    setIsSubmittingNew(true);
    try {
      const res = await ApiService.createQuickStudent(newStudentForm);
      if (res.success) {
        alert(`Tạo học sinh thành công! MSSV được cấp: ${res.data?.studentProfile?.studentCode || 'Đã sinh mã'}`);
        setIsCreatingStudent(false);
        setNewStudentForm({
          name: '',
          email: '',
          password: '',
          studentCode: '',
          phone: '',
          gender: 'MALE',
          classId: '',
        });
        fetchStudents();
        onDataChanged?.();
      } else {
        alert(`Lỗi: ${res.message || 'Không thể tạo học sinh'}`);
      }
    } catch (err) {
      console.error('Lỗi tạo học sinh:', err);
      alert('Lỗi kết nối khi tạo tài khoản học sinh');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Lọc cục bộ theo từ khóa và trạng thái
  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const code = (s.profile?.studentCode || '').toLowerCase();
    const phone = (s.profile?.phone || '').toLowerCase();
    const matchesSearch = 
      s.name.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q) ||
      code.includes(q) ||
      phone.includes(q);

    const matchesStatus = statusFilter === 'ALL' || (s.profile?.status || 'ACTIVE') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'SUSPENDED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Bảo lưu</span>;
      case 'GRADUATED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Tốt nghiệp</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Đang học</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 md:p-5">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate__animated animate__zoomIn animate__faster">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
              <Users size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight truncate">
                Quản Lý Danh Sách Học Sinh
              </h2>
              <p className="text-xs text-blue-100 font-medium truncate">
                Hồ sơ cá nhân, MSSV tự động, thông tin liên hệ và lớp học
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white cursor-pointer shrink-0 ml-2"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar: Search + Filters + Stat */}
        <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, MSSV, SĐT..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-2xs"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {/* Class Filter */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs shadow-2xs">
                <BookOpen size={13} className="text-gray-500 shrink-0" />
                <span className="font-semibold text-gray-600 hidden sm:inline">Lớp:</span>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="bg-transparent outline-none font-medium text-gray-800 cursor-pointer w-full text-xs"
                >
                  <option value="ALL">Tất cả lớp ({classes.length})</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 border border-gray-300 rounded-xl text-xs shadow-2xs">
                <Filter size={13} className="text-gray-500 shrink-0" />
                <span className="font-semibold text-gray-600 hidden sm:inline">Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent outline-none font-medium text-gray-800 cursor-pointer w-full text-xs"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang học</option>
                  <option value="SUSPENDED">Bảo lưu</option>
                  <option value="GRADUATED">Tốt nghiệp</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-0.5">
            <span>Tổng cộng: <strong className="text-gray-800 font-bold">{filteredStudents.length}</strong> sinh viên</span>
            <span className="text-indigo-600 font-medium hidden sm:inline">Quy chuẩn MSSV: <strong>SV{new Date().getFullYear().toString().slice(-2)}XXXX</strong></span>
          </div>
        </div>

        {/* Students List Container */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-xs">Đang tải danh sách học sinh và kiểm tra MSSV...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={44} className="mx-auto mb-2 text-gray-300" />
              <p className="font-bold text-gray-600 text-sm">Không tìm thấy sinh viên nào</p>
              <p className="text-xs text-gray-400 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc lọc theo lớp khác.</p>
            </div>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="block md:hidden space-y-2.5 p-3 bg-gray-50/50">
                {filteredStudents.map((s) => {
                  const mssv = s.profile?.studentCode || '—';
                  const phone = s.profile?.phone || 'Chưa có SĐT';
                  const genderText = s.profile?.gender === 'FEMALE' ? 'Nữ' : s.profile?.gender === 'OTHER' ? 'Khác' : 'Nam';

                  return (
                    <div 
                      key={s.id} 
                      className="bg-white rounded-2xl p-3.5 border border-gray-200/90 shadow-2xs space-y-2.5"
                    >
                      {/* Card Header: Avatar, Name, Email, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-xs sm:text-sm truncate">{s.name}</p>
                            <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {getStatusBadge(s.profile?.status)}
                        </div>
                      </div>

                      {/* Card Meta: MSSV, Gender, Phone */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-200 tracking-wider">
                          {mssv}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md border border-gray-200">
                          {genderText}
                        </span>
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <Phone size={11} className="text-gray-400" />
                          <span>{phone}</span>
                        </span>
                      </div>

                      {/* Card Classes */}
                      {s.enrolledClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {s.enrolledClasses.map(c => (
                            <span key={c.id} className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-200/70">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">Chưa vào lớp nào</p>
                      )}

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-98"
                        >
                          <Edit3 size={13} />
                          <span>Chỉnh sửa hồ sơ</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-gray-600 uppercase bg-gray-100/80 sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">MSSV</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Học Sinh</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Liên Hệ</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Lớp Học</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap text-center">Trạng Thái</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((s) => {
                      const mssv = s.profile?.studentCode || '—';
                      const phone = s.profile?.phone || 'Chưa cập nhật';
                      const genderText = s.profile?.gender === 'FEMALE' ? 'Nữ' : s.profile?.gender === 'OTHER' ? 'Khác' : 'Nam';

                      return (
                        <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                          {/* MSSV Badge */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 tracking-wider shadow-xs">
                              {mssv}
                            </span>
                          </td>

                          {/* Name & Email */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                                <p className="text-xs text-gray-400">{s.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Phone & Gender */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                              <Phone size={12} className="text-gray-400" />
                              {phone}
                            </p>
                            <p className="text-[11px] text-gray-400">Giới tính: {genderText}</p>
                          </td>

                          {/* Enrolled Classes */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {s.enrolledClasses.length > 0 ? (
                                s.enrolledClasses.map(c => (
                                  <span key={c.id} className="whitespace-nowrap text-[11px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium border border-gray-200">
                                    {c.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-300 italic">Chưa vào lớp nào</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {getStatusBadge(s.profile?.status)}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 rounded-lg text-xs font-semibold text-gray-700 shadow-xs transition-colors cursor-pointer"
                            >
                              <Edit3 size={13} /> Sửa hồ sơ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: SỬA HỒ SƠ HỌC SINH */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Chỉnh Sửa Hồ Sơ Học Sinh</h3>
                <p className="text-xs text-gray-500">Tài khoản: {editingStudent.email}</p>
              </div>
              <button 
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              {/* Row 1: Tên & MSSV */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-medium"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mã số học sinh (MSSV) *
                  </label>
                  <input
                    type="text"
                    value={profileForm.studentCode}
                    onChange={e => setProfileForm({ ...profileForm, studentCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-mono font-bold text-indigo-700 bg-indigo-50/50"
                    placeholder="VD: SV260001"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Quy chuẩn tự động: SV{new Date().getFullYear().toString().slice(-2)}XXXX</p>
                </div>
              </div>

              {/* Row 2: SĐT, Ngày sinh, Giới tính */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="0912345678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={e => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giới tính</label>
                  <select
                    value={profileForm.gender}
                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Địa chỉ cư trú */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Địa chỉ cư trú</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành..."
                />
              </div>

              {/* Row 4: Phụ huynh */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ tên Phụ huynh / Người giám hộ</label>
                  <input
                    type="text"
                    value={profileForm.parentName}
                    onChange={e => setProfileForm({ ...profileForm, parentName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                    placeholder="VD: Nguyễn Văn B (Bố)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">SĐT Phụ huynh</label>
                  <input
                    type="text"
                    value={profileForm.parentPhone}
                    onChange={e => setProfileForm({ ...profileForm, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                    placeholder="0987654321"
                  />
                </div>
              </div>

              {/* Row 5: Trạng thái & Ghi chú sư phạm */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Trạng thái học tập</label>
                <select
                  value={profileForm.status}
                  onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                >
                  <option value="ACTIVE">Đang theo học (Active)</option>
                  <option value="SUSPENDED">Bảo lưu / Tạm dừng (Suspended)</option>
                  <option value="GRADUATED">Đã hoàn thành / Tốt nghiệp (Graduated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú của giáo viên</label>
                <textarea
                  rows={3}
                  value={profileForm.notes}
                  onChange={e => setProfileForm({ ...profileForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none"
                  placeholder="Ghi chú về học lực, hạnh kiểm, hoàn cảnh hoặc lưu ý đặc biệt..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu Hồ Sơ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO HỌC SINH MỚI */}
      {isCreatingStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate__animated animate__zoomIn animate__faster">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base">Thêm Tài Khoản Học Sinh Mới</h3>
                <p className="text-xs text-blue-100">MSSV sẽ tự động sinh theo quy chuẩn SV{new Date().getFullYear().toString().slice(-2)}XXXX</p>
              </div>
              <button 
                onClick={() => setIsCreatingStudent(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  value={newStudentForm.name}
                  onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="VD: Trần Văn Nam"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  value={newStudentForm.email}
                  onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="VD: nam.tv@student.edu.vn"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu (Mặc định: 123456)</label>
                  <input
                    type="password"
                    value={newStudentForm.password}
                    onChange={e => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={newStudentForm.phone}
                    onChange={e => setNewStudentForm({ ...newStudentForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                    placeholder="0912..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Thêm ngay vào lớp</label>
                  <select
                    value={newStudentForm.classId}
                    onChange={e => setNewStudentForm({ ...newStudentForm, classId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                  >
                    <option value="">-- Không thêm vào lớp ngay --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giới tính</label>
                  <select
                    value={newStudentForm.gender}
                    onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 text-sm bg-white"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
                <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Mã số học sinh (MSSV) sẽ tự động được cấp phát theo số thứ tự tiếp theo của năm 2026 ngay khi tạo.</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingStudent(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateStudent}
                disabled={isSubmittingNew}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <Check size={16} />
                <span>{isSubmittingNew ? 'Đang tạo...' : 'Tạo Học Sinh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
