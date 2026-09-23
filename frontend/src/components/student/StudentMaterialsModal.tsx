/**
 * StudentMaterialsModal — Student View
 * Xem tài liệu học tập của một lớp cụ thể
 * Student Management System - DTECH TEAM
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  BookOpen,
  Video,
  FileText,
  Link2,
  Code2,
  Presentation,
  ExternalLink,
  Loader2,
  Search,
  AlertCircle,
  RefreshCw,
  Eye,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Image as ImageIcon,
  Info,
} from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

export type MaterialType = 'video' | 'document' | 'slide' | 'link' | 'github';

export interface Material {
  id: string;
  title: string;
  description: string | null;
  url: string;
  type: MaterialType;
  order: number;
  createdAt: string;
}

const TYPE_META: Record<MaterialType, { label: string; icon: React.ElementType; pill: string; iconColor: string }> = {
  video:    { label: 'Video',    icon: Video,        pill: 'bg-red-50 text-red-700 border-red-200',       iconColor: 'text-red-600 bg-red-50' },
  document: { label: 'Tài liệu', icon: FileText,     pill: 'bg-blue-50 text-blue-700 border-blue-200',    iconColor: 'text-blue-600 bg-blue-50' },
  slide:    { label: 'Slide',    icon: Presentation, pill: 'bg-amber-50 text-amber-700 border-amber-200', iconColor: 'text-amber-600 bg-amber-50' },
  github:   { label: 'GitHub',   icon: Code2,        pill: 'bg-gray-100 text-gray-700 border-gray-200',   iconColor: 'text-gray-700 bg-gray-100' },
  link:     { label: 'Liên kết', icon: Link2,        pill: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconColor: 'text-indigo-600 bg-indigo-50' },
};

export const ensureUrl = (url: string) => {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export const getDomain = (url: string) => {
  try {
    const parsed = new URL(ensureUrl(url));
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

export const getMeta = (type: string) => {
  const normalized = (type || 'link').toLowerCase() as MaterialType;
  return TYPE_META[normalized] || TYPE_META.link;
};

// ── Preview Detectors ────────────────────────────────────────────────────────

export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

export const getGoogleDriveId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const getGoogleDocEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const docMatch = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return `https://docs.google.com/document/d/${docMatch[1]}/preview`;

  const sheetMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview?widget=true&headers=false`;

  const slideMatch = url.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (slideMatch) return `https://docs.google.com/presentation/d/${slideMatch[1]}/embed?start=false&loop=false`;

  return null;
};

export const isImageUrl = (url: string): boolean => {
  return /\.(jpeg|jpg|png|gif|webp|svg)(\?.*)?$/i.test(url);
};

export const isPdfUrl = (url: string): boolean => {
  return /\.pdf(\?.*)?$/i.test(url);
};

type PreviewKind = 'youtube' | 'drive' | 'googledoc' | 'image' | 'pdf' | 'github' | 'web';

export const getPreviewInfo = (url: string, type: MaterialType): { kind: PreviewKind; embedUrl?: string; thumbnailUrl?: string } => {
  const destUrl = ensureUrl(url);

  const ytId = getYouTubeVideoId(destUrl);
  if (ytId) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`,
    };
  }

  const driveId = getGoogleDriveId(destUrl);
  if (driveId) {
    return {
      kind: 'drive',
      embedUrl: `https://drive.google.com/file/d/${driveId}/preview`,
    };
  }

  const googleDocEmbed = getGoogleDocEmbedUrl(destUrl);
  if (googleDocEmbed) {
    return {
      kind: 'googledoc',
      embedUrl: googleDocEmbed,
    };
  }

  if (isImageUrl(destUrl)) {
    return {
      kind: 'image',
      embedUrl: destUrl,
      thumbnailUrl: destUrl,
    };
  }

  if (isPdfUrl(destUrl)) {
    return {
      kind: 'pdf',
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(destUrl)}&embedded=true`,
    };
  }

  if (type === 'github' || /github\.com/i.test(destUrl)) {
    return {
      kind: 'github',
      embedUrl: destUrl,
    };
  }

  return {
    kind: 'web',
    embedUrl: destUrl,
  };
};

// ── Material Thumbnail Component (Unified 80x56px for all types) ───────────

interface MaterialThumbnailProps {
  material: Material;
  meta: (typeof TYPE_META)[MaterialType];
  previewInfo: ReturnType<typeof getPreviewInfo>;
  onClick: () => void;
}

const MaterialThumbnail: React.FC<MaterialThumbnailProps> = ({
  material,
  meta,
  previewInfo,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const Icon = meta.icon;
  const isVideo = previewInfo.kind === 'youtube';

  if (previewInfo.thumbnailUrl && !imgError) {
    return (
      <div
        onClick={onClick}
        className="relative w-20 h-14 rounded-xl overflow-hidden bg-gray-950 shrink-0 cursor-pointer group/thumb shadow-2xs border border-gray-100"
        title="Bấm để xem trước"
      >
        <img
          src={previewInfo.thumbnailUrl}
          alt={material.title}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/25 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-white/90 text-indigo-600 flex items-center justify-center shadow-sm group-hover/thumb:scale-110 transition-transform">
            {isVideo ? <Play className="w-3 h-3 fill-current ml-0.5" /> : <Eye className="w-3 h-3" />}
          </div>
        </div>
      </div>
    );
  }

  // Graphic Cover Card styled by type (exact 80x56px dimensions for zero layout mismatch)
  const coverStyles: Record<MaterialType, { bg: string; text: string; badge: string; badgeBg: string }> = {
    video:    { bg: 'from-rose-500 to-red-600',       text: 'text-white', badge: 'VIDEO', badgeBg: 'bg-white/20 text-white' },
    document: { bg: 'from-blue-500 to-indigo-600',    text: 'text-white', badge: 'DOC',   badgeBg: 'bg-white/20 text-white' },
    slide:    { bg: 'from-amber-500 to-orange-600',   text: 'text-white', badge: 'SLIDE', badgeBg: 'bg-white/20 text-white' },
    github:   { bg: 'from-slate-900 to-gray-800',     text: 'text-emerald-400', badge: 'CODE', badgeBg: 'bg-emerald-500/20 text-emerald-300' },
    link:     { bg: 'from-indigo-500 to-violet-600',  text: 'text-white', badge: 'WEB',   badgeBg: 'bg-white/20 text-white' },
  };

  const style = coverStyles[material.type] ?? coverStyles.link;

  return (
    <div
      onClick={onClick}
      className={`relative w-20 h-14 rounded-xl overflow-hidden bg-gradient-to-br ${style.bg} shrink-0 cursor-pointer group/thumb shadow-2xs flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}
      title="Bấm để xem trước"
    >
      <div className={`p-1.5 rounded-lg ${style.text} group-hover/thumb:scale-110 transition-transform duration-200`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className={`absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8px] font-bold font-mono tracking-wider ${style.badgeBg}`}>
        {style.badge}
      </span>
      {/* Subtle overlay on hover */}
      <div className="absolute inset-0 bg-white/0 group-hover/thumb:bg-white/15 transition-colors flex items-center justify-center opacity-0 group-hover/thumb:opacity-100">
        <div className="w-5 h-5 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow-xs">
          <Eye className="w-2.5 h-2.5" />
        </div>
      </div>
    </div>
  );
};

