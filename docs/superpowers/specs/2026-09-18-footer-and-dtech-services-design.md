# Design Specification: Website Footer & DTECH Solutions Agency Banner

- **Date:** 2026-09-18
- **Topic:** System Footer with Clean & Modern Style and DTECH Solutions Agency Spotlight Banner
- **Target Components:** `DashboardLayout.tsx`, `Footer.tsx`, `DTechContactModal.tsx`

---

## 1. Overview & Objectives
Provide a comprehensive, high-aesthetic Footer for the Student Management System (`LIGHTBRAVE.EDU`) and showcase **DTECH Solutions** web development & software services.

Key goals:
1. **System Footer (LIGHTBRAVE.EDU):** Provide institutional branding, copyright notices, operational status indicator (`🟢 All systems operational`), system version, and support channels.
2. **Agency Spotlight Banner (DTECH Solutions):** A tech-agency-styled banner in the footer promoting custom web apps, management software, automated payment integration, and UI/UX design.
3. **Interactive Lead Generation (`DTechContactModal`):** A sleek pop-up dialog allowing visitors and potential clients to submit inquiries, view core service packages, and connect directly via Zalo/Email.
4. **Layout Integration:** Ensure sticky-bottom behavior in `DashboardLayout.tsx` across both Student and Teacher dashboards without content overlap.

---

## 2. Architecture & Component Decomposition

### 2.1 `frontend/src/components/layout/Footer.tsx`
- **Container:** Placed at the bottom of `DashboardLayout.tsx` with top border and responsive padding.
- **Top Section - DTECH Solutions Spotlight Banner:**
  - Modern dark gradient background (`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900`) with subtle glow borders (`border border-indigo-500/30`).
  - Brand header: Lightning icon ⚡ + "DTECH Solutions" with gradient text badge.
  - Value proposition headline & description.
  - 4 feature tags:
    - 💻 Thiết kế Web App & UI/UX theo yêu cầu
    - 🎓 Phần mềm Quản trị Giáo dục & Doanh nghiệp
    - 💳 Tích hợp Thanh toán Tự động (VietQR / VNPay / MoMo)
    - ⚡ Chuẩn SEO, PWA & Tối ưu hiệu năng 24/7
  - Action buttons:
    - Primary CTA: "🚀 Nhận tư vấn thiết kế Web" (triggers `DTechContactModal`).
    - Secondary CTA: "📧 tranquangdung.tech@gmail.com" (copies email to clipboard with toast notification).
- **Bottom Section - LIGHTBRAVE System Bar:**
  - Left: Copyright `© 2026 LIGHTBRAVE.EDU. All rights reserved. • Powered by DTECH Solutions`
  - Center: Status pill with pulsing green indicator (`🟢 Hệ thống hoạt động bình thường • v1.2.0`)
  - Right: Technical support contacts (`support@lightbrave.edu.vn`) & links.

### 2.2 `frontend/src/components/layout/DTechContactModal.tsx`
- Modal dialog with glassmorphism backdrop (`bg-black/60 backdrop-blur-sm`).
- **Header:** Tech agency branding, close button.
- **Content:**
  - Highlights of service strengths: Thời gian bàn giao nhanh, mã nguồn tối ưu chuẩn Next.js/Node.js, cam kết bảo hành và hỗ trợ kỹ thuật lâu dài.
  - Contact Form:
    - Họ & Tên
    - Số điện thoại / Zalo (required)
    - Email liên hệ
    - Dịch vụ quan tâm (Web App quản lý, Website doanh nghiệp / Landing page, Tích hợp cổng thanh toán, Nâng cấp hệ thống có sẵn)
    - Mô tả ý tưởng / nhu cầu dự án
  - Submission handler: Validates fields, saves lead locally or simulates direct submission, shows a polished success confirmation card with direct contact info (`tranquangdung.tech@gmail.com`).

### 2.3 `frontend/src/components/layout/DashboardLayout.tsx`
- Refactor layout hierarchy:
  - Root container: `min-h-screen flex flex-col justify-between bg-gray-50`
  - Navigation bar: top
  - `<main>` container: `flex-1 max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8`
  - `<Footer />`: bottom of layout, passing state trigger to `DTechContactModal`.

---

## 3. UI/UX & Styling Standards
- Follow Tailwind CSS styling already configured in the project.
- Typography using project's Google Font `Lexend_Deca`.
- Lucide React icons for visual clarity (`Sparkles`, `Code2`, `ShieldCheck`, `CreditCard`, `CheckCircle2`, `Mail`, `Phone`, `ExternalLink`, etc.).
- Fully responsive across mobile (stacked cards), tablet, and desktop viewports.

---

## 4. Verification Plan
- Verify compilation with `tsc --noEmit` in `frontend/`.
- Verify responsive layout on mobile and desktop viewports.
- Test modal open, field validation, form submission, and email copy interactions.
