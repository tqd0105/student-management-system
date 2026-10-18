'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wifi,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Globe,
  Loader2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

export interface NetworkProfile {
  id: string;
  name: string;
  publicIp: string;
  provider?: string | null;
  lastVerifiedAt?: string;
  createdAt?: string;
}

interface NetworkProfileSelectorProps {
  networkProfiles: NetworkProfile[];
  selectedProfileId: string;
  onSelectProfile: (profileId: string) => void;
  enforcementMode: 'OFF' | 'REQUIRED' | 'FLAG_ONLY';
  onChangeEnforcementMode: (mode: 'REQUIRED' | 'FLAG_ONLY') => void;
  detectedIpInfo: { clientIp: string; publicIp?: string; isPrivate?: boolean } | null;
  detectingIp: boolean;
  onRefreshProfiles: () => Promise<void>;
  themeColor?: 'blue' | 'emerald';
}

export default function NetworkProfileSelector({
  networkProfiles,
  selectedProfileId,
  onSelectProfile,
  enforcementMode,
  onChangeEnforcementMode,
  detectedIpInfo,
  detectingIp,
  onRefreshProfiles,
  themeColor = 'blue',
}: NetworkProfileSelectorProps) {
  // Dropdown open/close state
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProfile, setEditingProfile] = useState<NetworkProfile | null>(null);
  const [formName, setFormName] = useState('');
  const [formIp, setFormIp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [profileToDelete, setProfileToDelete] = useState<NetworkProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter network profiles by search term
  const filteredProfiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return networkProfiles;
    return networkProfiles.filter(
      (p) => p.name.toLowerCase().includes(term) || p.publicIp.toLowerCase().includes(term)
    );
  }, [networkProfiles, searchTerm]);

  const selectedProfile = useMemo(() => {
    return networkProfiles.find((p) => p.id === selectedProfileId) || null;
  }, [networkProfiles, selectedProfileId]);

  // Color config based on themeColor
  const colors = useMemo(() => {
    if (themeColor === 'emerald') {
      return {
        icon: 'text-emerald-600',
        ring: 'focus:ring-emerald-500',
        border: 'border-emerald-300',
        bgLight: 'bg-emerald-50',
        textLight: 'text-emerald-700',
        buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        selectedBorder: 'border-emerald-500 bg-emerald-50/40',
      };
    }
    return {
      icon: 'text-blue-600',
      ring: 'focus:ring-blue-500',
      border: 'border-blue-300',
      bgLight: 'bg-blue-50',
      textLight: 'text-blue-700',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      selectedBorder: 'border-blue-500 bg-blue-50/40',
    };
  }, [themeColor]);

  // Handle open Create Modal
  const handleOpenCreateModal = (defaultIp?: string) => {
    setModalMode('create');
    setEditingProfile(null);
    setFormName(defaultIp ? 'Wi-Fi Phòng Học' : '');
    setFormIp(defaultIp || detectedIpInfo?.clientIp || detectedIpInfo?.publicIp || '');
    setModalError(null);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (profile: NetworkProfile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setModalMode('edit');
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormIp(profile.publicIp);
    setModalError(null);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Handle Save (Create or Update)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    const trimmedIp = formIp.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setModalError('Tên mạng phải từ 2 đến 80 ký tự');
      return;
    }
    if (!trimmedIp) {
      setModalError('Vui lòng nhập địa chỉ IP Public');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);
      const token = localStorage.getItem('token');

      if (modalMode === 'create') {
        const res = await fetch(`${API_BASE_URL}/api/teacher/network-profiles`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: trimmedName, publicIp: trimmedIp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể tạo cấu hình mạng');

        await onRefreshProfiles();
        if (data.data?.id) {
          onSelectProfile(data.data.id);
        }
      } else if (modalMode === 'edit' && editingProfile) {
        const res = await fetch(`${API_BASE_URL}/api/teacher/network-profiles/${editingProfile.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: trimmedName, publicIp: trimmedIp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Không thể cập nhật cấu hình mạng');

        await onRefreshProfiles();
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving network profile:', err);
      setModalError(err.message || 'Lỗi lưu thông tin mạng');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/teacher/network-profiles/${profileToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Không thể xóa mạng');
      }

      // If the deleted profile was currently selected, reset it
      if (selectedProfileId === profileToDelete.id) {
        onSelectProfile('');
      }

      await onRefreshProfiles();
      setProfileToDelete(null);
    } catch (err: any) {
      alert(`❌ Lỗi xóa mạng: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2.5 p-3.5 rounded-2xl bg-white border border-gray-200 shadow-2xs">
      {/* Header bar: Title + Current IP Detection */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <Wifi className={`w-4 h-4 ${colors.icon}`} />
          <span>Giới Hạn Mạng Điểm Danh (IP)</span>
        </label>

        <div className="flex items-center gap-1.5">
          {detectingIp ? (
            <span className="text-[11px] text-gray-400 animate-pulse flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Đang dò IP...</span>
            </span>
          ) : detectedIpInfo ? (
            <span
              className="text-[11px] font-mono text-gray-700 bg-gray-50 px-2.5 py-0.5 rounded-lg border border-gray-200 flex items-center gap-1.5 shadow-2xs cursor-default"
              title="Địa chỉ IP mạng thực tế mà thiết bị giảng viên đang kết nối"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>IP hiện tại: <strong>{detectedIpInfo.clientIp}</strong></span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Combobox Trigger & Action Toolbar */}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-800 flex items-center justify-between gap-2 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-offset-1"
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedProfile ? (
                <>
                  <Wifi className={`w-4 h-4 shrink-0 ${colors.icon}`} />
                  <span className="font-bold text-gray-900 truncate">{selectedProfile.name}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 shrink-0">
                    {selectedProfile.publicIp}
                  </span>
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-gray-600">Không giới hạn (Cho phép mọi IP)</span>
                </>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
          </button>

          {/* Quick Action Button for Selected Profile (Edit & Delete) */}
          {selectedProfile && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => handleOpenEditModal(selectedProfile, e)}
                className="p-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                title={`Chỉnh sửa cấu hình mạng "${selectedProfile.name}"`}
                aria-label="Chỉnh sửa mạng"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileToDelete(selectedProfile);
                }}
                className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                title={`Xóa cấu hình mạng "${selectedProfile.name}"`}
                aria-label="Xóa mạng"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Panel with Search & List */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-80">
            {/* Search Input Bar */}
            <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm theo tên mạng hoặc IP..."
                  autoFocus
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List of Network Options */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 p-1">
              {/* Option: Không giới hạn */}
              <button
                type="button"
                onClick={() => {
                  onSelectProfile('');
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  !selectedProfileId
                    ? `${colors.selectedBorder} font-bold text-gray-900`
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Không giới hạn (Cho phép mọi IP)</span>
                </div>
                {!selectedProfileId && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>

              {/* Profiles List */}
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => {
                  const isSelected = profile.id === selectedProfileId;
                  return (
                    <div
                      key={profile.id}
                      onClick={() => {
                        onSelectProfile(profile.id);
                        setIsOpen(false);
                      }}
                      className={`group w-full px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? `${colors.selectedBorder} font-bold text-gray-900`
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <Wifi className={`w-4 h-4 shrink-0 ${isSelected ? colors.icon : 'text-gray-400'}`} />
                        <div className="min-w-0">
                          <p className="truncate text-gray-900 font-semibold">{profile.name}</p>
                          <p className="font-mono text-[11px] text-gray-500">{profile.publicIp}</p>
                        </div>
                      </div>

                      {/* Right actions: Checkmark + Hover Edit/Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 mr-1" />}

                        <button
                          type="button"
                          onClick={(e) => handleOpenEditModal(profile, e)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                          title="Sửa mạng này"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileToDelete(profile);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa mạng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-gray-500">
                  <p>Không tìm thấy mạng nào khớp với từ khóa</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Bạn có thể tạo cấu hình mới ở nút bên dưới</p>
                </div>
              )}
            </div>

            {/* Bottom Actions Toolbar inside Dropdown */}
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(detectedIpInfo?.clientIp || detectedIpInfo?.publicIp)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {/* <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> */}
                <span>Lưu mạng hiện tại ({detectedIpInfo?.clientIp || 'Dò IP'})</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Nhập thủ công IP phòng học khác"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thủ công</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enforcement Mode Selector (Chế độ kiểm tra) */}
      {selectedProfileId && (
        <div className="pt-2 space-y-1.5 border-t border-gray-100 animate-in fade-in duration-150">
          <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
            <span>Chế độ kiểm tra mạng:</span>
          </label>
          <select
            value={enforcementMode}
            onChange={(e) => onChangeEnforcementMode(e.target.value as 'REQUIRED' | 'FLAG_ONLY')}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white font-medium text-gray-800 focus:outline-none focus:ring-2"
          >
            <option value="REQUIRED">[Bắt buộc] Cùng mạng Wi-Fi (Chặn sinh viên khác IP)</option>
            <option value="FLAG_ONLY">[Cảnh báo] Ghi nhận & Đánh dấu (Cho phép nhưng gắn cờ đỏ)</option>
          </select>
          <p className="text-[11px] text-gray-500 leading-normal italic">
            {enforcementMode === 'REQUIRED'
              ? '• Sinh viên dùng mạng 4G/5G hoặc ở ngoài lớp sẽ bị tự động chặn không cho điểm danh.'
              : '• Sinh viên vẫn quét được điểm danh, nhưng hệ thống sẽ gắn cờ cảnh báo trong radar kiểm tra.'}
          </p>
        </div>
      )}

      {/* Modal: Thêm / Sửa Cấu Hình Mạng */}
      {isModalOpen && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${colors.bgLight} ${colors.icon}`}>
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    {modalMode === 'create' ? 'Thêm Cấu Hình Mạng Wi-Fi' : 'Chỉnh Sửa Cấu Hình Mạng'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Quản lý địa chỉ IP công cộng (Public IP) của phòng học
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên gợi nhớ mạng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Wi-Fi Phòng B204, Lab Chuyên Đề..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Địa chỉ Public IP <span className="text-rose-500">*</span>
                  </label>
                  {detectedIpInfo && (
                    <button
                      type="button"
                      onClick={() => setFormIp(detectedIpInfo.clientIp || detectedIpInfo.publicIp || '')}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {/* <Sparkles className="w-3 h-3" /> */}
                      <span>Lấy IP hiện tại ({detectedIpInfo.clientIp})</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formIp}
                  onChange={(e) => setFormIp(e.target.value)}
                  placeholder="Ví dụ: 222.253.43.61 hoặc 14.161.x.x"
                  className="w-full px-3.5 py-2 font-mono border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Đây là địa chỉ IP của router Wi-Fi phòng học mà mọi thiết bị kết nối vào sẽ có chung.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'create' ? 'Tạo cấu hình' : 'Lưu thay đổi'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Xóa Cấu Hình Mạng */}
      {profileToDelete && (
        <div className="fixed inset-0 z-70 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">Xác nhận xóa mạng?</h3>
              <p className="text-xs text-gray-600 mt-1">
                Bạn có chắc muốn xóa cấu hình mạng{' '}
                <strong className="text-gray-900 font-bold">&quot;{profileToDelete.name}&quot;</strong>{' '}
                (IP: <span className="font-mono text-gray-700">{profileToDelete.publicIp}</span>)?
              </p>
              <p className="text-[11px] text-gray-400 mt-2 ">
                *Các buổi học đang chọn mạng này sẽ tự động chuyển về không giới hạn IP.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <span>Xóa mạng</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