interface StudentMaterialsModalProps {
  classId: string;
  className: string;
  onClose: () => void;
}

const StudentMaterialsModal: React.FC<StudentMaterialsModalProps> = ({ classId, className, onClose }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activePreview, setActivePreview] = useState<Material | null>(null);

  const fetchMaterials = useCallback(async (isSilent = false) => {
    if (!classId) {
      if (!isSilent) setLoading(false);
      setError('Không tìm thấy thông tin lớp học.');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      if (!isSilent) setLoading(false);
      setError('Vui lòng đăng nhập để xem tài liệu.');
      return;
    }

    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/classes/${classId}/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setMaterials(data.data);
      } else {
        if (!isSilent) setError(data.message || 'Không thể tải danh sách tài liệu.');
      }
    } catch (err: any) {
      console.error('Error fetching materials:', err);
      if (!isSilent) setError(err?.message || 'Lỗi kết nối tới máy chủ.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Tự động đồng bộ khi quay lại tab hoặc có sự kiện cập nhật tài liệu
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

  const filtered = materials.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || m.title.toLowerCase().includes(q) ||
      (m.description ?? '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || (m.type || 'link').toLowerCase() === filterType.toLowerCase();
    return matchSearch && matchType;
  });

  const availableTypes = Array.from(new Set(materials.map((m) => (m.type || 'link').toLowerCase())));

  const activeIndex = activePreview ? filtered.findIndex((m) => m.id === activePreview.id) : -1;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < filtered.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      setActivePreview(filtered[activeIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setActivePreview(filtered[activeIndex + 1]);
    }
  };

  // Active preview info
  const previewInfo = activePreview ? getPreviewInfo(activePreview.url, activePreview.type) : null;
  const activeMeta = activePreview ? getMeta(activePreview.type) : null;
  const activeDestinationUrl = activePreview ? ensureUrl(activePreview.url) : '#';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-10 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transition-all duration-300 ${
          activePreview ? 'max-w-4xl h-[92vh]' : 'max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/80 shrink-0 gap-3">
          {activePreview ? (
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActivePreview(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer shadow-2xs shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Danh sách</span>
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{activePreview.title}</h3>
                  {activeMeta && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border shrink-0 ${activeMeta.pill}`}>
                      <activeMeta.icon className="w-2.5 h-2.5" />
                      {activeMeta.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{getDomain(activePreview.url)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">Tài liệu học tập</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  Lớp: <span className="font-semibold text-indigo-600">{className}</span>
                  {!loading && !error && ` · ${materials.length} tài liệu`}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title="Tải lại danh sách tài liệu mới nhất"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || loading ? 'animate-spin text-indigo-600' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Đang tải...' : 'Tải lại'}</span>
            </button>

            {activePreview && (
              <a
                href={activeDestinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Mở tài liệu trong tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mở tab mới</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content View ────────────────────────────────────────────────── */}
        {activePreview && previewInfo ? (
          /* PREVIEW MODE */
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/5">
            {/* Viewer Stage */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col items-center justify-center">
              {previewInfo.kind === 'youtube' ? (
                <div className="w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-xl bg-black border border-gray-800">
                  <iframe
                    src={previewInfo.embedUrl}
                    title={activePreview.title}
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                </div>
              ) : previewInfo.kind === 'drive' ? (
                <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-200">
                  <iframe
                    src={previewInfo.embedUrl}
                    title={activePreview.title}
                    className="w-full h-full"
                    allow="autoplay"
                  />
                </div>
              ) : previewInfo.kind === 'googledoc' ? (
                <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-200">
                  <iframe
                    src={previewInfo.embedUrl}
                    title={activePreview.title}
                    className="w-full h-full"
                  />
                </div>
              ) : previewInfo.kind === 'image' ? (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <img
                    src={activeDestinationUrl}
                    alt={activePreview.title}
                    className="max-h-[70vh] max-w-full object-contain rounded-2xl shadow-lg border border-gray-200 bg-white"
                  />
                </div>
              ) : previewInfo.kind === 'pdf' ? (
                <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-200">
                  <iframe
                    src={previewInfo.embedUrl}
                    title={activePreview.title}
                    className="w-full h-full"
                  />
                </div>
              ) : previewInfo.kind === 'github' ? (
                <div className="w-full max-w-md my-auto p-6 sm:p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto shadow-md">
                    <Code2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{activePreview.title}</h4>
                    <p className="text-xs text-gray-500 font-mono mt-1 break-all">{activeDestinationUrl}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Mã nguồn GitHub được bảo vệ bởi chính sách bảo mật trang web (X-Frame-Options) nên không hỗ trợ nhúng trực tiếp. Bạn có thể mở dự án trên GitHub để xem toàn bộ code và tài liệu.
                  </p>
                  <a
                    href={activeDestinationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Mở kho lưu trữ trên GitHub</span>
                  </a>
                </div>
              ) : (
                /* Generic Web Embed with fallback banner */
                <div className="w-full h-full flex flex-col">
                  <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-800 gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <Info className="w-4 h-4 shrink-0 text-amber-600" />
                      <span className="truncate">Nếu trang web không hiển thị do chính sách bảo mật, hãy mở tab mới.</span>
                    </div>
                    <a
                      href={activeDestinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0 cursor-pointer"
                    >
                      Mở tab mới
                    </a>
                  </div>
                  <div className="flex-1 min-h-[400px] rounded-2xl overflow-hidden shadow-sm bg-white border border-gray-200">
                    <iframe
                      src={previewInfo.embedUrl}
                      title={activePreview.title}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description & Navigation Footer */}
            <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                {activePreview.description ? (
                  <p className="text-xs text-gray-600 line-clamp-1">{activePreview.description}</p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Không có mô tả chi tiết cho tài liệu này.</p>
                )}
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bài trước</span>
                </button>
                <span className="text-xs text-gray-400 font-medium px-1">
                  {activeIndex + 1} / {filtered.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <span className="hidden sm:inline">Bài tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* LIST MODE */
          <>
            {/* Search + Filter */}
            {!loading && !error && materials.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-2 shrink-0 bg-white">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm kiếm tài liệu, bài giảng..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-gray-50/70"
                  />
                </div>
                {availableTypes.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        filterType === 'all'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      Tất cả
                    </button>
                    {availableTypes.map((t) => {
                      const meta = getMeta(t);
                      const Icon = meta.icon;
                      return (
                        <button
                          key={t}
                          onClick={() => setFilterType(t)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            filterType === t
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs font-medium text-gray-500">Đang tải danh sách tài liệu...</span>
                </div>
              ) : error ? (
                <div className="text-center py-12 px-4 max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle size={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{error}</p>
                  <button
                    onClick={() => fetchMaterials()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Thử lại</span>
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-14 space-y-2">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
                  {materials.length === 0 ? (
                    <>
                      <p className="text-sm font-bold text-gray-700">Chưa có tài liệu nào</p>
                      <p className="text-xs text-gray-400">Giảng viên chưa đăng tải tài liệu học tập cho lớp này.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-700">Không tìm thấy tài liệu phù hợp</p>
                      <p className="text-xs text-gray-400">Không có kết quả nào khớp với &quot;{search}&quot;</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((mat) => {
                    const meta = getMeta(mat.type);
                    const Icon = meta.icon;
                    const destinationUrl = ensureUrl(mat.url);
                    const domain = getDomain(mat.url);
                    const itemPreview = getPreviewInfo(mat.url, mat.type);

                    return (
                      <div
                        key={mat.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 hover:border-indigo-300 hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 group"
                      >
                        {/* Thumbnail / Visual Cover + Details */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <MaterialThumbnail
                            material={mat}
                            meta={meta}
                            previewInfo={itemPreview}
                            onClick={() => setActivePreview(mat)}
                          />

                          <div className="flex-1 min-w-0">
                            <h4
                              onClick={() => setActivePreview(mat)}
                              className="text-sm font-bold text-gray-900 leading-snug hover:text-indigo-600 transition-colors cursor-pointer line-clamp-1"
                            >
                              {mat.title}
                            </h4>

                            {mat.description && (
                              <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{mat.description}</p>
                            )}

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${meta.pill}`}>
                                <Icon className="w-2.5 h-2.5" />
                                {meta.label}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]">
                                {domain}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <button
                            onClick={() => setActivePreview(mat)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
                            title="Xem trước tài liệu"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Xem trước</span>
                          </button>
                          <a
                            href={destinationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors cursor-pointer"
                            title="Mở trong tab mới"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/70 shrink-0 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filtered.length > 0 && `${filtered.length} / ${materials.length} tài liệu`}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentMaterialsModal;

