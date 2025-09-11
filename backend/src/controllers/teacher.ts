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
        teacherId: teacherId
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
      attendanceDetails: attendanceStats
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
