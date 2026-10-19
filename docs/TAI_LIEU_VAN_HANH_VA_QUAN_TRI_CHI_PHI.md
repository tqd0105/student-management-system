# TÀI LIỆU VẬN HÀNH & QUẢN TRỊ CHI PHÍ DỰ ÁN
## Hệ Thống Quản Lý Sinh Viên (Student Management System - SMS)
*Đơn vị phát triển: DunexSoft | Ngày cập nhật: 13/10/2026 | Nhánh Git: `dev`*

---

## MỤC LỤC
1. [Tổng Quan 4 Giai Đoạn Đã Hoàn Thành](#1-tổng-quan-4-giai-đoạn-đã-hoàn-thành)
2. [Hướng Dẫn Tính Năng In Bảng Điểm Khổ Ngang A4](#2-hướng-dẫn-tính-năng-in-bảng-điểm-khổ-ngang-a4)
3. [Hướng Dẫn Nộp Bài Tập Tải Tệp Lên Đám Mây & Chấm Điểm](#3-hướng-dẫn-nộp-bài-tập-tải-tệp-lên-đám-mây--chấm-điểm)
4. [Cẩm Nang Kiểm Soát Chi Phí AWS Tuyệt Đối $0.00](#4-cẩm-nang-kiểm-soát-chi-phí-aws-tuyệt-đối-000)
5. [Hướng Dẫn Vận Hành Cục Bộ (Local Development)](#5-hướng-dẫn-vận-hành-cục-bộ-local-development)
6. [Quy Trình Quản Trị Git & Triển Khai](#6-quy-trình-quản-trị-git--triển-khai)

---

## 1. TỔNG QUAN 4 GIAI ĐOẠN ĐÃ HOÀN THÀNH

| Bước | Nội dung triển khai | Kết quả nghiệm thu |
| :--- | :--- | :--- |
| **Bước 1** | Chuẩn hóa in Bảng điểm học vụ khổ ngang A4 (Landscape) | Đã chuẩn hóa thang điểm 10 chính thức, bỏ quy đổi thang hệ 4. Bảng điểm giảng viên in tổng hợp điểm sinh viên, tự tính ĐTB cột/lớp và chữ ký 3 bên. |
| **Bước 2** | Kiểm soát chi phí AWS & Ngân sách tự động $1.00 USD | Tạo AWS Budget `SMS-Monthly-Cost-Control` hạn mức $1.00 USD gửi cảnh báo về `dunexsoft@gmail.com` và `tqd0105@gmail.com`. Dừng máy chủ EC2 (`stopped`) để giữ chi phí thực tế ở mức **$0.00**. |
| **Bước 3** | Nâng cấp Nộp bài tập tải tệp trực tiếp lên S3/CloudFront | Học sinh có thể tải file `.zip`, `.rar`, `.pdf`, `.docx` $\le$ 10MB lên S3 Presigned URL và CloudFront CDN. Giảng viên mở xem/tải tệp chấm 1-click trong SpeedGrader. |
| **Bước 4** | Dọn dẹp mã nguồn, kiểm thử toàn diện & bàn giao tài liệu | Pass 100% TypeScript (`tsc --noEmit`), hoàn tất build Next.js thành công 9/9 trang, tài liệu vận hành Tiếng Việt hoàn chỉnh. |

---

## 2. HƯỚNG DẪN TÍNH NĂNG IN BẢNG ĐIỂM KHỔ NGANG A4

### 2.1. Phía Sinh Viên (`StudentGradesModal.tsx`)
- **Mục đích**: Xuất bảng kết quả học tập cá nhân chuẩn học vụ để nộp học bổng, cơ quan hoặc lưu trữ.
- **Thao tác**:
  1. Đăng nhập tài khoản Sinh viên, vào mục **Bảng Điểm**.
  2. Bấm nút **"In bảng điểm"** ở góc trên bên phải.
  3. Cửa sổ in trình duyệt hiển thị bản in học vụ khổ ngang A4:
     - Khung thông tin sinh viên: Mã SV, Họ tên, Lớp học, Ngày in.
     - Khung tổng kết học tập 3 ô cân đối: Tổng tín chỉ, Điểm trung bình tích lũy (Hệ 10), Xếp loại học lực.
     - Bảng chi tiết các môn học (Điểm chuyên cần, Điểm quá trình, Điểm thi kết thúc, Điểm tổng kết hệ 10).
     - Phần chữ ký: Chữ ký của Sinh viên và Xác nhận của Phòng Đào tạo.
  4. Chọn **Lưu dưới dạng PDF** hoặc in trực tiếp ra máy in.

### 2.2. Phía Giảng Viên (`Gradebook.tsx`)
- **Mục đích**: In bảng tổng hợp điểm quá trình và bài tập của **toàn bộ sinh viên trong lớp** phục vụ lưu trữ học vụ của Khoa/Trường.
- **Thao tác**:
  1. Đăng nhập tài khoản Giảng viên, vào mục **Bảng Điểm Lớp**.
  2. Bấm nút **"In bảng điểm"** (biểu tượng máy in).
  3. Hệ thống kích hoạt React Portal độc lập (`#teacher-gradebook-portal-root`):
     - Tiêu đề học vụ: **BẢNG ĐIỂM TỔNG HỢP CỦA SINH VIÊN**.
     - Thông tin lớp học, môn học, giảng viên phụ trách, năm học và ngày in.
     - Bảng ma trận sinh viên - điểm số: Cột STT, Mã SV, Họ và tên sinh viên, các cột điểm bài tập, ĐTB cá nhân, Xếp loại.
     - Dòng tổng kết tự động: Tính **Điểm trung bình của từng bài tập** và **ĐTB toàn lớp**.
     - Khung chữ ký 3 bên trang trọng: Người lập bảng, Giảng viên phụ trách môn học, Trưởng Khoa / Ban Giám Hiệu.

---

## 3. HƯỚNG DẪN NỘP BÀI TẬP TẢI TỆP LÊN ĐÁM MÂY & CHẤM ĐIỂM

### 3.1. Phía Sinh Viên Nộp Bài (`StudentAssignmentsModal.tsx`)
1. Vào tab **Bài tập & Hạn nộp**.
2. Tại bài tập cần nộp, bấm **"Nộp bài ngay"** (hoặc **"Sửa bài nộp"** nếu muốn cập nhật lại).
3. Hộp thoại nộp bài cung cấp 2 chế độ:
   - **Tab "Tải tệp lên" (Khuyên dùng)**:
     - Hỗ trợ các định dạng: `.zip`, `.rar`, `.7z`, `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.png`, `.jpg`.
     - Giới hạn: Tối đa **10 MB** (hệ thống tự kiểm tra và cảnh báo nếu vượt mức).
     - Kéo thả tệp vào khung hoặc bấm để duyệt tệp từ máy tính.
     - Nhập ghi chú cho giảng viên nếu cần (ví dụ: tài khoản demo, thông tin nhóm).
     - Bấm **"Xác nhận nộp bài"** $\rightarrow$ Hệ thống tự động đẩy tệp lên Amazon S3 qua Presigned URL với thanh tiến độ %, sau đó sinh đường dẫn CloudFront CDN.
   - **Tab "Nhập link ngoài"**:
     - Dành cho các đồ án lớn vượt quá 10MB hoặc link Google Drive, GitHub Repository, Figma.
     - Dán đường dẫn và lưu ý mở quyền xem công khai trên Drive.
4. Sau khi nộp, thẻ bài tập hiển thị rõ huy hiệu định dạng (`ZIP`, `PDF`...) kèm nút **"Tải / Xem"** 1-click.

### 3.2. Phía Giảng Viên Chấm Bài (`Gradebook.tsx` - SpeedGrader)
1. Trong màn hình Bảng điểm lớp, tìm ô bài tập của sinh viên có biểu tượng nộp bài hoặc bấm **"Chấm bài"**.
2. Màn hình SpeedGrader hiển thị khung **Bài làm của học sinh**:
   - Nếu học sinh nộp bằng tệp tải lên: Hiển thị nhãn **`Tệp bài làm đính kèm (ZIP/PDF/...)`** kèm nút **"Tải / Mở (ZIP)"**.
   - Giảng viên bấm nút để tải tệp nén hoặc mở trực tiếp tệp PDF trên tab mới.
3. Nhập điểm số (thang 10), nhận xét chi tiết và bấm **"Lưu điểm & Gửi nhận xét"**.

---

## 4. CẨM NANG KIỂM SOÁT CHI PHÍ AWS TUYỆT ĐỐI $0.00

### 4.1. Tại sao tính năng tải tệp S3/CloudFront hoàn toàn $0?
- **Kiến trúc Serverless Presigned URL**: Trình duyệt yêu cầu URL upload dùng một lần từ AWS API Gateway + Lambda, sau đó trình duyệt đẩy tệp nhị phân trực tiếp lên Amazon S3. Dữ liệu **không đi qua server EC2**.
- **Chặn dung lượng nghiêm ngặt $\le$ 10MB**:
  - Hạn ngạch AWS S3 Free Tier: Tặng **5 GB (5.120 MB)** lưu trữ miễn phí và **2.000 lượt PUT** mỗi tháng.
  - Hạn ngạch Amazon CloudFront CDN: Miễn phí vĩnh viễn **1 TB (1.000 GB)** dữ liệu tải về mỗi tháng.
  - Hạn ngạch AWS Lambda: Miễn phí vĩnh viễn **1.000.000 lượt gọi/tháng**.
- Do đó, toàn bộ quy trình upload và tải bài nộp đều nằm trọn vẹn trong hạn ngạch miễn phí $0.00.

### 4.2. Quản lý trạng thái máy chủ EC2 (`i-0bae231b829aba87d`)
- **Trạng thái hiện tại**: Máy chủ EC2 đang ở trạng thái **`stopped`** (ĐÃ DỪNG) $\rightarrow$ **Không phát sinh chi phí tính toán (Compute cost = $0)**.
- **Khi nào cần bật lại EC2?**: Chỉ khi bạn muốn cho người dùng bên ngoài truy cập vào tên miền public (`https://47.129.226.97.sslip.io`). Khi phát triển nội bộ hoặc test trên máy cá nhân, không cần bật EC2.
- **Cách Bật/Tắt trên AWS Console**:
  1. Đăng nhập [AWS Console](https://console.aws.amazon.com/ec2).
  2. Vào mục **Instances** $\rightarrow$ Chọn instance `i-0bae231b829aba87d`.
  3. Chọn **Instance state** $\rightarrow$ Bấm **Start instance** (khi cần dùng) hoặc **Stop instance** (sau khi demo xong để tránh tốn tiền).
- **Cách Bật/Tắt qua dòng lệnh CLI**:
  ```powershell
  # Kiểm tra trạng thái máy chủ
  aws ec2 describe-instances --instance-ids i-0bae231b829aba87d --query "Reservations[0].Instances[0].State.Name" --output text

  # Dừng máy chủ (giữ $0 chi phí)
  aws ec2 stop-instances --instance-ids i-0bae231b829aba87d

  # Bật máy chủ khi cần demo
  aws ec2 start-instances --instance-ids i-0bae231b829aba87d
  ```

### 4.3. Kiểm tra Ngân sách Cảnh báo (AWS Budget Alert $1.00)
- **Tên ngân sách**: `SMS-Monthly-Cost-Control`
- **Hạn mức**: `$1.00 USD / tháng` (đã kích hoạt tính năng trừ Credit khuyến mãi).
- **Trạng thái**: `ActualSpend = $0.00 USD (HEALTHY)`.
- **Cảnh báo tự động**:
  - 80% hạn mức ($0.80): Gửi cảnh báo về email.
  - 100% hạn mức ($1.00): Gửi cảnh báo vượt ngưỡng.
  - Dự báo (Forecasted) chạm 100%: Gửi cảnh báo sớm.
- **Email nhận thông báo**: Đã cấu hình gửi đồng thời tới cả 2 email:
  - `dunexsoft@gmail.com`
  - `tqd0105@gmail.com`

---

## 5. HƯỚNG DẪN VẬN HÀNH CỤC BỘ (LOCAL DEVELOPMENT)

### 5.1. Khởi động hệ thống
Mở PowerShell tại thư mục gốc dự án:
```powershell
# Chạy Backend (Cổng 3001)
pnpm --filter backend dev

# Chạy Frontend (Cổng 3000)
pnpm --filter frontend dev
```

### 5.2. Địa chỉ truy cập
- **Frontend Web**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### 5.3. Danh sách tài khoản thử nghiệm
| Vai trò | Email đăng nhập | Mật khẩu mẫu | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@lightbrave.edu.vn` | `Dungabc123@` | Quản trị tài khoản, lớp học, học phí |
| **Giảng viên (Teacher)** | `tqd0105@gmail.com` | `Dungabc123@` | Quản lý điểm, SpeedGrader, in bảng điểm lớp |
| **Sinh viên (Student 1)** | `dtq287@gmail.com` | `Dungabc123@` | Nộp bài tập tệp S3, xem bảng điểm cá nhân |
| **Sinh viên (Student 2)** | `tranquangdung.tech@gmail.com` | `Dungabc123@` | Nộp bài tập tệp S3, điểm danh |

---

## 6. QUY TRÌNH QUẢN TRỊ GIT & TRIỂN KHAI

### 6.1. Nhánh Git chính
- Nhánh phát triển chính thức: **`dev`**
- Tất cả các tính năng In bảng điểm A4, AWS Budgets và Upload S3/CloudFront đều đã được commit và push an toàn lên repository:
  👉 `https://github.com/tqd0105/student-management-system.git`

### 6.2. Các lệnh Git thường dùng
```powershell
# Kiểm tra nhánh hiện tại
git branch

# Kéo mã nguồn mới nhất về máy
git pull origin dev

# Kiểm tra trạng thái thay đổi
git status

# Commit và đẩy cập nhật mới
git add .
git commit -m "feat: mô tả thay đổi"
git push origin dev
```

---

## 7. HƯỚNG DẪN TÍNH NĂNG THỜI KHÓA BIỂU & LỊCH HỌC / THI / SỰ KIỆN

### 7.1. Tổng quan & Đường dẫn truy cập
- **URL trực tiếp**: `http://localhost:3000/schedule`
- **Truy cập nhanh từ Dashboard**:
  - **Giảng viên**: Bấm nút tím **"Thời khóa biểu"** trên thanh tiêu đề hoặc mở menu **"Quản lý"** -> chọn **"Thời khóa biểu"**.
  - **Sinh viên**: Bấm nút **"Thời khóa biểu"** trong thanh hành động trên trang Dashboard.
  - **Admin**: Đăng nhập và truy cập linh hoạt để giám sát lịch học toàn trường.

### 7.2. Các phân hệ trên giao diện Thời khóa biểu
1. **Thanh điều hướng trên cùng (Header)**:
   - Bộ tab phân loại: `Tất cả`, `Lịch học`, `Lịch thi`, `Sự kiện`.
   - Bộ điều hướng tuần: `<` (Tuần trước), `Hôm nay`, `>` (Tuần sau) và chế độ xem `Tuần`.
   - Nút `+ Thêm ca học` (Dành riêng cho Giảng viên).
2. **Cột thông tin bên trái (Sidebar)**:
   - **Lịch mini tháng**: Xem và chọn nhanh ngày/tuần bất kỳ trong năm.
   - **Bộ lọc checkbox**: Bật/tắt hiển thị từng loại lịch (`Lịch học`, `Lịch thi`, `Sự kiện`, `Hoạt động khác`).
   - **Bảng màu môn học (Subject Legend)**: Hiển thị chấm tròn màu sắc nhận diện từng môn học kèm thanh tìm kiếm 🔍.
3. **Lưới Thời khóa biểu chính (Calendar Grid)**:
   - Khung giờ từ **07:00 đến 18:00**.
   - 7 cột Thứ Hai đến Chủ Nhật kèm ngày thực tế. Cột ngày hôm nay có màu tím làm nổi bật.
   - **Vạch chỉ giờ thực tế (Current Time Line)**: Hiển thị nhãn giờ dạng pill tím và vạch ngang cập nhật theo thời gian thực tế.
   - **Thẻ ca học**: Hiển thị tên môn, giờ học, phòng học, giảng viên phụ trách, dải màu viền trái theo từng môn.
   - Bấm vào thẻ để xem chi tiết đầy đủ hoặc Giảng viên có thể Chỉnh sửa / Xóa lịch.

### 7.3. Tính năng chống xung đột phòng học (Conflict Detection)
- Khi Giảng viên tạo hoặc đổi phòng học sang phòng đã có lớp khác học cùng ngày và cùng khung giờ, hệ thống sẽ tự động phát hiện và cảnh báo HTTP 409:
  > *"Trùng phòng học! Phòng [Tên phòng] đã có lịch [Tên môn] từ [Giờ bắt đầu] đến [Giờ kết thúc]."*

---
*Tài liệu được biên soạn và bảo chứng bởi trợ lý AI Antigravity dành riêng cho dự án Student Management System.*
