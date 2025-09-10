/**
 * Student Controller
 * Student Management System - DTECH TEAM
 * Quản lý các chức năng dành cho sinh viên
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserPayload } from '../types';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// Lấy danh sách lớp học của sinh viên
export const getStudentClasses = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: studentId
      },
      include: {
        class: {
          include: {
            teacher: {
              select: {
                name: true,
                email: true
              }
            },
            attendanceSessions: {
              orderBy: {
                startTime: 'desc'
              },
              take: 5 // Lấy 5 session gần nhất
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    console.error('Error getting student classes:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Quét QR code và điểm danh
export const scanQRAndCheckIn = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    const { qrData, latitude, longitude } = req.body;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!qrData) {
      return res.status(400).json({ success: false, message: 'QR data is required' });
    }

    // Parse QR data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid QR code format' });
    }

    const { sessionId, qrCode, classId } = parsedData;

    if (!sessionId || !qrCode || !classId) {
      return res.status(400).json({ success: false, message: 'Invalid QR code data' });
    }

    // Tìm session và kiểm tra
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        classId: classId,
        qrCode: qrCode,
        isActive: true,
        qrExpiresAt: {
          gt: new Date() // QR code chưa hết hạn
        }
      },
      include: {
        class: true
      }
    });

    if (!session) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR code is invalid, expired, or session is not active' 
      });
    }

    // Kiểm tra sinh viên có đăng ký lớp này không
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId: classId,
        studentId: studentId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not enrolled in this class' 
      });
    }

    // Kiểm tra xem đã điểm danh chưa
    const existingRecord = await prisma.attendanceLog.findFirst({
      where: {
        sessionId: sessionId,
        studentId: studentId
      }
    });

    if (existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already checked in for this session',
        data: {
          checkinTime: existingRecord.checkedAt,
          status: existingRecord.status
        }
      });
    }

    // Tạo record điểm danh
    const now = new Date();
    const sessionStartTime = new Date(session.startTime);
    const timeDiff = Math.abs(now.getTime() - sessionStartTime.getTime());
    const minutesDiff = Math.ceil(timeDiff / (1000 * 60));

    // Xác định status
    let status = 'PRESENT';
    if (minutesDiff > 15) { // Nếu quá 15 phút
      status = 'LATE';
    }

    const attendanceRecord = await prisma.attendanceLog.create({
      data: {
        sessionId,
        studentId,
        status: status as any,
        checkedAt: now,
        latitude: latitude,
        longitude: longitude,
        deviceId: req.get('User-Agent') || 'unknown'
      }
    });

    return res.json({
      success: true,
      data: {
        sessionTitle: session.title,
        className: session.class.name,
        checkinTime: attendanceRecord.checkedAt,
        status: attendanceRecord.status
      },
      message: `Check-in successful! Status: ${status}`
    });

  } catch (error) {
    console.error('Error scanning QR and check-in:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy lịch sử điểm danh của sinh viên
export const getAttendanceHistory = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    const { classId } = req.query;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const whereCondition: any = {
      studentId: studentId
    };

    // Nếu có classId, lọc theo lớp
    if (classId) {
      whereCondition.session = {
        classId: classId as string
      };
    }

    const attendanceRecords = await prisma.attendanceLog.findMany({
      where: whereCondition,
      include: {
        session: {
          include: {
            class: {
              select: {
                name: true,
                teacher: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        checkedAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: attendanceRecords
    });
  } catch (error) {
    console.error('Error getting attendance history:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Điểm danh đơn giản (không cần QR code để test)
export const simpleCheckIn = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    const { classId } = req.body;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!classId) {
      return res.status(400).json({ success: false, message: 'Class ID is required' });
    }

    // Kiểm tra sinh viên có đăng ký lớp này không
    const enrollment = await prisma.classEnrollment.findFirst({
      where: {
        classId: classId,
        studentId: studentId
      }
    });

    if (!enrollment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not enrolled in this class' 
      });
    }

    return res.json({
      success: true,
      message: 'Please use QR code scanning for actual check-in',
      data: {
        classId,
        studentId,
        timestamp: new Date(),
        note: 'This is a legacy endpoint. Use /scan-qr for actual check-in.'
      }
    });
  } catch (error) {
    console.error('Error checking in:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy thông tin cá nhân của sinh viên
export const getStudentProfile = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    return res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error getting student profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
