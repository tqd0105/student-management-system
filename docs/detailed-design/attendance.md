# 📝 Thiết kế chi tiết - Tính năng điểm danh (Attendance)

## 1. Mục tiêu
Cho phép sinh viên điểm danh qua mã QR trong thời gian cho phép, có xác minh vị trí GPS và thiết bị. Đảm bảo tính bảo mật và tránh gian lận điểm danh hộ.

---

## 2. Quy trình điểm danh

### 1️⃣ Giáo viên tạo buổi học
- Chọn lớp học
- Chọn ngày, giờ bắt đầu - kết thúc
- Hệ thống tạo mã QR duy nhất (UUID, chứa `attendanceSessionId`)
- Thời gian hiệu lực QR: 3 - 5 phút

### 2️⃣ Sinh viên điểm danh
- Quét QR code qua PWA/ứng dụng
- Hệ thống gửi:
  - `attendanceSessionId`
  - `deviceId` (localStorage)
  - Tọa độ GPS hiện tại
  - `studentToken` (JWT)
- Hệ thống kiểm tra:
  - Mã QR còn hiệu lực?
  - Thiết bị đã từng đăng nhập?
  - GPS nằm trong vùng cho phép?
  - Trùng thời gian học?
- Nếu hợp lệ: Ghi nhận điểm danh

---

## 3. Cấu trúc dữ liệu

### attendance_sessions
| Field           | Type        | Description                 |
|----------------|-------------|-----------------------------|
| id             | UUID        | ID buổi học (QR)            |
| teacher_id     | UUID        | Người tạo                   |
| class_id       | UUID        | Lớp học                     |
| start_time     | Timestamp   | Thời gian bắt đầu           |
| end_time       | Timestamp   | Thời gian kết thúc          |
| location_lat   | Float       | Vĩ độ                       |
| location_lng   | Float       | Kinh độ                     |
| radius_meters  | Integer     | Bán kính cho phép (m)       |

### attendance_logs
| Field           | Type        | Description                 |
|----------------|-------------|-----------------------------|
| id             | UUID        | Mỗi lần điểm danh           |
| student_id     | UUID        | Sinh viên                   |
| session_id     | UUID        | Tham chiếu buổi học         |
| device_id      | String      | Mã thiết bị (hash)          |
| checked_at     | Timestamp   | Thời gian điểm danh         |
| status         | Enum        | `present`, `late`, `invalid`|

---

## 4. Các case cần xử lý
- QR hết hạn: thông báo rõ
- GPS nằm ngoài vùng: từ chối
- Dùng thiết bị chưa đăng nhập lần đầu: cảnh báo
- Trùng điểm danh: chỉ ghi nhận lần đầu

---

## 5. API liên quan
- `POST /api/attendance/check-in`
- `GET /api/attendance/session/:id`
- `POST /api/attendance/create-session`
