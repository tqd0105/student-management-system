# 🏫 Thiết kế chi tiết - Quản lý lớp học

## 1. Mục tiêu
Cho phép admin và giáo viên quản lý thông tin lớp học, sinh viên trong lớp, và lịch học tương ứng.

---

## 2. Quy trình chức năng

### 🧑‍🏫 Giáo viên / admin tạo lớp học
- Điền tên lớp, mã lớp, mô tả
- Chọn giáo viên phụ trách
- Tạo lịch học định kỳ (ví dụ: T2, T4, T6 từ 7h30 - 9h30)

### 🧾 Nhập danh sách sinh viên
- Tải lên file Excel mẫu (có tên, email, MSSV...)
- Hệ thống kiểm tra dữ liệu và import

### 🗓️ Tạo / huỷ lịch học
- Cho phép tạo buổi học cụ thể ngoài lịch cố định
- Huỷ hoặc tạm ngưng buổi học (ghi lý do)

---

## 3. Cấu trúc bảng dữ liệu

### classes
| Field       | Type      | Description              |
|-------------|-----------|--------------------------|
| id          | UUID      |                          |
| name        | String    | Tên lớp học              |
| code        | String    | Mã lớp (unique)          |
| teacher_id  | UUID      | Giáo viên phụ trách      |
| description | Text      | Ghi chú hoặc mô tả       |

### class_students
| Field      | Type    | Description         |
|------------|---------|---------------------|
| id         | UUID    |                     |
| class_id   | UUID    | Tham chiếu lớp học  |
| student_id | UUID    | Tham chiếu sinh viên|

### class_schedules
| Field       | Type      | Description              |
|-------------|-----------|--------------------------|
| id          | UUID      |                          |
| class_id    | UUID      |                          |
| weekday     | Integer   | 0 - Chủ nhật, 6 - Thứ 7  |
| start_time  | Time      |                          |
| end_time    | Time      |                          |