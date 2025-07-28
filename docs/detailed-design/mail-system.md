# 📧 Thiết kế chi tiết - Hệ thống email tự động

## 1. Mục tiêu
Gửi email tự động trong các trường hợp:
- Nhắc nhở sinh viên trước giờ học
- Cảnh báo khi nghỉ quá số buổi
- Xác thực email khi đăng ký

---

## 2. Loại email

### 1️⃣ Xác thực tài khoản
- Gửi link chứa mã xác minh khi sinh viên đăng ký

### 2️⃣ Nhắc điểm danh
- Gửi 30 phút trước buổi học
- Gửi đến sinh viên thuộc lớp có lịch học hôm đó

### 3️⃣ Cảnh báo nghỉ quá số buổi
- Nếu số buổi nghỉ vượt ngưỡng cho phép (vd: 3), gửi mail cảnh báo đến sinh viên và giáo viên

---

## 3. Tích hợp kỹ thuật
- Sử dụng `nodemailer`
- Template HTML mail lưu tại `emails/templates`
- Gửi theo lịch định kỳ (cron hoặc scheduler)

---

## 4. Cấu trúc bảng dữ liệu

### email_logs
| Field        | Type      | Description             |
|--------------|-----------|-------------------------|
| id           | UUID      |                         |
| to_email     | String    |                         |
| subject      | String    |                         |
| type         | Enum      | `verify`, `reminder`, `absence_warning` |
| status       | Enum      | `sent`, `failed`        |
| sent_at      | Timestamp |                         |

---

## 5. API liên quan
- `POST /api/mail/verify`
- `POST /api/mail/reminder`
- `POST /api/mail/absence-warning`