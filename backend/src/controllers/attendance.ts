/**
 * Attendance Management Controller
 * Student Management System - DTECH TEAM
 * Quản lý QR attendance sessions và attendance records
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

class AttendanceController {
  /**
   * Tạo session điểm danh mới (Teacher only)
   */
  static async createSession(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        classId, 
        startTime, 
        endTime,
        locationLat,
        locationLng,
        radiusMeters = 100
      } = req.body;
      
      const teacherId = req.user.userId; // Từ auth middleware

      // Kiểm tra teacher có quyền với class này không
      const classInfo = await prisma.class.findFirst({
        where: { 
          id: classId,
          teacherId: teacherId
        }
      });

      if (!classInfo) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not the teacher of this class.'
        });
      }

      // Generate unique QR code
      const qrCode = crypto.randomBytes(32).toString('hex');

      // Tạo attendance session
      const session = await prisma.attendanceSession.create({
        data: {
          teacherId,
          classId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          locationLat: locationLat ? parseFloat(locationLat) : null,
          locationLng: locationLng ? parseFloat(locationLng) : null,
          radiusMeters: parseInt(radiusMeters),
          qrCode,
          isActive: true
        },
        include: {
          class: {
            select: {
              id: true,
              name: true
            }
          },
          teacher: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Attendance session created successfully',
        data: { 
          session,
          qrCodeUrl: `${process.env.FRONTEND_URL}/attendance/${qrCode}`
        }
      });

    } catch (error) {
      console.error('Create session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy danh sách sessions của một class
   */
  static async getClassSessions(req, res) {
    try {
      const { classId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Kiểm tra user có quyền xem class này không
      let whereCondition: any = { classId };
      
      if (req.user.role === 'TEACHER') {
        whereCondition.teacherId = req.user.userId;
      } else if (req.user.role === 'STUDENT') {
        // Kiểm tra student có enroll vào class này không
        const enrollment = await prisma.classEnrollment.findFirst({
          where: {
            classId,
            studentId: req.user.userId
          }
        });

        if (!enrollment) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not enrolled in this class.'
          });
        }
      }

      const [sessions, total] = await Promise.all([
        prisma.attendanceSession.findMany({
          where: whereCondition,
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            },
            teacher: {
              select: {
                id: true,
                name: true
              }
            },
            attendanceLogs: {
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
          skip,
          take: parseInt(limit),
          orderBy: { startTime: 'desc' }
        }),
        prisma.attendanceSession.count({ where: whereCondition })
      ]);

      res.status(200).json({
        success: true,
        message: 'Sessions retrieved successfully',
        data: {
          sessions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get class sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Student điểm danh qua QR code
   */
  static async checkIn(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        qrCode, 
        deviceId,
        latitude,
        longitude
      } = req.body;
      
      const studentId = req.user.userId;

      // Tìm session từ QR code
      const session = await prisma.attendanceSession.findFirst({
        where: { 
          qrCode,
          isActive: true
        },
        include: {
          class: {
            include: {
              enrollments: {
                where: { studentId }
              }
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired QR code'
        });
      }

      // Kiểm tra student có enroll vào class này không
      if (session.class.enrollments.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this class'
        });
      }

      // Kiểm tra thời gian session
      const now = new Date();
      if (now < session.startTime || now > session.endTime) {
        return res.status(400).json({
          success: false,
          message: 'Attendance session is not active'
        });
      }

      // Kiểm tra student đã điểm danh chưa
      const existingRecord = await prisma.attendanceLog.findFirst({
        where: {
          sessionId: session.id,
          studentId
        }
      });

      if (existingRecord) {
        return res.status(409).json({
          success: false,
          message: 'You have already checked in for this session',
          data: { existingRecord }
        });
      }

      // Kiểm tra location nếu session có yêu cầu
      let status = 'PRESENT';
      if (session.locationLat && session.locationLng && latitude && longitude) {
        const distance = this.calculateDistance(
          session.locationLat,
          session.locationLng,
          parseFloat(latitude),
          parseFloat(longitude)
        );

        if (distance > session.radiusMeters) {
          return res.status(400).json({
            success: false,
            message: `You are too far from the class location. Distance: ${Math.round(distance)}m, Required: ${session.radiusMeters}m`
          });
        }
      }

      // Kiểm tra có muộn không (sau 15 phút đầu session)
      const lateThreshold = new Date(session.startTime.getTime() + 15 * 60 * 1000);
      if (now > lateThreshold) {
        status = 'LATE';
      }

      // Tạo attendance record
      const attendanceRecord = await prisma.attendanceLog.create({
        data: {
          studentId,
          sessionId: session.id,
          deviceId,
          status: status as any,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null,
          checkedAt: now
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          session: {
            include: {
              class: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: `Check-in successful! Status: ${status}`,
        data: { attendanceRecord }
      });

    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy thông tin session từ QR code (để hiển thị trước khi điểm danh)
   */
  static async getSessionByQR(req, res) {
    try {
      const { qrCode } = req.params;

      const session = await prisma.attendanceSession.findFirst({
        where: { 
          qrCode,
          isActive: true
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          teacher: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired QR code'
        });
      }

      // Kiểm tra thời gian session
      const now = new Date();
      const isActive = now >= session.startTime && now <= session.endTime;

      res.status(200).json({
        success: true,
        message: 'Session found',
        data: { 
          session: {
            ...session,
            qrCode: undefined, // Không trả về QR code
            isCurrentlyActive: isActive
          }
        }
      });

    } catch (error) {
      console.error('Get session by QR error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đóng session điểm danh (Teacher only)
   */
  static async closeSession(req, res) {
    try {
      const { sessionId } = req.params;
      const teacherId = req.user.userId;

      // Kiểm tra teacher có quyền với session này không
      const session = await prisma.attendanceSession.findFirst({
        where: { 
          id: sessionId,
          teacherId
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or access denied'
        });
      }

      // Đóng session
      const updatedSession = await prisma.attendanceSession.update({
        where: { id: sessionId },
        data: { isActive: false },
        include: {
          attendanceLogs: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Session closed successfully',
        data: { session: updatedSession }
      });

    } catch (error) {
      console.error('Close session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy báo cáo điểm danh của một session
   */
  static async getSessionReport(req, res) {
    try {
      const { sessionId } = req.params;

      // Kiểm tra quyền truy cập
      if (req.user.role === 'STUDENT') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Teachers and Admins only.'
        });
      }

      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionId },
        include: {
          class: {
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
            }
          },
          attendanceLogs: {
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
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Tạo báo cáo
      const enrolledStudents = session.class.enrollments.map(e => e.student);
      const attendedStudents = session.attendanceLogs.map(log => ({
        ...log.student,
        status: log.status,
        checkedAt: log.checkedAt
      }));

      const absentStudents = enrolledStudents.filter(
        student => !attendedStudents.find(attended => attended.id === student.id)
      ).map(student => ({
        ...student,
        status: 'ABSENT',
        checkedAt: null
      }));

      const report = {
        session: {
          id: session.id,
          startTime: session.startTime,
          endTime: session.endTime,
          isActive: session.isActive,
          className: session.class.name
        },
        summary: {
          totalEnrolled: enrolledStudents.length,
          totalPresent: attendedStudents.filter(s => s.status === 'PRESENT').length,
          totalLate: attendedStudents.filter(s => s.status === 'LATE').length,
          totalAbsent: absentStudents.length
        },
        attendanceList: [
          ...attendedStudents,
          ...absentStudents
        ].sort((a, b) => a.name.localeCompare(b.name))
      };

      res.status(200).json({
        success: true,
        message: 'Session report retrieved successfully',
        data: { report }
      });

    } catch (error) {
      console.error('Get session report error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Tính khoảng cách giữa 2 điểm GPS (Haversine formula)
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
}

export { AttendanceController };
