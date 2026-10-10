# Thiết Kế Tích Hợp Tải Tài Liệu Học Tập Lớp Học Với AWS S3 & CloudFront CDN

**Ngày tạo:** 10/10/2026  
**Dự án:** Student Management System  
**Nhánh:** `dev`  
**Trạng thái:** Bản thảo đã duyệt (Design Approved)  

---

## 1. Mục Tiêu & Bối Cảnh
Hiện tại hệ thống đã có tính năng Quản lý Tài liệu Lớp học (`Material`), tuy nhiên chỉ hỗ trợ nhập liên kết ngoài (URL-based như YouTube, Google Drive, GitHub...).
Đồng thời, hệ thống vừa triển khai thành công cụm AWS Serverless File Management gồm:
- **Amazon S3**: Lưu trữ dữ liệu an toàn với SSE-S3 encryption và Origin Access Control (OAC) chặn truy cập trực tiếp từ Internet.
- **Amazon CloudFront CDN**: Phân phối tệp siêu tốc độ, độ trễ thấp thông qua tên miền CDN: `d2qspmj0hh92qq.cloudfront.net`.
- **AWS Lambda + API Gateway**: Cung cấp cơ chế Presigned Upload URL trực tiếp lên S3 và CloudFront Cache Invalidation tự động.

Mục tiêu của thiết kế này là nâng cấp tính năng **Tài liệu học tập của Lớp (Class Materials)** để Giáo viên có thể tải trực tiếp các tệp bài giảng (PDF, Word, Excel, Slide, Ảnh) từ máy tính lên S3, phân phối qua CloudFront CDN, đồng thời bảo vệ 100% tài nguyên nằm trong gói **AWS Free Tier ($0.00)**.

---

## 2. Kiến Trúc Tổng Quan (Architecture & Data Flow)

```
[Giáo viên: Web Browser]
       │
       ├─ (1) Yêu cầu Presigned URL ──> [AWS Lambda / API Gateway]
       │                                         │
       │<─ (2) Trả về Presigned PUT URL ─────────┘
       │
       ├─ (3) PUT file nhị phân trực tiếp ──> [Amazon S3 Bucket (Private)]
       │
       ├─ (4) Lưu thông tin tài liệu ──> [Express Backend (Node.js/Prisma)]
       │      (tiêu đề, url CloudFront,            │
       │       fileKey, fileSize)                  ▼
       │                                  [Supabase PostgreSQL]
       │
[Học sinh: Web Browser]
       │
       └─ (5) Xem/Tải file siêu tốc ──> [Amazon CloudFront CDN Edge]
                                                   │ (Cache miss)
                                                   ▼
                                         [Amazon S3 via OAC]
```

### Luồng Xóa Tài Liệu (Cleanup Flow):
1. Giáo viên bấm Xóa tài liệu trên web.
2. Express Backend nhận yêu cầu xóa, truy vấn `fileKey`.
3. Backend gọi AWS Microservice (`DELETE /files` hoặc xóa S3 Object) và gọi lệnh xóa cache CloudFront (`POST /cdn/invalidate`).
4. Xóa bản ghi trong cơ sở dữ liệu PostgreSQL.

---

## 3. Mô Hình Dữ Liệu (Prisma Schema)

Cập nhật model `Material` trong `backend/prisma/schema.prisma`:

```prisma
model Material {
  id          String       @id @default(cuid())
  classId     String
  title       String
  description String?
  url         String       // Đường dẫn CloudFront CDN hoặc Link ngoài
  type        String       @default("link") // 'document' | 'slide' | 'link' | 'video' | 'github'
  order       Int          @default(0)
  
  // Trường mới bổ sung hỗ trợ quản lý tệp AWS:
  fileKey     String?      // S3 object key (VD: materials/class-123/17909000-lecture.pdf)
  fileSize    Int?         // Kích thước tệp tính theo bytes (VD: 2450000 = 2.45 MB)
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  assignments Assignment[]
  class       Class        @relation(fields: [classId], references: [id], onDelete: Cascade)

  @@map("materials")
}
```

---

## 4. Kiểm Soát Chi Phí & Bảo Mật (Free Tier & Cost Guardrails)

