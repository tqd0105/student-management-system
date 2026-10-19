'use client';

import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Code2,
  Database,
  CreditCard,
  LayoutDashboard,
  Wrench,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';

interface FooterProps {
  onOpenContactModal?: () => void;
}

const DUNEXSOFT_SERVICES = [
  {
    icon: LayoutDashboard,
    title: 'Hệ thống Quản lý (SMS / ERP / CRM)',
    desc: 'Quản lý học vụ, điểm danh QR, báo cáo tự động',
  },
  {
    icon: Globe,
    title: 'Website Doanh nghiệp & Landing Page',
    desc: 'Thiết kế chuẩn SEO, tốc độ tải cao, responsive 100%',
  },
  {
    icon: CreditCard,
    title: 'Tích hợp Thanh toán Tự động',
    desc: 'VietQR Webhook, VNPay, MoMo — gạch nợ tức thì 24/7',
  },
  {
    icon: Code2,
    title: 'UI/UX & Phát triển Web App tuỳ chỉnh',
    desc: 'Next.js, Node.js, PostgreSQL theo yêu cầu đặc thù',
  },
  {
    icon: Database,
    title: 'Tối ưu hiệu năng & Bảo mật hệ thống',
    desc: 'Kiểm tra bảo mật, tối ưu DB, CDN & caching',
  },
  {
    icon: Wrench,
    title: 'Bảo trì & Hỗ trợ kỹ thuật lâu dài',
    desc: 'SLA cam kết, hotline kỹ thuật, vá lỗi nhanh',
  },
];

const DUNEXSOFT_HIGHLIGHTS = [
  'Bàn giao đúng tiến độ cam kết',
  'Mã nguồn sạch, có tài liệu kỹ thuật đầy đủ',
  'Bảo hành & hỗ trợ sau bàn giao',
  'Tư vấn miễn phí — Không ràng buộc',
];

export const Footer: React.FC<FooterProps> = ({ onOpenContactModal }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText('dunexsoft@gmail.com');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText('0779461536');
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  return (
    <footer className="w-full bg-white border-t border-gray-200 mt-10">

      {/* ── DUNEXSOFT SOLUTIONS AGENCY SECTION ── */}
      <div className="hidden bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6  ">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-1 h-5 bg-blue-600 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-700">
                  DunexSoft — Software Solutions & Digital Agency
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                Thiết kế Website & Giải pháp Phần mềm Chuyên nghiệp
              </h3>
              <p className="text-sm text-gray-500 max-w-2xl leading-relaxed">
                Từ hệ thống quản lý nội bộ đến website doanh nghiệp — DunexSoft đồng hành cùng bạn ở mọi giai đoạn: <span className="text-gray-700 font-medium">tư vấn, thiết kế, triển khai và bảo trì lâu dài</span>.{' '}
                Sản phẩm được xây dựng trên nền tảng công nghệ hiện đại (<span className="font-medium text-gray-700">Next.js · Node.js · PostgreSQL</span>), tối ưu hiệu suất và dễ dàng mở rộng.
              </p>
            </div>

            {/* Contact Block */}
            <div className="shrink-0 w-full sm:w-72 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Primary CTA */}
              <div className="p-4 pb-3">
                <button
                  type="button"
                  onClick={onOpenContactModal}
                  className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <span>Nhận tư vấn dự án</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                </button>
                <p className="mt-2 text-center text-[11px] text-gray-400">
                  Phản hồi trong vòng <span className="font-semibold text-gray-600">24 giờ làm việc</span>
                </p>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-gray-100" />

              {/* Zalo contact */}
              <div className="p-4 pt-3">
                <a
                  href="https://zalo.me/0779461536"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0068FF] hover:bg-[#0057d9] active:scale-[0.98] text-white text-sm font-medium transition-all"
                >
                  {/* Zalo icon */}
                  <Image src="/icons/zalo.png" alt="Zalo" width={20} height={20} />
                  <div className="flex flex-col leading-tight">
                    <span className="text-xs font-semibold">Chat qua Zalo</span>
                    <span className="text-[11px] text-blue-100">0779 461 536</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-auto shrink-0 text-blue-200" />
                </a>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ── LIGHTBRAVE SYSTEM BAR ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 text-xs text-gray-500">

          {/* Brand & Copyright */}
          <div className="flex flex-col shrink-0 sm:flex-row items-center justify-center md:justify-start gap-2.5 sm:gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src="/images/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <span className="font-bold text-gray-800 text-sm tracking-tight">
                LIGHTBRAVE.EDU
              </span>
            </div>

            <span className="hidden sm:inline text-gray-300">|</span>

            <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs sm:text-sm text-gray-500">
              <span>© 2026. Developed by</span>

              <strong className="text-gray-700 font-semibold">
                DunexSoft
              </strong>

              <span className="text-gray-400 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">
                v1.2.0
              </span>
            </div>
          </div>

          {/* Support & Admin Contact (Responsive across Mobile, Tablet, Desktop) */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
            {/* Phone Hotline / Admin với Call 1 chạm + Nút Copy nhanh */}
            <div className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200/80 shadow-2xs overflow-hidden">
              <a
                href="tel:0779461536"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 font-semibold text-xs transition-colors"
                title="Bấm để gọi hotline Admin: 0779 461 536"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  <span className="font-normal text-emerald-600/80">Hotline:</span> 0779 461 536
                </span>
              </a>

              <button
                type="button"
                onClick={handleCopyPhone}
                className="p-1 px-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 border-l border-emerald-200/60 transition-colors cursor-pointer"
                title="Sao chép số điện thoại"
              >
                {copiedPhone ? (
                  <Check className="w-3 h-3 text-emerald-700" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <span className="hidden sm:inline text-gray-200">|</span>

            {/* Email Support */}
            <a
              href="mailto:dunexsoft@gmail.com"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors text-xs"
              title="Gửi email hỗ trợ kỹ thuật"
            >
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>dunexsoft@gmail.com</span>
            </a>
          </div>

        </div>
      </div>

    </footer>
  );
};

export default Footer;
