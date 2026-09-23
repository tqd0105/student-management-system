/**
 * Student Controller
 * Student Management System - DTECH TEAM
 * Quản lý các chức năng dành cho sinh viên
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { UserPayload } from '../types';
import { ensureStudentProfileAndCode } from '../utils/studentCode';

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

    const classes = enrollments.map(e => ({
      id: e.class.id,
      name: e.class.name,
      description: e.class.description,
      teacherId: e.class.teacherId,
      teacher: e.class.teacher,
      attendanceSessions: e.class.attendanceSessions,
      enrollmentId: e.id,
      enrolledAt: e.enrolledAt,
      class: e.class, // giữ lại cho tương thích ngược nếu có chỗ khác gọi
    }));

    return res.json({
      success: true,
      data: classes
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

    let student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT'
      },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        studentProfile: true
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.studentProfile || !student.studentProfile.studentCode) {
      const profile = await ensureStudentProfileAndCode(student.id);
      (student as any).studentProfile = profile;
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

// Lấy bảng điểm của sinh viên (tất cả các lớp hoặc lọc theo classId)
export const getStudentGrades = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    const classId = req.query.classId as string | undefined;

    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: studentId,
        ...(classId ? { classId } : {})
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
            assignments: {
              orderBy: {
                createdAt: 'asc'
              },
              include: {
                grades: {
                  where: {
                    studentId: studentId
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    const data = enrollments.map(e => {
      const assignments = e.class.assignments.map(a => {
        const grade = a.grades && a.grades.length > 0 ? a.grades[0] : null;
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          score: grade ? grade.score : null,
          feedback: grade ? grade.feedback : null,
          gradedAt: grade ? grade.updatedAt : null,
          submissionUrl: grade ? (grade as any).submissionUrl : null,
          submissionNotes: grade ? (grade as any).submissionNotes : null,
          submittedAt: grade ? (grade as any).submittedAt : null
        };
      });

      const gradedAssignments = assignments.filter(a => a.score !== null);
      const averageScore = gradedAssignments.length > 0
        ? parseFloat((gradedAssignments.reduce((acc, curr) => acc + (curr.score as number), 0) / gradedAssignments.length).toFixed(1))
        : null;

      return {
        classId: e.class.id,
        className: e.class.name,
        teacherName: e.class.teacher.name,
        teacherEmail: e.class.teacher.email,
        totalAssignments: assignments.length,
        gradedCount: gradedAssignments.length,
        averageScore,
        assignments
      };
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting student grades:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Lấy danh sách bài tập của sinh viên (kèm trạng thái nộp bài & hạn nộp)
export const getStudentAssignments = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { classId, status } = req.query;

    // Tìm các lớp sinh viên đã đăng ký
    const enrollmentWhere: any = { studentId };
    if (classId && typeof classId === 'string' && classId !== 'ALL') {
      enrollmentWhere.classId = classId;
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assignments: {
              orderBy: [
                { dueDate: 'asc' },
                { createdAt: 'desc' }
              ],
              include: {
                material: {
                  select: {
                    id: true,
                    title: true,
                    url: true,
                    type: true
                  }
                },
                grades: {
                  where: {
                    studentId
                  }
                }
              }
            }
          }
        }
      }
    });

    const now = new Date();
    const allAssignments: any[] = [];

    let pendingCount = 0;
    let submittedCount = 0;
    let gradedCount = 0;
    let overdueCount = 0;

    enrollments.forEach((e) => {
      e.class.assignments.forEach((a) => {
        const grade = a.grades && a.grades.length > 0 ? a.grades[0] : null;
        const isGraded = grade !== null && grade.score !== null;
        const isSubmitted = grade !== null && !!(grade as any).submissionUrl;
        const isOverdue = !isSubmitted && a.dueDate !== null && new Date(a.dueDate) < now;

        let assignmentStatus: 'pending' | 'submitted' | 'graded' | 'overdue' = 'pending';
        if (isGraded) {
          assignmentStatus = 'graded';
          gradedCount++;
        } else if (isSubmitted) {
          assignmentStatus = 'submitted';
          submittedCount++;
        } else if (isOverdue) {
          assignmentStatus = 'overdue';
          overdueCount++;
        } else {
          assignmentStatus = 'pending';
          pendingCount++;
        }

        const item = {
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          createdAt: a.createdAt,
          attachmentUrl: a.attachmentUrl,
          material: a.material,
          classId: e.class.id,
          className: e.class.name,
          teacher: e.class.teacher,
          status: assignmentStatus,
          isSubmitted,
          isGraded,
          isOverdue,
          submission: {
            url: grade ? (grade as any).submissionUrl : null,
            notes: grade ? (grade as any).submissionNotes : null,
            submittedAt: grade ? (grade as any).submittedAt : null,
          },
          grade: {
            score: grade ? grade.score : null,
            feedback: grade ? grade.feedback : null,
            gradedAt: grade ? grade.updatedAt : null,
          }
        };

        allAssignments.push(item);
      });
    });

    // Lọc theo status nếu có yêu cầu
    let filtered = allAssignments;
    if (status && typeof status === 'string' && status !== 'all') {
      filtered = allAssignments.filter((a) => a.status === status);
    }

    return res.json({
      success: true,
      data: filtered,
      summary: {
        total: allAssignments.length,
        pendingCount,
        submittedCount,
        gradedCount,
        overdueCount
      }
    });
  } catch (error) {
    console.error('Error getting student assignments:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


// Lấy danh sách học phí của sinh viên hiện tại
export const getStudentTuitionFees = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const fees = await prisma.tuitionFee.findMany({
      where: { studentId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const formattedFees = fees.map(f => {
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

    let totalAmount = 0;
    let totalPaid = 0;
    formattedFees.forEach(f => {
      totalAmount += f.amount;
      totalPaid += f.paidAmount;
    });

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        studentProfile: true
      }
    });

    let studentProfile = student?.studentProfile;
    if (!studentProfile || !studentProfile.studentCode) {
      studentProfile = await ensureStudentProfileAndCode(studentId);
    }

    return res.json({
      success: true,
      data: formattedFees,
      summary: {
        totalAmount,
        totalPaid,
        totalRemaining: Math.max(0, totalAmount - totalPaid)
      },
      student: {
        id: student?.id,
        name: student?.name,
        email: student?.email,
        studentCode: studentProfile?.studentCode || 'SV'
      }
    });
  } catch (error) {
    console.error('Error getting student tuition fees:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Lấy danh sách tài liệu học tập của một lớp (sinh viên phải là thành viên lớp đó)
export const getClassMaterials = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { classId } = req.params;

    // Verify student is enrolled in this class
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
    if (!enrollment) return res.status(403).json({ success: false, message: 'Bạn không phải thành viên của lớp này' });

    const materials = await prisma.material.findMany({
      where: { classId },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, description: true, url: true, type: true, order: true, createdAt: true },
    });

    return res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error getting class materials:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Nộp bài tập dạng Link (Google Drive, GitHub, Docs, Figma, Notion...) - Tiết kiệm tài nguyên server
export const submitAssignment = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const studentId = req.user?.userId;
    if (!studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { assignmentId } = req.params;
    const { submissionUrl, submissionNotes } = req.body;

    if (!submissionUrl?.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập link bài làm (Google Drive, GitHub, Docs...)' });
    }

    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { class: { select: { id: true, name: true } } }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Bài tập không tồn tại' });
    }

    // Verify student is enrolled in class
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { studentId_classId: { studentId, classId: assignment.class.id } }
    });

    if (!enrollment) {
      return res.status(403).json({ success: false, message: 'Bạn không phải thành viên lớp này' });
    }

    // Upsert Grade record with submission data
    const grade = await prisma.grade.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId
        }
      },
      update: {
        submissionUrl: submissionUrl.trim(),
        submissionNotes: submissionNotes?.trim() || null,
        submittedAt: new Date()
      },
      create: {
        assignmentId,
        studentId,
        submissionUrl: submissionUrl.trim(),
        submissionNotes: submissionNotes?.trim() || null,
        submittedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Nộp bài tập thành công!',
      data: grade
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
