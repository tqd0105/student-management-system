'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFileToAwsS3 } from '@/services/fileUpload.service';
import { 
  X, 
  Camera, 
  User as UserIcon, 
  Mail, 
  Shield, 
  Check, 
  AlertCircle, 
  CloudUpload,
  Loader2,
  GraduationCap,
  Lock,
  Info
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatar || null);
      setPreviewUrl(user.avatar || null);
    }
    setStatusMessage(null);
    setUploadProgress(0);
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng ảnh
    if (!file.type.startsWith('image/')) {
      setStatusMessage({ type: 'error', text: 'Vui lòng chọn tệp tin hình ảnh hợp lệ (PNG, JPG, WEBP).' });
      return;
    }

    // Giới hạn 5MB
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Kích thước ảnh tối đa là 5MB.' });
      return;
    }

    try {
      setUploading(true);
      setStatusMessage(null);
      setUploadProgress(10);

      // Xem trước ảnh cục bộ tức thì
      const localPreview = URL.createObjectURL(file); 
      setPreviewUrl(localPreview);

      // Tải trực tiếp lên AWS S3 qua Presigned URL
      const { viewUrl } = await uploadFileToAwsS3(file, `avatar-${user.id}`, (percent) => {
        setUploadProgress(percent);
      });

      setAvatarUrl(viewUrl);
      setPreviewUrl(viewUrl);
      setStatusMessage({ type: 'success', text: 'Đã tải ảnh lên AWS S3 thành công! Nhấn "Lưu thay đổi" để áp dụng.' });
    } catch (err: any) {
      console.error('Lỗi tải avatar lên S3:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Tải ảnh lên S3 thất bại. Vui lòng thử lại.' });
      setPreviewUrl(avatarUrl);
    } finally {
      setUploading(false);
    }
  };

  const isStudent = user.role === 'STUDENT';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStudent && !name.trim()) {
      setStatusMessage({ type: 'error', text: 'Tên hiển thị không được để trống.' });
      return;
    }

    try {
      setSaving(true);
      setStatusMessage(null);

      await updateProfile({
        name: isStudent ? undefined : name.trim(),
        avatar: avatarUrl || undefined,
      });

      setStatusMessage({ type: 'success', text: 'Hồ sơ cá nhân đã được cập nhật thành công!' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Cập nhật thất bại. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const renderRoleBadge = () => {
    switch (user.role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            <Shield className="w-3 h-3" /> Quản trị viên
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
            <GraduationCap className="w-3 h-3" /> Giảng viên
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
            <UserIcon className="w-3 h-3" />  Sinh viên
          </span>
        );
    }
  };

  const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed my-2 inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <UserIcon className="w-5 h-5" /> Hồ sơ cá nhân
            </h2>
            <p className="text-xs text-indigo-100 mt-0.5">Quản lý thông tin tài khoản và ảnh đại diện</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Avatar Section with AWS S3 Upload */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-indigo-100 shadow-md bg-gray-100 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={() => setPreviewUrl(null)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-extrabold">
                    {initials}
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Đổi ảnh</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Quick Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tải lên AWS S3 ({uploadProgress}%)...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Tải ảnh mới</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-gray-400 mt-1">Hỗ trợ PNG, JPG, WEBP (tối đa 5MB) lưu trữ bảo mật trên AWS</p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div 
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Họ và tên hiển thị {isStudent ? '' : <span className="text-red-500">*</span>}
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={e => !isStudent && setName(e.target.value)}
                  disabled={isStudent}
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl text-sm transition-colors ${
                    isStudent
                      ? 'bg-gray-50 border-gray-200 text-gray-600 cursor-not-allowed select-none font-medium'
                      : 'border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900'
                  }`}
                  placeholder="Nhập họ và tên..."
                  required={!isStudent}
                />
                <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
              {isStudent && (
                <p className="text-[11px] text-gray-400 mt-1.5 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>Để đính chính thông tin theo CCCD, vui lòng liên hệ Ban Đào tạo hoặc Quản trị viên.</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email tài khoản
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className='flex items-center justify-between gap-2'>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vai trò hệ thống
                </label>
                <div>{renderRoleBadge()}</div>
              </div>

              {user.studentProfile?.studentCode && (
                <div className='flex items-center justify-between gap-2'>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Mã số sinh viên 
                  </label>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-gray-100 text-indigo-700 rounded-lg border border-gray-200 inline-block">
                    {user.studentProfile.studentCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || uploading}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
