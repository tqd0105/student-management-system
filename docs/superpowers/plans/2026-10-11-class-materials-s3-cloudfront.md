# Class Materials S3 & CloudFront Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp tính năng Quản lý Tài liệu Lớp học (`Material`) để Giáo viên có thể upload trực tiếp file PDF, Word, Excel, Slide, Ảnh (<= 10MB) lên AWS S3 và phát qua CloudFront CDN cho Học sinh xem/tải về.

**Architecture:** Frontend lấy presigned URL từ AWS Lambda microservice và đẩy trực tiếp file lên S3 qua PUT request. Sau đó gửi metadata (`title`, `url`, `fileKey`, `fileSize`, `type`) về Express Backend để lưu vào PostgreSQL thông qua Prisma. Học sinh truy cập tệp qua CloudFront CDN. Khi xóa tài liệu, backend dọn dẹp file trên S3 và xóa cache CDN qua microservice.

**Tech Stack:** Next.js 14, React, TypeScript, Express, Prisma ORM, PostgreSQL (Supabase), AWS S3, AWS CloudFront, AWS Lambda, TailwindCSS.

## Global Constraints
- **File size limit:** Tối đa 10 MB mỗi tệp (`10 * 1024 * 1024` bytes).
- **Allowed MIME types:** PDF (`application/pdf`), Word (`.docx`, `.doc`), Excel (`.xlsx`, `.xls`), Slide (`.pptx`, `.ppt`), Images (`png`, `jpg`, `jpeg`, `webp`).
- **Blocked types:** Video (`mp4`, `mov`, `mkv`), file nén (`zip`, `rar`), file thực thi (`exe`).
- **CloudFront domain:** `https://d2qspmj0hh92qq.cloudfront.net`.
- **S3 Key path structure:** `materials/{classId}/{timestamp}-{cleanFileName}`.
- **Free Tier safe:** $0.00 cost limit strictly enforced.

---

### Task 1: Update Prisma Schema & Database Sync

**Files:**
- Modify: `backend/prisma/schema.prisma:209-223`

**Interfaces:**
- Model `Material` adds optional fields:
  ```prisma
  fileKey  String?
  fileSize Int?
  ```

- [ ] **Step 1: Update schema in `backend/prisma/schema.prisma`**
  Thêm `fileKey` và `fileSize` vào model `Material`:
  ```prisma
  model Material {
    id          String       @id @default(cuid())
    classId     String
    title       String
    description String?
    url         String
    type        String       @default("link")
    order       Int          @default(0)
    fileKey     String?
    fileSize    Int?
    createdAt   DateTime     @default(now())
    updatedAt   DateTime     @updatedAt
    assignments Assignment[]
    class       Class        @relation(fields: [classId], references: [id], onDelete: Cascade)

    @@map("materials")
  }
  ```

- [ ] **Step 2: Sync database schema & generate Prisma Client**
  Chạy trong `backend`:
  ```powershell
  pnpm prisma db push
  pnpm prisma generate
  ```
  Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Commit**
  ```bash
  git add backend/prisma/schema.prisma
  git commit -m "feat(backend): add fileKey and fileSize to Material model"
  ```

---

### Task 2: Update Teacher Material Backend Endpoints & Cleanup Logic

**Files:**
- Modify: `backend/src/controllers/teacher.ts:2230-2322`

**Interfaces:**
- Consumes: Prisma `Material` with `fileKey` and `fileSize`.
- Produces:
  - `POST /api/teacher/classes/:classId/materials`: nhận `fileKey` & `fileSize`, lưu DB.
  - `DELETE /api/teacher/materials/:materialId`: nếu có `fileKey`, gọi microservice xóa S3 và purge cache CloudFront, sau đó xóa DB.

