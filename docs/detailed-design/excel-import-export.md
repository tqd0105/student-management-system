# 📤 Thiết kế chi tiết - Xuất/Nhập Excel

## 1. Mục tiêu
Cho phép giáo viên:
- Nhập sinh viên qua file Excel
- Xuất điểm danh sau mỗi buổi học

---

## 2. Quy trình

### 1️⃣ Nhập sinh viên
- Tải file Excel mẫu
- Điền danh sách: `name, email, student_code`
- Upload → backend đọc, kiểm tra lỗi, tạo user mới hoặc gán vào lớp

### 2️⃣ Xuất điểm danh
- Chọn buổi học
- Backend trả về file `.xlsx` gồm:
  - Tên sinh viên
  - MSSV
  - Có điểm danh hay không
  - Thời gian điểm danh

---

## 3. Sử dụng kỹ thuật
- Thư viện: `xlsx`, `exceljs`
- Lưu tạm file server (hoặc buffer trực tiếp)
- Sử dụng stream để tránh nghẽn bộ nhớ

---

## 4. API liên quan
- `POST /api/class/:id/import`
- `GET /api/class/:id/export`
- `GET /api/attendance/:sessionId/export`