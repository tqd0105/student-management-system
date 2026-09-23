/**
 * Teacher Controller
 * Student Management System - DTECH TEAM
 * Quản lý các chức năng dành cho giáo viên
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { UserPayload } from '../types';
import { AuthUtils } from '../utils/auth';
import { ensureStudentProfileAndCode, generateNextStudentCode } from '../utils/studentCode';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Lấy danh sách lớp học của giáo viên
export const getTeacherClasses = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: teacherId
      },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Tạo lớp học mới
export const createClass = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { name, description } = req.body;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!name) {
      return res.status(400).json({ success: false, message: 'Class name is required' });
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        teacherId
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully'
    });
  } catch (error) {
    console.error('Error creating class:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cập nhật thông tin lớp học
export const updateClass = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const { name, description } = req.body;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra giáo viên có quyền chỉnh sửa lớp này không
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    if (!existingClass) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully'
    });
  } catch (error) {
    console.error('Error updating class:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Xóa lớp học
export const deleteClass = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra giáo viên có quyền xóa lớp này không
    const existingClass = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    if (!existingClass) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    // Xóa cascade các records liên quan trước khi xóa class
    await prisma.$transaction(async (tx) => {
      // Lấy tất cả attendance sessions của class này
      const sessions = await tx.attendanceSession.findMany({
        where: { classId: classId },
        select: { id: true }
      });

      // Xóa attendance logs của các sessions này
      if (sessions.length > 0) {
        await tx.attendanceLog.deleteMany({
          where: {
            sessionId: {
              in: sessions.map(s => s.id)
            }
          }
        });
      }

      // Xóa attendance sessions
      await tx.attendanceSession.deleteMany({
        where: { classId: classId }
      });

      // Xóa class enrollments
      await tx.classEnrollment.deleteMany({
        where: { classId: classId }
      });

      // Cuối cùng xóa class
      await tx.class.delete({
        where: { id: classId }
      });
    });

    return res.json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Tạo buổi học mới
export const createAttendanceSession = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    console.log('=== CREATE ATTENDANCE SESSION DEBUG ===');
    console.log('Request user:', req.user);
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const { title } = req.body;

    console.log('Teacher ID:', teacherId);
    console.log('Class ID:', classId);
    console.log('Title:', title);

    if (!teacherId) {
      console.log('❌ Unauthorized - no teacher ID');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra giáo viên có quyền tạo buổi học cho lớp này không
    console.log('🔍 Checking class ownership...');
    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    console.log('Class info found:', classInfo);

    if (!classInfo) {
      console.log('❌ Class not found or access denied');
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    console.log('✅ Creating session...');
    const session = await prisma.attendanceSession.create({
      data: {
        teacherId: teacherId,
        classId,
        title: title || `Session ${new Date().toLocaleDateString('vi-VN')}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        qrCode: null, // No QR initially
        qrExpiresAt: null,
        isActive: false // Inactive until QR is generated
      }
    });

    console.log('✅ Session created successfully:', session);

    return res.status(201).json({
      success: true,
      data: session,
      message: 'Attendance session created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating attendance session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Tạo QR code cho buổi học
export const generateQRCode = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    console.log('=== GENERATE QR CODE DEBUG ===');
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;
    
    console.log('Teacher ID:', teacherId);
    console.log('Session ID:', sessionId);

    if (!teacherId) {
      console.log('❌ Unauthorized - no teacher ID');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    console.log('🔍 Finding session...');
    // Kiểm tra quyền truy cập
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      },
      include: {
        class: true
      }
    });

    console.log('Session found:', session ? 'YES' : 'NO');
    console.log('Session details:', session);

    if (!session) {
      console.log('❌ Session not found or access denied');
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    console.log('🔄 Creating QR code...');
    // Tạo QR code mới
    const qrCode = uuidv4();
    const qrExpiresAt = new Date();
    qrExpiresAt.setMinutes(qrExpiresAt.getMinutes() + 5); // 5 phút

    console.log('Generated QR Code:', qrCode);
    console.log('QR Expires At:', qrExpiresAt);

    // Cập nhật session với QR code mới
    const updatedSession = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        qrCode,
        qrExpiresAt,
        isActive: true
      }
    });

    console.log('✅ Session updated:', updatedSession);

    // Tạo QR code image
    const qrData = JSON.stringify({
      sessionId,
      qrCode,
      classId: session.classId,
      timestamp: Date.now()
    });

    console.log('🎨 Generating QR image with data:', qrData);
    const qrImageUrl = await QRCode.toDataURL(qrData);
    console.log('✅ QR Image generated, length:', qrImageUrl.length);

    const responseData = {
      sessionId,
      qrCode,
      qrImageUrl,
      expiresAt: qrExpiresAt,
      sessionInfo: {
        id: session.id,
        title: session.title,
        className: session.class.name
      }
    };

    console.log('📤 Sending response data:', responseData);

    return res.json({
      success: true,
      data: responseData,
      message: 'QR code generated successfully'
    });
  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy danh sách buổi học của lớp
export const getClassSessions = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập
    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    if (!classInfo) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: { classId },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error getting class sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Dừng/Tạm dừng QR code session
export const endAttendanceSession = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Tạm dừng session (không xóa QR, chỉ set isActive = false)
    const updatedSession = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        // Giữ lại qrCode và qrExpiresAt để có thể resume
      }
    });

    return res.json({
      success: true,
      data: updatedSession,
      message: 'Session paused successfully'
    });
  } catch (error) {
    console.error('Error ending attendance session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Tiếp tục QR code session
export const resumeSession = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập session
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Nếu chưa có QR code hoặc đã hết hạn, tạo mới
    let updateData: any = {
      isActive: true
    };

    const now = new Date();
    if (!session.qrCode || !session.qrExpiresAt || session.qrExpiresAt < now) {
      // Tạo QR code mới
      const uniqueQRData = uuidv4();
      const qrCodeBase64 = await QRCode.toDataURL(uniqueQRData);
      const base64Data = qrCodeBase64.replace(/^data:image\/png;base64,/, '');
      
      updateData.qrCode = base64Data;
      updateData.qrExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
    }

    const updatedSession = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: updateData
    });

    return res.json({
      success: true,
      data: updatedSession,
      message: 'Session resumed successfully'
    });
  } catch (error) {
    console.error('Error resuming session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy tất cả sinh viên trong hệ thống (để giáo viên tìm và thêm vào lớp)
export const getAllStudents = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { search, classId } = req.query;

    // Tìm kiếm theo tên hoặc email
    const whereClause: any = { role: 'STUDENT' };
    if (search && typeof search === 'string' && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const students = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        studentEnrollments: {
          select: {
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                teacherId: true,
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      take: 100, // Giới hạn 100 SV mỗi lần tìm
    });

    // Đánh dấu SV đã vào lớp nào của giáo viên này
    const studentsWithStatus = students.map(s => {
      const myClassEnrollments = s.studentEnrollments.filter(
        e => e.class.teacherId === teacherId
      );
      const isInTargetClass = classId
        ? s.studentEnrollments.some(e => e.classId === classId)
        : false;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        avatar: s.avatar,
        createdAt: s.createdAt,
        enrolledClasses: myClassEnrollments.map(e => ({
          id: e.class.id,
          name: e.class.name,
        })),
        isInTargetClass,
      };
    });

    return res.json({
      success: true,
      data: studentsWithStatus,
      total: studentsWithStatus.length,
    });
  } catch (error) {
    console.error('Error getting all students:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Lấy danh sách sinh viên trong một lớp cụ thể (kèm thống kê điểm danh)
export const getClassStudents = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra lớp thuộc giáo viên này
    const classInfo = await prisma.class.findFirst({
      where: { id: classId, teacherId }
    });

    if (!classInfo) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            createdAt: true,
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    // Lấy tổng số session của lớp để tính tỷ lệ điểm danh
    const totalSessions = await prisma.attendanceSession.count({
      where: { classId }
    });

    // Lấy attendance logs cho từng sinh viên trong lớp này
    const studentIds = enrollments.map(e => e.student.id);
    const attendanceLogs = await prisma.attendanceLog.findMany({
      where: {
        studentId: { in: studentIds },
        session: { is: { classId } }
      },
      select: { studentId: true, status: true }
    });

    // Tổng hợp dữ liệu
    const studentsData = enrollments.map(e => {
      const logs = attendanceLogs.filter(l => l.studentId === e.student.id);
      const present = logs.filter(l => l.status === 'PRESENT').length;
      const late = logs.filter(l => l.status === 'LATE').length;
      return {
        ...e.student,
        enrolledAt: e.enrolledAt,
        attendanceStats: {
          totalSessions,
          attended: present + late,
          present,
          late,
          absent: totalSessions - present - late,
          rate: totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 0,
        }
      };
    });

    return res.json({
      success: true,
      data: studentsData,
      class: { id: classInfo.id, name: classInfo.name },
    });
  } catch (error) {
    console.error('Error getting class students:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Thêm sinh viên vào lớp
export const addStudentToClass = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const { studentEmail } = req.body;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập lớp
    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    if (!classInfo) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    // Tìm sinh viên
    const student = await prisma.user.findFirst({
      where: {
        email: studentEmail,
        role: 'STUDENT'
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Kiểm tra xem sinh viên đã đăng ký lớp chưa
    const existingEnrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId,
        studentId: student.id
      }
    });

    if (existingEnrollment) {
      return res.status(400).json({ success: false, message: 'Student already enrolled in this class' });
    }

    // Thêm sinh viên vào lớp
    const enrollment = await prisma.classEnrollment.create({
      data: {
        classId,
        studentId: student.id
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      data: enrollment,
      message: 'Student added to class successfully'
    });
  } catch (error) {
    console.error('Error adding student to class:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Xóa sinh viên khỏi lớp
export const removeStudentFromClass = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId, studentId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập lớp
    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      }
    });

    if (!classInfo) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    // Xóa đăng ký
    const deletedEnrollment = await prisma.classEnrollment.deleteMany({
      where: {
        classId,
        studentId
      }
    });

    if (deletedEnrollment.count === 0) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    return res.json({
      success: true,
      message: 'Student removed from class successfully'
    });
  } catch (error) {
    console.error('Error removing student from class:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Xóa QR code session
export const deleteSession = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập session
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Xóa attendance records trước khi xóa session
    console.log('🗑️ Deleting attendance records for session:', sessionId);
    await prisma.attendanceLog.deleteMany({
      where: { sessionId: sessionId }
    });

    // Xóa session hoàn toàn
    console.log('🗑️ Deleting session:', sessionId);
    await prisma.attendanceSession.delete({
      where: { id: sessionId }
    });

    return res.json({
      success: true,
      message: 'Session and all attendance records deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cập nhật thông tin session (tên và thời gian)
export const updateSession = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;
    const { title, startTime } = req.body;

    console.log('🔄 UPDATE SESSION DEBUG:');
    console.log('Teacher ID:', teacherId);
    console.log('Session ID:', sessionId);
    console.log('Request body:', { title, startTime });

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập session
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      }
    });

    console.log('Session found:', session ? 'YES' : 'NO');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Cập nhật session
    const updateData: any = {};
    if (title) updateData.title = title;
    if (startTime) {
      const newStartTime = new Date(startTime);
      updateData.startTime = newStartTime;
      // Also update endTime to be 2 hours after startTime
      updateData.endTime = new Date(newStartTime.getTime() + 2 * 60 * 60 * 1000);
    }
    
    console.log('Update data:', updateData);

    const updatedSession = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: updateData
    });

    console.log('✅ Session updated successfully');

    return res.json({
      success: true,
      data: updatedSession,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating session:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Xóa QR code khỏi session (không xóa session)
export const deleteQRCode = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập session
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        class: {
          teacherId: teacherId
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Xóa QR code và set isActive = false
    const updatedSession = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        qrCode: null,
        qrExpiresAt: null,
        isActive: false
      }
    });

    return res.json({
      success: true,
      data: updatedSession,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy thống kê chi tiết cho một session
export const getSessionAttendanceStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập session
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { teacherId: teacherId },
          { class: { teacherId: teacherId } }
        ]
      },
      include: {
        class: {
          include: {
            enrollments: {
              include: {
                student: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found or access denied' });
    }

    // Lấy attendance records cho session này
    const attendanceRecords = await prisma.attendanceLog.findMany({
      where: { sessionId: sessionId },
      include: {
        student: true
      },
      orderBy: {
        checkedAt: 'asc'
      }
    });

    // Tạo danh sách tất cả sinh viên trong lớp
    const allStudents = session.class.enrollments.map(enrollment => enrollment.student);
    
    // Tạo thống kê chi tiết
    const attendanceStats = allStudents.map(student => {
      const attendanceRecord = attendanceRecords.find(record => record.studentId === student.id);
      
      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        status: attendanceRecord ? attendanceRecord.status : 'ABSENT',
        hasRecord: !!attendanceRecord,
        checkinTime: attendanceRecord?.checkedAt || null,
        timeFromStart: attendanceRecord && attendanceRecord.checkedAt ? 
          Math.floor((attendanceRecord.checkedAt.getTime() - session.startTime.getTime()) / 1000 / 60) : null
      };
    });

    const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'LATE').length;

    const stats = {
      sessionInfo: {
        id: session.id,
        title: session.title,
        className: session.class.name,
        startTime: session.startTime,
        endTime: session.endTime,
        isActive: session.isActive
      },
      totalStudents: allStudents.length,
      presentStudents: presentCount,
      lateStudents: lateCount,
      absentStudents: allStudents.length - presentCount - lateCount,
      attendanceRate: allStudents.length > 0 ? ((presentCount + lateCount) / allStudents.length * 100).toFixed(1) : 0,
      attendanceDetails: attendanceStats,
      logs: attendanceRecords
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting session attendance stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy thống kê tổng hợp cho cả class
export const getClassAttendanceStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Kiểm tra quyền truy cập class
    const classInfo = await prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: teacherId
      },
      include: {
        enrollments: {
          include: {
            student: true
          }
        },
        attendanceSessions: {
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    if (!classInfo) {
      return res.status(404).json({ success: false, message: 'Class not found or access denied' });
    }

    // Lấy tất cả attendance records cho class này
    const allAttendanceRecords = await prisma.attendanceLog.findMany({
      where: {
        session: {
          classId: classId
        }
      },
      include: {
        student: true,
        session: true
      }
    });

    // Tạo thống kê cho từng sinh viên
    const studentStats = classInfo.enrollments.map(enrollment => {
      const student = enrollment.student;
      const studentAttendance = allAttendanceRecords.filter(record => record.studentId === student.id);
      const presentCount = studentAttendance.filter(r => r.status === 'PRESENT').length;
      const lateCount = studentAttendance.filter(r => r.status === 'LATE').length;
      
      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        totalSessions: classInfo.attendanceSessions.length,
        presentSessions: presentCount,
        lateSessions: lateCount,
        absentSessions: classInfo.attendanceSessions.length - presentCount - lateCount,
        attendanceRate: classInfo.attendanceSessions.length > 0 ? 
          ((presentCount + lateCount) / classInfo.attendanceSessions.length * 100).toFixed(1) : 0,
        lastAttendance: studentAttendance.length > 0 ? 
          studentAttendance.sort((a, b) => (b.checkedAt?.getTime() || 0) - (a.checkedAt?.getTime() || 0))[0].checkedAt : null
      };
    });

    // Tạo thống kê cho từng session
    const sessionStats = classInfo.attendanceSessions.map(session => {
      const sessionAttendance = allAttendanceRecords.filter(record => record.sessionId === session.id);
      const presentCount = sessionAttendance.filter(r => r.status === 'PRESENT').length;
      const lateCount = sessionAttendance.filter(r => r.status === 'LATE').length;
      
      return {
        sessionId: session.id,
        sessionTitle: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        isActive: session.isActive,
        totalStudents: classInfo.enrollments.length,
        presentStudents: presentCount,
        lateStudents: lateCount,
        absentStudents: classInfo.enrollments.length - presentCount - lateCount,
        attendanceRate: classInfo.enrollments.length > 0 ? 
          ((presentCount + lateCount) / classInfo.enrollments.length * 100).toFixed(1) : 0
      };
    });

    const totalRecords = allAttendanceRecords.length;
    const maxPossibleRecords = classInfo.attendanceSessions.length * classInfo.enrollments.length;

    const overallStats = {
      classInfo: {
        id: classInfo.id,
        name: classInfo.name,
        description: classInfo.description
      },
      totalStudents: classInfo.enrollments.length,
      totalSessions: classInfo.attendanceSessions.length,
      totalAttendanceRecords: totalRecords,
      averageAttendanceRate: maxPossibleRecords > 0 ? 
        (totalRecords / maxPossibleRecords * 100).toFixed(1) : 0,
      studentStats,
      sessionStats
    };

    return res.json({
      success: true,
      data: overallStats
    });
  } catch (error) {
    console.error('Error getting class attendance stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// --- MANUAL ATTENDANCE ---
export const manualAttendance = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { sessionId } = req.params;
    const { studentId, status } = req.body; // status: 'PRESENT', 'LATE', 'ABSENT'

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Validate session ownership
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        OR: [
          { teacherId },
          { class: { teacherId } }
        ]
      }
    });

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Validate student is in class
    const enrollment = await prisma.classEnrollment.findFirst({
      where: { classId: session.classId, studentId }
    });

    if (!enrollment) return res.status(400).json({ success: false, message: 'Student not in this class' });

    const validStatuses = ['PRESENT', 'LATE', 'ABSENT'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const log = await prisma.attendanceLog.upsert({
      where: {
        studentId_sessionId: {
          studentId,
          sessionId
        }
      },
      update: {
        status: status as any,
        deviceId: 'MANUAL_TEACHER',
        checkedAt: new Date()
      },
      create: {
        studentId,
        sessionId,
        status: status as any,
        deviceId: 'MANUAL_TEACHER'
      }
    });

    return res.json({ success: true, data: log, message: 'Attendance updated manually' });
  } catch (error) {
    console.error('Error manual attendance:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// --- GRADEBOOK & ASSIGNMENTS ---

export const getClassAssignments = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classInfo = await prisma.class.findFirst({ where: { id: classId, teacherId }});
    if (!classInfo) return res.status(404).json({ success: false, message: 'Class not found' });

    const assignments = await prisma.assignment.findMany({
      where: { classId },
      include: {
        material: {
          select: { id: true, title: true, url: true, type: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: assignments });
  } catch (error) {
    console.error('Error getting assignments:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createAssignment = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const { title, description, dueDate, attachmentUrl, materialId } = req.body;

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classInfo = await prisma.class.findFirst({ where: { id: classId, teacherId }});
    if (!classInfo) return res.status(404).json({ success: false, message: 'Class not found' });

    const assignment = await prisma.assignment.create({
      data: {
        classId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        attachmentUrl: attachmentUrl?.trim() || null,
        materialId: materialId || null
      },
      include: {
        material: {
          select: { id: true, title: true, url: true, type: true }
        }
      }
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAssignment = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { assignmentId } = req.params;
    const { title, description, dueDate, attachmentUrl, materialId } = req.body;

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: true }
    });

    if (!assignment || assignment.class.teacherId !== teacherId) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const updated = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        ...(attachmentUrl !== undefined && { attachmentUrl: attachmentUrl?.trim() || null }),
        ...(materialId !== undefined && { materialId: materialId || null })
      },
      include: {
        material: {
          select: { id: true, title: true, url: true, type: true }
        }
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteAssignment = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { assignmentId } = req.params;

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: true }
    });

    if (!assignment || assignment.class.teacherId !== teacherId) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    await prisma.assignment.delete({
      where: { id: assignmentId }
    });

    return res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getClassGrades = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classInfo = await prisma.class.findFirst({ where: { id: classId, teacherId }});
    if (!classInfo) return res.status(404).json({ success: false, message: 'Class not found' });

    const grades = await prisma.grade.findMany({
      where: {
        assignment: { classId }
      }
    });

    return res.json({ success: true, data: grades });
  } catch (error) {
    console.error('Error getting grades:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateGrades = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    const { classId } = req.params;
    const { updates } = req.body; // updates: [{ studentId, assignmentId, score, feedback }]

    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classInfo = await prisma.class.findFirst({ where: { id: classId, teacherId }});
    if (!classInfo) return res.status(404).json({ success: false, message: 'Class not found' });

    // Use transaction for multiple updates
    const results = await prisma.$transaction(
      updates.map((update: any) => 
        prisma.grade.upsert({
          where: {
            assignmentId_studentId: {
              assignmentId: update.assignmentId,
              studentId: update.studentId
            }
          },
          update: {
            score: update.score !== undefined ? update.score : null,
            feedback: update.feedback
          },
          create: {
            assignmentId: update.assignmentId,
            studentId: update.studentId,
            score: update.score !== undefined ? update.score : null,
            feedback: update.feedback
          }
        })
      )
    );

    return res.json({ success: true, data: results, message: 'Grades updated' });
  } catch (error) {
    console.error('Error updating grades:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==========================================
// QUẢN LÝ THÔNG TIN HỌC SINH (STUDENT MANAGEMENT)
// ==========================================

// Lấy danh sách học sinh quản lý (toàn bộ hoặc lọc theo lớp/từ khóa)
export const getAllManagedStudents = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { search, classId } = req.query;

    const whereCondition: any = {
      role: 'STUDENT',
    };

    if (classId && typeof classId === 'string' && classId !== 'ALL') {
      whereCondition.studentEnrollments = {
        some: { classId }
      };
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereCondition.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { studentProfile: { studentCode: { contains: q, mode: 'insensitive' } } },
        { studentProfile: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const students = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        studentProfile: true,
        studentEnrollments: {
          select: {
            class: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Đảm bảo những học sinh chưa có MSSV sẽ được tự động cấp phát ngay lập tức
    const formattedStudents = await Promise.all(
      students.map(async (s) => {
        let profile = s.studentProfile;
        if (!profile || !profile.studentCode) {
          profile = await ensureStudentProfileAndCode(s.id);
        }
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar,
          createdAt: s.createdAt,
          profile: profile || null,
          enrolledClasses: s.studentEnrollments.map(e => e.class)
        };
      })
    );

    return res.json({
      success: true,
      data: formattedStudents,
      total: formattedStudents.length
    });
  } catch (error) {
    console.error('Error getting managed students:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Lấy thông tin chi tiết hồ sơ một học sinh
export const getStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { studentId } = req.params;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
        studentEnrollments: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true
              }
            }
          }
        },
        grades: {
          include: {
            assignment: {
              select: {
                id: true,
                title: true,
                classId: true
              }
            }
          }
        }
      }
    });

    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    let profile = student.studentProfile;
    if (!profile || !profile.studentCode) {
      profile = await ensureStudentProfileAndCode(student.id);
    }

    return res.json({
      success: true,
      data: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        createdAt: student.createdAt,
        profile,
        enrolledClasses: student.studentEnrollments.map(e => e.class),
        grades: student.grades
      }
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cập nhật hồ sơ học sinh
export const updateStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { studentId } = req.params;
    const { 
      name, 
      studentCode, 
      phone, 
      dateOfBirth, 
      gender, 
      address, 
      parentName, 
      parentPhone, 
      status, 
      notes 
    } = req.body;

    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Nếu sửa tên học sinh
    if (name && name.trim() && name.trim() !== student.name) {
      await prisma.user.update({
        where: { id: studentId },
        data: { name: name.trim() }
      });
    }

    // Kiểm tra trùng lặp studentCode nếu sửa sang mã khác
    if (studentCode && studentCode.trim()) {
      const existing = await prisma.studentProfile.findFirst({
        where: {
          studentCode: studentCode.trim(),
          userId: { not: studentId }
        }
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Mã số sinh viên ${studentCode} đã tồn tại trong hệ thống.`
        });
      }
    }

    const updatedProfile = await prisma.studentProfile.upsert({
      where: { userId: studentId },
      create: {
        userId: studentId,
        studentCode: studentCode && studentCode.trim() ? studentCode.trim() : await generateNextStudentCode(),
        phone: phone ? phone.trim() : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        address: address ? address.trim() : null,
        parentName: parentName ? parentName.trim() : null,
        parentPhone: parentPhone ? parentPhone.trim() : null,
        status: status || 'ACTIVE',
        notes: notes ? notes.trim() : null
      },
      update: {
        studentCode: studentCode && studentCode.trim() ? studentCode.trim() : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : undefined,
        gender: gender !== undefined ? gender : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        parentName: parentName !== undefined ? (parentName ? parentName.trim() : null) : undefined,
        parentPhone: parentPhone !== undefined ? (parentPhone ? parentPhone.trim() : null) : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined
      }
    });

    return res.json({
      success: true,
      message: 'Cập nhật hồ sơ học sinh thành công',
      data: updatedProfile
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Tạo nhanh tài khoản học sinh
export const createStudentQuickAccount = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { name, email, password, classId, phone, studentCode, gender } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Tên và Email là bắt buộc' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Kiểm tra trùng email
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email này đã được sử dụng trong hệ thống.' });
    }

    // Tự động sinh MSSV nếu không điền
    let finalCode = studentCode && studentCode.trim() ? studentCode.trim() : await generateNextStudentCode();
    if (studentCode && studentCode.trim()) {
      const codeExists = await prisma.studentProfile.findUnique({ where: { studentCode: finalCode } });
      if (codeExists) {
        return res.status(400).json({ success: false, message: `Mã số sinh viên ${finalCode} đã tồn tại.` });
      }
    }

    const defaultPassword = password && password.trim() ? password.trim() : '123456';
    const hashedPassword = await AuthUtils.hashPassword(defaultPassword);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: 'STUDENT',
        isVerified: true,
        studentProfile: {
          create: {
            studentCode: finalCode,
            phone: phone ? phone.trim() : null,
            gender: gender || null,
            status: 'ACTIVE'
          }
        },
        ...(classId ? {
          studentEnrollments: {
            create: {
              classId
            }
          }
        } : {})
      },
      include: {
        studentProfile: true
      }
    });

    return res.status(201).json({
      success: true,
      message: `Tạo tài khoản học sinh thành công! MSSV: ${finalCode}`,
      data: newUser
    });
  } catch (error) {
    console.error('Error creating quick student account:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ==========================================
// QUẢN LÝ HỌC PHÍ (TUITION & FEE MANAGEMENT)
// ==========================================

// Lấy danh sách phiếu học phí
export const getTuitionFees = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { classId, status, search, studentId } = req.query;

    const whereClause: any = {};

    if (studentId && typeof studentId === 'string') {
      whereClause.studentId = studentId;
    }

    if (classId && typeof classId === 'string' && classId !== 'ALL') {
      whereClause.classId = classId;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { student: { name: { contains: q, mode: 'insensitive' } } },
        { student: { email: { contains: q, mode: 'insensitive' } } },
        { student: { studentProfile: { studentCode: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const fees = await prisma.tuitionFee.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            studentProfile: true,
          }
        },
        class: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tự động kiểm tra quá hạn đối với các khoản chưa đóng đủ
    const now = new Date();
    const updatedFees = fees.map(f => {
      let currentStatus = f.status;
      if (currentStatus !== 'PAID' && f.dueDate && new Date(f.dueDate) < now) {
        currentStatus = 'OVERDUE' as any;
      }
      return {
        ...f,
        status: currentStatus,
        remainingAmount: Math.max(0, f.amount - f.paidAmount)
      };
    });

    return res.json({
      success: true,
      data: updatedFees,
      total: updatedFees.length
    });
  } catch (error) {
    console.error('Error getting tuition fees:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Thống kê tài chính học phí
export const getTuitionStats = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { classId } = req.query;
    const whereClause: any = {};
    if (classId && typeof classId === 'string' && classId !== 'ALL') {
      whereClause.classId = classId;
    }

    const fees = await prisma.tuitionFee.findMany({
      where: whereClause,
    });

    const now = new Date();
    let totalAmount = 0;
    let paidAmount = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;
    let overdueCount = 0;

    fees.forEach(f => {
      totalAmount += f.amount;
      paidAmount += f.paidAmount;

      if (f.status === 'PAID') {
        paidCount++;
      } else if (f.dueDate && new Date(f.dueDate) < now) {
        overdueCount++;
      } else if (f.paidAmount > 0) {
        partialCount++;
      } else {
        unpaidCount++;
      }
    });

    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const completionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totalAmount,
        paidAmount,
        remainingAmount,
        completionRate,
        totalInvoices: fees.length,
        paidCount,
        unpaidCount,
        partialCount,
        overdueCount
      }
    });
  } catch (error) {
    console.error('Error getting tuition stats:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Tạo khoản thu học phí cho một học sinh
export const createTuitionFee = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { studentId, classId, title, amount, dueDate, note } = req.body;

    if (!studentId || !title || !amount) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn học sinh, tên khoản thu và số tiền' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền phải lớn hơn 0' });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy học sinh' });
    }

    const now = new Date();
    const parsedDueDate = dueDate ? new Date(dueDate) : null;
    let initialStatus = 'UNPAID';
    if (parsedDueDate && parsedDueDate < now) {
      initialStatus = 'OVERDUE';
    }

    const newFee = await prisma.tuitionFee.create({
      data: {
        studentId,
        classId: classId || null,
        title: title.trim(),
        amount: numAmount,
        paidAmount: 0,
        status: initialStatus as any,
        dueDate: parsedDueDate,
        note: note ? note.trim() : null
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo khoản thu học phí thành công',
      data: newFee
    });
  } catch (error) {
    console.error('Error creating tuition fee:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Ghi nhận thanh toán / Thu học phí
export const recordTuitionPayment = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { feeId } = req.params;
    const { amountPaid, paymentMethod, paidAt, note } = req.body;

    const fee = await prisma.tuitionFee.findUnique({
      where: { id: feeId }
    });

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Khoản thu không tồn tại' });
    }

    const additionalPay = Number(amountPaid);
    if (isNaN(additionalPay) || additionalPay <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền thanh toán phải lớn hơn 0' });
    }

    const newPaidAmount = fee.paidAmount + additionalPay;
    let newStatus: any = 'UNPAID';

    if (newPaidAmount >= fee.amount) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    } else if (fee.dueDate && new Date(fee.dueDate) < new Date()) {
      newStatus = 'OVERDUE';
    }

    const updated = await prisma.tuitionFee.update({
      where: { id: feeId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paymentMethod: paymentMethod || fee.paymentMethod || 'CASH',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        note: note ? note.trim() : fee.note
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, studentProfile: true }
        },
        class: {
          select: { id: true, name: true }
        }
      }
    });

    return res.json({
      success: true,
      message: newStatus === 'PAID' ? 'Học sinh đã hoàn thành học phí!' : 'Đã ghi nhận thanh toán thành công',
      data: updated
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cập nhật thông tin khoản thu
export const updateTuitionFee = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { feeId } = req.params;
    const { title, amount, dueDate, note, status, classId } = req.body;

    const fee = await prisma.tuitionFee.findUnique({
      where: { id: feeId }
    });

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Khoản thu không tồn tại' });
    }

    const numAmount = amount !== undefined ? Number(amount) : fee.amount;

    let finalStatus = status;
    if (!finalStatus) {
      if (fee.paidAmount >= numAmount) {
        finalStatus = 'PAID';
      } else if (fee.paidAmount > 0) {
        finalStatus = 'PARTIAL';
      } else if (dueDate && new Date(dueDate) < new Date()) {
        finalStatus = 'OVERDUE';
      } else {
        finalStatus = 'UNPAID';
      }
    }

    const updated = await prisma.tuitionFee.update({
      where: { id: feeId },
      data: {
        title: title ? title.trim() : fee.title,
        amount: numAmount,
        classId: classId !== undefined ? classId : fee.classId,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : fee.dueDate,
        note: note !== undefined ? (note ? note.trim() : null) : fee.note,
        status: finalStatus as any
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, studentProfile: true }
        },
        class: {
          select: { id: true, name: true }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Cập nhật khoản thu thành công',
      data: updated
    });
  } catch (error) {
    console.error('Error updating tuition fee:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Xóa khoản thu học phí
export const deleteTuitionFee = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { feeId } = req.params;

    const fee = await prisma.tuitionFee.findUnique({
      where: { id: feeId }
    });

    if (!fee) {
      return res.status(404).json({ success: false, message: 'Khoản thu không tồn tại' });
    }

    await prisma.tuitionFee.delete({
      where: { id: feeId }
    });

    return res.json({
      success: true,
      message: 'Đã xóa phiếu học phí'
    });
  } catch (error) {
    console.error('Error deleting tuition fee:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ─── MATERIAL (Learning Resources) Controllers ───────────────────────────────

// Lấy danh sách tài liệu của một lớp học
export const getMaterials = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { classId } = req.params;

    // Verify teacher owns this class
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) return res.status(403).json({ success: false, message: 'Không có quyền truy cập lớp này' });

    const materials = await prisma.material.findMany({
      where: { classId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error getting materials:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Tạo tài liệu học tập mới
export const createMaterial = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { classId } = req.params;
    const { title, url, type, description, order } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Tiêu đề tài liệu không được để trống' });
    if (!url?.trim()) return res.status(400).json({ success: false, message: 'URL tài liệu không được để trống' });

    // Verify teacher owns this class
    const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
    if (!cls) return res.status(403).json({ success: false, message: 'Không có quyền truy cập lớp này' });

    const material = await prisma.material.create({
      data: {
        classId,
        title: title.trim(),
        url: url.trim(),
        type: type || 'link',
        description: description?.trim() || null,
        order: order ?? 0,
      },
    });

    return res.status(201).json({ success: true, data: material, message: 'Đã thêm tài liệu' });
  } catch (error) {
    console.error('Error creating material:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Cập nhật tài liệu
export const updateMaterial = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { materialId } = req.params;
    const { title, url, type, description, order } = req.body;

    const existing = await prisma.material.findUnique({
      where: { id: materialId },
      include: { class: { select: { teacherId: true } } },
    });

    if (!existing) return res.status(404).json({ success: false, message: 'Tài liệu không tồn tại' });
    if (existing.class.teacherId !== teacherId) return res.status(403).json({ success: false, message: 'Không có quyền' });

    const updated = await prisma.material.update({
      where: { id: materialId },
      data: {
        ...(title && { title: title.trim() }),
        ...(url && { url: url.trim() }),
        ...(type && { type }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(order !== undefined && { order }),
      },
    });

    return res.json({ success: true, data: updated, message: 'Đã cập nhật tài liệu' });
  } catch (error) {
    console.error('Error updating material:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Xóa tài liệu
export const deleteMaterial = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const teacherId = req.user?.userId;
    if (!teacherId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { materialId } = req.params;

    const existing = await prisma.material.findUnique({
      where: { id: materialId },
      include: { class: { select: { teacherId: true } } },
    });

    if (!existing) return res.status(404).json({ success: false, message: 'Tài liệu không tồn tại' });
    if (existing.class.teacherId !== teacherId) return res.status(403).json({ success: false, message: 'Không có quyền' });

    await prisma.material.delete({ where: { id: materialId } });

    return res.json({ success: true, message: 'Đã xóa tài liệu' });
  } catch (error) {
    console.error('Error deleting material:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