- [ ] **Step 1: Update `createMaterial` in `backend/src/controllers/teacher.ts`**
  Trích xuất `fileKey`, `fileSize` từ `req.body` và lưu vào Prisma:
  ```ts
  const { title, url, type, description, order, fileKey, fileSize } = req.body;
  // ...
  const material = await prisma.material.create({
    data: {
      classId,
      title: title.trim(),
      url: url.trim(),
      type: type || 'link',
      description: description?.trim() || null,
      order: order ?? 0,
      fileKey: fileKey || null,
      fileSize: fileSize !== undefined && fileSize !== null ? Number(fileSize) : null,
    },
  });
  ```

- [ ] **Step 2: Update `deleteMaterial` in `backend/src/controllers/teacher.ts` with S3 & CDN cleanup**
  Khi xóa tài liệu, nếu có `fileKey`, gửi yêu cầu xóa file tới AWS Microservice và invalidate CDN:
  ```ts
  if (existing.fileKey) {
    try {
      const awsApiBase = process.env.AWS_FILE_API_URL || 'https://83cxxukww4.execute-api.ap-southeast-1.amazonaws.com';
      // 1. Xóa file trên S3
      await fetch(`${awsApiBase}/files/${encodeURIComponent(existing.fileKey)}`, {
        method: 'DELETE',
      }).catch(err => console.error('Error deleting S3 file:', err));

      // 2. Xóa cache CloudFront
      await fetch(`${awsApiBase}/cdn/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileKey: existing.fileKey }),
      }).catch(err => console.error('Error invalidating CloudFront cache:', err));
    } catch (cleanupErr) {
      console.error('S3/CDN cleanup error:', cleanupErr);
    }
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add backend/src/controllers/teacher.ts
  git commit -m "feat(backend): support file metadata and s3 cleanup in material controller"
  ```

---

### Task 3: Enhance Frontend File Upload Service for Class Materials

**Files:**
- Modify: `frontend/src/services/fileUpload.service.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface ClassMaterialUploadResult {
    fileId: string;
    fileName: string;
    viewUrl: string;
    fileKey: string;
    fileSize: number;
    materialType: 'document' | 'slide' | 'link';
  }
  export function uploadClassMaterialFile(
    file: File,
    classId: string,
    onProgress?: UploadProgressCallback
  ): Promise<ClassMaterialUploadResult>;
  ```

- [ ] **Step 1: Add validation rules & file type detector**
  - Giới hạn 10MB: `10 * 1024 * 1024`.
  - Whitelist: `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.png`, `.jpg`, `.jpeg`, `.webp`.
  - Phân loại `MaterialType`:
    - Slide: `.pptx`, `.ppt` $\rightarrow$ `'slide'`
    - Còn lại: `'document'`

- [ ] **Step 2: Implement `uploadClassMaterialFile`**
  - Kiểm tra dung lượng <= 10MB, nếu vượt ném lỗi rõ ràng.
  - Kiểm tra MIME type / đuôi file theo whitelist.
  - Tạo key S3: `materials/${classId}/${Date.now()}-${cleanName}`.
  - Lấy presigned URL $\rightarrow$ PUT lên S3 $\rightarrow$ trả về kết quả kèm CloudFront URL: `https://d2qspmj0hh92qq.cloudfront.net/${uniqueFileName}`.

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/services/fileUpload.service.ts
  git commit -m "feat(frontend): add uploadClassMaterialFile with 10MB limit and whitelist"
  ```

---

### Task 4: Upgrade Teacher UI with File Upload Dropzone in `ClassMaterialsPanel.tsx`

**Files:**
- Modify: `frontend/src/components/teacher/ClassMaterialsPanel.tsx`

**Interfaces:**
- `Material` interface bổ sung `fileKey?: string | null; fileSize?: number | null`.
- `MaterialForm` hỗ trợ 2 chế độ:
  - `tab = 'upload'`: Drag-and-drop file, tiến trình `%`, tự động điền tiêu đề từ tên file.
  - `tab = 'link'`: Dán URL ngoài (YouTube, Drive...) như cũ.
- Danh sách tài liệu: Hiển thị badge dung lượng (VD: `2.4 MB`) và icon tương ứng.

- [ ] **Step 1: Update `Material` interface & helpers**
  - Thêm `fileKey?: string | null; fileSize?: number | null;` vào interface `Material`.
  - Viết helper `formatFileSize(bytes?: number | null): string`.

- [ ] **Step 2: Add Upload Tab and Dropzone in `MaterialForm`**
  - Có tab selector: "📁 Tải tệp từ máy" vs "🔗 Dán liên kết ngoài".
  - Khu vực chọn file với icon Upload, hiển thị kích thước file, thanh tiến trình loading % khi đang tải.
  - Gọi `uploadClassMaterialFile` khi nhấn Lưu.

- [ ] **Step 3: Display file size badge and download link in material list**
  - Hiển thị badge kích thước file bên cạnh loại tài liệu.
  - Bấm vào tài liệu S3 mở trực tiếp qua CloudFront URL.

- [ ] **Step 4: Commit**
  ```bash
  git add frontend/src/components/teacher/ClassMaterialsPanel.tsx
  git commit -m "feat(teacher): add drag-and-drop file upload to ClassMaterialsPanel"
  ```

---

### Task 5: Upgrade Student UI with Preview & Fast Download in `StudentMaterialsModal.tsx`

**Files:**
- Modify: `frontend/src/components/student/StudentMaterialsModal.tsx`

**Interfaces:**
- `Material` interface bổ sung `fileKey?: string | null; fileSize?: number | null`.
- Hỗ trợ xem trực tiếp PDF và Ảnh ngay trong trình duyệt qua CloudFront CDN.
- Hỗ trợ tải về file Office (Word, Excel, Slide) trực tiếp từ CDN với badge dung lượng hiển thị rõ.

- [ ] **Step 1: Update `Material` interface & helper formatFileSize**
  - Bổ sung `fileKey` và `fileSize`.
  - Hiển thị badge dung lượng (VD: `PDF • 1.8 MB`).

- [ ] **Step 2: Implement Inline Preview & Download Button**
  - Đối với PDF: Mở xem trực tiếp (`target="_blank"` hoặc embed viewer) qua CloudFront CDN.
  - Đối với ảnh: Mở lightbox xem ảnh sắc nét.
  - Đối với Word / Excel / Slide: Nút "Tải về" trực tiếp từ CloudFront CDN.

- [ ] **Step 3: Commit**
  ```bash
  git add frontend/src/components/student/StudentMaterialsModal.tsx
  git commit -m "feat(student): add preview and download for S3 materials in StudentMaterialsModal"
  ```

---

### Task 6: End-to-End Verification & Health Check

- [ ] **Step 1: Verify servers health**
  - Backend: `http://localhost:3001/api/health`
  - Frontend: `http://localhost:3000`
- [ ] **Step 2: Test Teacher Upload Flow**
  - Đăng nhập tài khoản Giáo viên.
  - Chọn lớp học $\rightarrow$ Mở Quản lý Tài liệu $\rightarrow$ Chọn file PDF bài giảng (< 10MB) $\rightarrow$ Tải lên.
  - Kiểm tra file lưu thành công trên S3 & DB, có URL CloudFront.
- [ ] **Step 3: Test Student View Flow**
  - Đăng nhập tài khoản Học sinh thuộc lớp đó.
  - Mở xem tài liệu $\rightarrow$ Kiểm tra hiển thị đúng icon PDF, dung lượng file $\rightarrow$ Click xem/tải về qua CloudFront CDN.
- [ ] **Step 4: Test Delete & Invalidation Flow**
  - Giáo viên xóa tài liệu $\rightarrow$ kiểm tra tệp xóa trên DB và S3/CDN cache được dọn dẹp.
- [ ] **Step 5: Final Git Commit & Summary**