1. **Giới Hạn Dung Lượng Tệp (File Size Limit)**:
   - Nghiêm ngặt **tối đa 10 MB / tệp**.
   - Kiểm tra ngay tại Frontend khi chọn tệp (reject ngay lập tức nếu `file.size > 10 * 1024 * 1024`).
   - Kiểm tra tại tầng Microservice Lambda (Presigned URL request).

2. **Định Dạng Tệp Cho Phép (Allowed File Whitelist)**:
   - **Tài liệu**: PDF (`.pdf`), Word (`.docx`, `.doc`), Excel (`.xlsx`, `.xls`), Slide (`.pptx`, `.ppt`).
   - **Hình ảnh**: PNG (`.png`), JPEG/JPG (`.jpg`, `.jpeg`), WEBP (`.webp`).
   - **Chặn hoàn toàn**: Video định dạng lớn (`.mp4`, `.mov`, `.mkv`), tệp nén (`.zip`, `.rar`), tệp thực thi (`.exe`, `.sh`). Đối với video, giáo viên vẫn sử dụng tính năng dán URL YouTube/Drive như trước (0 byte lưu trữ S3).

3. **Cấu Trúc Khóa S3 (S3 Object Key)**:
   - Định dạng: `materials/{classId}/{timestamp}-{cleanFileName}`
   - Tên tệp được chuẩn hóa bằng regex loại bỏ ký tự đặc biệt, chống path traversal.

---

## 5. Thiết Kế Giao Diện Người Dùng (Frontend UI/UX)

### 5.1. Phía Giáo Viên (`ClassMaterialsPanel.tsx`)
- Form Thêm Tài Liệu có Switch/Tabs:
  - **Tab 1: Tải tệp từ máy**:
    - Khu vực Dropzone kéo thả file trực quan.
    - Tự động hiển thị tên tệp, icon định dạng, dung lượng tệp.
    - Thanh tiến trình tải lên với % trực quan theo thời gian thực.
    - Tự động điền tiêu đề từ tên tệp (người dùng có thể chỉnh sửa lại).
  - **Tab 2: Nhập liên kết ngoài** (YouTube, Drive, GitHub... giữ nguyên tính năng hiện tại).
- Danh sách tài liệu:
  - Hiển thị badge loại tệp và dung lượng (VD: `PDF • 3.2 MB`).
  - Nút Xóa tài liệu: Hiển thị dialog xác nhận cảnh báo tệp trên hệ thống lưu trữ S3 sẽ được xóa hoàn toàn.

### 5.2. Phía Học Sinh (`StudentMaterialsModal.tsx`)
- Hiển thị danh sách tài liệu của lớp với phân loại rõ ràng:
  - Icon màu tương ứng với định dạng: Đỏ (PDF), Xanh lam (Word), Xanh lục (Excel), Vàng cam (Slide), Tím (Ảnh).
  - Kèm nhãn kích thước tệp giúp học sinh nắm được dung lượng trước khi mở/tải.
- **Tính năng Xem trực tiếp (In-browser Preview)**:
  - File PDF & Ảnh: Click xem ngay trong modal hoặc mở tab mới qua CloudFront CDN.
- **Tính năng Tải về (Download)**:
  - Nút tải trực tiếp qua CDN với tên file gốc.

---

## 6. Kế Hoạch Kiểm Thử & Xác Minh (Verification)
1. **Kiểm tra Schema**: Chạy `pnpm prisma db push` trong `backend` và xác nhận cơ sở dữ liệu không lỗi.
2. **Kiểm tra Upload Giáo viên**:
   - Thử upload file PDF 2MB $\rightarrow$ thanh tiến trình chạy mượt $\rightarrow$ tài liệu xuất hiện trong danh sách.
   - Thử chọn file video hoặc file > 10MB $\rightarrow$ thông báo lỗi từ chối ngay lập tức.
3. **Kiểm tra CDN CloudFront**:
   - URL tài liệu có tiền tố `https://d2qspmj0hh92qq.cloudfront.net/materials/...`.
   - Mở tệp trên trình duyệt đảm bảo load nhanh và trả về header `X-Cache: Hit from cloudfront` hoặc `Miss from cloudfront`.
4. **Kiểm tra Phía Học sinh**: Đăng nhập tài khoản học sinh, mở modal tài liệu lớp $\rightarrow$ xem và tải file hoạt động chính xác.
5. **Kiểm tra Luồng Xóa**: Giáo viên xóa tài liệu $\rightarrow$ kiểm tra CloudFront Invalidation được gửi đi thành công.
