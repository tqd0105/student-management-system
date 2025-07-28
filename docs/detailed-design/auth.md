# 🔐 Thiết kế chi tiết - Xác thực & Phân quyền người dùng

## 1. Mục tiêu
Cung cấp cơ chế đăng ký, đăng nhập và xác thực tài khoản với các vai trò: `admin`, `teacher`, `student`. Bảo vệ API và tài nguyên phù hợp với từng vai trò. Hỗ trợ xác thực 2 bước (optional).

---

## 2. Luồng xác thực

### 1️⃣ Đăng ký tài khoản
- Sinh viên hoặc giáo viên đăng ký tại form `/register`
- Gửi email xác thực tài khoản
- Sau khi bấm link xác thực → tài khoản được kích hoạt (`is_verified = true`)
- Lưu `deviceId` nếu là lần đăng nhập đầu

> Với giáo viên và admin, có thể thêm qua giao diện admin thay vì tự đăng ký.

### 2️⃣ Đăng nhập
- Gửi email + password
- Nếu hợp lệ:
  - Sinh JWT (có trường `role`)
  - Trả về user info + token
- Ghi nhận `deviceId` (dùng để kiểm soát thiết bị điểm danh)

### 3️⃣ Xác thực 2 bước (tùy chọn)
- Sau khi đăng nhập, nếu `is_2fa_enabled = true`, yêu cầu nhập mã từ app (Google Authenticator)
- Mã OTP được tạo bằng TOTP (Time-based One-Time Password)

---

## 3. Phân quyền (RBAC)

### Các vai trò:
| Vai trò   | Quyền hạn chính                                                                 |
|-----------|----------------------------------------------------------------------------------|
| admin     | Quản lý toàn bộ hệ thống, thêm giáo viên, lớp học, cài đặt hệ thống             |
| teacher   | Tạo lớp, tạo buổi học, xem thống kê học sinh                                    |
| student   | Xem thông tin lớp học, điểm danh, xem lịch sử điểm danh                         |

### Middleware:
```ts
// middleware/auth.ts

export const requireAuth = (roles: Role[] = []) => {
  return (req, res, next) => {
    const token = getTokenFromHeader(req);
    const payload = verifyToken(token);

    if (!roles.includes(payload.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    req.user = payload;
    next();
  };
};
