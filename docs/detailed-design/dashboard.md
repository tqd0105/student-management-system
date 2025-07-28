# 📊 Thiết kế chi tiết - Dashboard thống kê

## 1. Mục tiêu
Cung cấp giao diện phân tích, thống kê tình hình điểm danh:
- Với sinh viên: xem lớp học cá nhân
- Với giáo viên: tổng quan lớp học đang quản lý

---

## 2. Dashboard sinh viên
- Danh sách lớp đang học
- Tổng số buổi học, số buổi đã điểm danh, số buổi vắng
- Tỷ lệ chuyên cần theo lớp

## 3. Dashboard giáo viên
- Danh sách lớp đang dạy
- Mỗi lớp:
  - Tổng số sinh viên
  - Tỷ lệ chuyên cần trung bình
  - Bảng điểm danh từng buổi học

---

## 4. API gợi ý
- `GET /api/dashboard/student`
- `GET /api/dashboard/teacher`

---

## 5. Giao diện
- Dùng biểu đồ (bar chart, pie chart)
- Thư viện gợi ý: `Recharts`, `Chart.js`
- Responsive: mobile & desktop