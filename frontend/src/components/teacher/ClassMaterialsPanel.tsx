/**
 * ClassMaterialsPanel — Teacher View
 * Quản lý tài liệu học tập theo lớp (URL-based: YouTube, Drive, GitHub, Notion...)
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Video,
  FileText,
  Link2,
  Code2,
  Presentation,
  X,
  Save,
  Loader2,
  AlertCircle,
  GripVertical,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

const API_BASE = API_BASE_URL;

const ensureUrl = (url: string) => {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export type MaterialType = 'video' | 'document' | 'slide' | 'link' | 'github';

export interface Material {
  id: string;
  classId: string;
  title: string;
  description: string | null;
  url: string;
  type: MaterialType;
  order: number;
  createdAt: string;
}

const MATERIAL_TYPES: { value: MaterialType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'video',    label: 'Video',      icon: Video,        color: 'text-red-600 bg-red-50' },
  { value: 'document', label: 'Tài liệu',   icon: FileText,     color: 'text-blue-600 bg-blue-50' },
  { value: 'slide',    label: 'Slide',      icon: Presentation, color: 'text-amber-600 bg-amber-50' },
  { value: 'github',   label: 'GitHub',     icon: Code2,        color: 'text-gray-700 bg-gray-100' },
  { value: 'link',     label: 'Liên kết',   icon: Link2,        color: 'text-indigo-600 bg-indigo-50' },
];

const getMaterialMeta = (type: MaterialType) =>
  MATERIAL_TYPES.find((t) => t.value === type) ?? MATERIAL_TYPES[4];

// ── Form Modal ──────────────────────────────────────────────────────────────

interface MaterialFormProps {
  classId: string;
  token?: string | null;
  initialData?: Material | null;
  onSuccess: () => void;
  onClose: () => void;
}

function MaterialForm({ classId, token, initialData, onSuccess, onClose }: MaterialFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [url, setUrl] = useState(initialData?.url ?? '');
  const [type, setType] = useState<MaterialType>(initialData?.type ?? 'link');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề tài liệu'); return; }
    if (!url.trim()) { setError('Vui lòng nhập URL liên kết'); return; }

    setSaving(true);
    setError('');
    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    try {
      const endpoint = isEdit
        ? `${API_BASE}/api/teacher/materials/${initialData.id}`
        : `${API_BASE}/api/teacher/classes/${classId}/materials`;

      const res = await fetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
        body: JSON.stringify({ title: title.trim(), url: url.trim(), type, description: description.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 text-sm">
              {isEdit ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu mới'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Loại tài liệu</label>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Tiêu đề *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Bài giảng 01 - Giới thiệu JavaScript"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Đường dẫn (URL) *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/... hoặc https://drive.google.com/..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Mô tả ngắn (tuỳ chọn)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nội dung ngắn mô tả tài liệu này..."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Lưu thay đổi' : 'Thêm tài liệu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

interface ClassMaterialsPanelProps {
  classId: string;
  className: string;
  token?: string | null;
}

const ClassMaterialsPanel: React.FC<ClassMaterialsPanelProps> = ({ classId, className, token }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const getActiveToken = () => token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const fetchMaterials = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const activeToken = getActiveToken();
    try {
      const res = await fetch(`${API_BASE}/api/teacher/classes/${classId}/materials`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (data.success) setMaterials(data.data);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [classId, token]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // Tự động đồng bộ khi quay lại tab hoặc khi có sự kiện tài liệu
  useEffect(() => {
    const handleSync = () => {
      fetchMaterials(true);
    };
    const handleFocus = () => {
      fetchMaterials(true);
    };

    window.addEventListener('sms:refresh-materials', handleSync);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('sms:refresh-materials', handleSync);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchMaterials]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMaterials(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    setDeleting(id);
    const activeToken = getActiveToken();
    try {
      await fetch(`${API_BASE}/api/teacher/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sms:refresh-materials'));
      }
    } catch (err) {
      console.error('Error deleting material:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditTarget(null);
    fetchMaterials();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sms:refresh-materials'));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">Tài liệu học tập</h2>
            <p className="text-xs text-gray-500 truncate">{className} · {materials.length} tài liệu</p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-60"
            title="Tải lại danh sách tài liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm tài liệu</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Đang tải tài liệu...</span>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-medium text-gray-500">Chưa có tài liệu nào</p>
            <p className="text-xs text-gray-400">Thêm link YouTube, Google Drive, GitHub hoặc bất kỳ URL nào</p>
          </div>
        ) : (
          <div className="space-y-2">
            {materials.map((mat) => {
              const meta = getMaterialMeta(mat.type as MaterialType);
              const Icon = meta.icon;
              return (
                <div
                  key={mat.id}
                  className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/60 transition-all group"
                >
                  {/* Type icon */}
                  <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{mat.title}</p>
                    {mat.description && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-1">{mat.description}</p>
                    )}
                    <a
                      href={ensureUrl(mat.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-0.5 truncate block max-w-xs sm:max-w-sm"
                    >
                      {mat.url}
                    </a>
                  </div>

                  {/* Actions (visible on mobile touch, hover reveal on sm/desktop) */}
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <a
                      href={ensureUrl(mat.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Mở liên kết"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => { setEditTarget(mat); setShowForm(true); }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(mat.id)}
                      disabled={deleting === mat.id}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                      title="Xóa"
                    >
                      {deleting === mat.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <MaterialForm
          classId={classId}
          token={getActiveToken()}
          initialData={editTarget}
          onSuccess={handleFormSuccess}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
};

export default ClassMaterialsPanel;
