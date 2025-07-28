# DỰ ÁN HỆ THỐNG QUẢN LÝ SINH VIÊN (2025)

## 📋 Tổng quan
Hệ thống quản lý sinh viên và điểm danh với công nghệ hiện đại, hỗ trợ điểm danh QR code có xác minh GPS và thiết bị.

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + RBAC (Role-Based Access Control)
- **Security**: bcrypt, helmet, express-rate-limit

### Frontend (Upcoming)
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **PWA**: Service Worker + Manifest

## ⚡ Tính năng chính

### 🔐 Xác thực & Bảo mật
- Đăng ký/đăng nhập với xác thực email
- JWT tokens với refresh mechanism
- 2FA với TOTP (Google Authenticator)
- Phân quyền RBAC: Admin, Teacher, Student
- Ràng buộc thiết bị qua deviceId

### 📝 Hệ thống điểm danh
- QR code có thời hạn (3-5 phút)
- Xác minh GPS location (radius control)
- Chống gian lận điểm danh hộ
- Tự động gửi email nhắc nhở

### 👥 Quản lý lớp học
- CRUD classes và enrollments
- Import/Export danh sách từ Excel
- Thống kê điểm danh theo lớp
- Dashboard cho từng vai trò

## 📁 Cấu trúc dự án

```
student-management-system/
├── backend/              # API Server (Node.js + Express)
│   ├── prisma/          # Database schema
│   ├── src/
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, validation, etc.
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Helper functions
│   └── package.json
├── frontend/             # Client App (Next.js)
└── docs/                # Documentation
    ├── api-spec.md      # API documentation
    └── detailed-design/ # Feature specifications
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Git

### Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```

Server sẽ chạy tại: `http://localhost:3001`

### Environment Variables
Copy `.env.example` thành `.env` và cấu hình:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-super-secret-key"
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/verify-email` - Xác thực email

### Attendance
- `POST /api/attendance/create-session` - Tạo buổi điểm danh (Teacher)
- `POST /api/attendance/check-in` - Điểm danh (Student)
- `GET /api/attendance/session/:id` - Thông tin buổi học

### Classes
- `GET /api/classes` - Danh sách lớp học
- `POST /api/classes/:id/import` - Import danh sách từ Excel
- `GET /api/classes/:id/export` - Export báo cáo Excel

## 🔧 Development

### Scripts có sẵn
```bash
npm run dev          # Development server
npm run build        # Build cho production
npm run db:migrate   # Chạy database migrations
npm run db:studio    # Mở Prisma Studio
npm test             # Chạy tests
```

## 📝 Documentation
- [API Specification](docs/api-spec.md)
- [Authentication Design](docs/detailed-design/auth.md)
- [Attendance System](docs/detailed-design/attendance.md)
- [Class Management](docs/detailed-design/class-management.md)

## 🤝 Contributing
1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License
This project is licensed under the ISC License.

---
**Developed with ❤️ by TQD-Tech Team**
