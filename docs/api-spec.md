# 📚 API Specification - student-management-system

## Authentication
### POST /api/auth/register
- Body: `{ name, email, password }`
- Response: `{ token, role }`

### POST /api/auth/login
- Body: `{ email, password }`
- Response: `{ token, role }`

### POST /api/auth/verify-email
- Body: `{ token }`

---

## Attendance
### POST /api/attendance/create-session
- Role: teacher
- Body: `{ classId, startTime, endTime, location, radius }`

### GET /api/attendance/session/:id
- Role: student
- Response: `{ sessionInfo }`

### POST /api/attendance/check-in
- Role: student
- Body: `{ sessionId, deviceId, lat, lng }`

---

## Class & Student
### GET /api/class/:id/students
- Role: teacher
- Response: `[ { id, name, email, status } ]`

### POST /api/class/:id/import
- Upload file Excel

### GET /api/class/:id/export
- Xuất file Excel

---

## Mail
### POST /api/mail/reminder
- Gửi mail nhắc sinh viên trước buổi học

### POST /api/mail/absence-warning
- Gửi mail khi sinh viên nghỉ quá số buổi

---

## Device
### POST /api/device/register
- Lưu deviceId lần đầu đăng nhập

---

## User
### GET /api/me
- Trả về thông tin cá nhân + role
