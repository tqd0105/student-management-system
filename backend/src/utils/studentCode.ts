import prisma from '../prisma';

/**
 * Tự động tạo và đảm bảo Mã Số Sinh Viên (MSSV) cho học sinh theo quy luật:
 * Cấu trúc: SV{YY}{XXXX}
 * - SV: Tiền tố Sinh Viên
 * - YY: 2 chữ số cuối của năm hiện tại (Ví dụ: 2026 -> 26)
 * - XXXX: Số thứ tự 4 chữ số tự tăng (Ví dụ: 0001, 0002, 0003...)
 */
export async function generateNextStudentCode(): Promise<string> {
  const yearSuffix = new Date().getFullYear().toString().slice(-2); // "26"
  const prefix = `SV${yearSuffix}`;

  // Tìm hồ sơ có MSSV lớn nhất theo tiền tố năm này
  const latestProfile = await prisma.studentProfile.findFirst({
    where: {
      studentCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      studentCode: 'desc',
    },
  });

  let nextSeq = 1;
  if (latestProfile && latestProfile.studentCode) {
    const seqStr = latestProfile.studentCode.replace(prefix, '');
    const currentSeq = parseInt(seqStr, 10);
    if (!isNaN(currentSeq)) {
      nextSeq = currentSeq + 1;
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

/**
 * Đảm bảo học sinh có StudentProfile và studentCode
 * Được gọi tự động khi:
 * 1. Học sinh đăng nhập (Email/Password hoặc Google)
 * 2. Học sinh gọi API lấy thông tin cá nhân (Profile)
 * 3. Giáo viên xem danh sách học sinh
 */
export async function ensureStudentProfileAndCode(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true },
    });

    if (!user || user.role !== 'STUDENT') {
      return null;
    }

    // Nếu đã có profile và đã có studentCode thì trả về luôn
    if (user.studentProfile && user.studentProfile.studentCode) {
      return user.studentProfile;
    }

    const newCode = await generateNextStudentCode();

    if (user.studentProfile) {
      // Đã có profile nhưng chưa có studentCode
      const updated = await prisma.studentProfile.update({
        where: { userId },
        data: {
          studentCode: newCode,
        },
      });
      return updated;
    } else {
      // Chưa có profile -> Tạo mới kèm studentCode
      const created = await prisma.studentProfile.create({
        data: {
          userId,
          studentCode: newCode,
          status: 'ACTIVE',
        },
      });
      return created;
    }
  } catch (error) {
    console.error(`❌ Error in ensureStudentProfileAndCode for user ${userId}:`, error);
    return null;
  }
}
