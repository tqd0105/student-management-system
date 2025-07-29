/**
 * Class Management Controller
 * Student Management System - DTECH TEAM
 * Quản lý lớp học, enrollment, và class schedules
 */

const { Request, Response } = require('express');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ClassController {
  /**
   * Lấy danh sách tất cả lớp học
   */
  static async getAllClasses(req, res) {
    try {
      const { page = 1, limit = 10, teacherId, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where condition
      const whereCondition = {};
      
      if (teacherId) {
        whereCondition.teacherId = teacherId;
      }

      if (search) {
        whereCondition.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [classes, total] = await Promise.all([
        prisma.class.findMany({
          where: whereCondition,
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
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
            },
            sessions: {
              select: {
                id: true,
                title: true,
                date: true,
                isActive: true
              },
              orderBy: { date: 'desc' },
              take: 5 // Chỉ lấy 5 sessions gần nhất
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.class.count({ where: whereCondition })
      ]);

      res.status(200).json({
        success: true,
        message: 'Classes retrieved successfully',
        data: {
          classes,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get all classes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy thông tin lớp học theo ID
   */
  static async getClassById(req, res) {
    try {
      const { id } = req.params;

      const classInfo = await prisma.class.findUnique({
        where: { id },
        include: { 
          teacher: { /* Giống ghép bảng join trong sql, teacher là class đang truy vấn đến bảng user*/
            select: {
              id: true,
              name: true,
              email: true
            }
          },
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
          },
          sessions: {
            include: {
              attendanceRecords: {
                include: {
                  student: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            },
            orderBy: { date: 'desc' }
          }
        }
      });

      if (!classInfo) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Class retrieved successfully',
        data: { class: classInfo }
      });

    } catch (error) {
      console.error('Get class by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Tạo lớp học mới
   */
  static async createClass(req, res) {
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
        name, 
        description, 
        teacherId,
        qrExpiryMinutes = 5,
        locationLat,
        locationLng,
        radiusMeters = 100
      } = req.body;

      // Kiểm tra teacher tồn tại và có role TEACHER
      const teacher = await prisma.user.findFirst({
        where: { 
          id: teacherId,
          role: { in: ['TEACHER', 'ADMIN'] }
        }
      });

      if (!teacher) {
        return res.status(400).json({
          success: false,
          message: 'Teacher not found or invalid role'
        });
      }

      // Tạo lớp học mới
      const newClass = await prisma.class.create({
        data: {
          name,
          description,
          teacherId,
          qrExpiryMinutes: parseInt(qrExpiryMinutes),
          locationLat: locationLat ? parseFloat(locationLat) : null,
          locationLng: locationLng ? parseFloat(locationLng) : null,
          radiusMeters: parseInt(radiusMeters)
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Class created successfully',
        data: { class: newClass }
      });

    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cập nhật thông tin lớp học
   */
  static async updateClass(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { 
        name, 
        description, 
        teacherId,
        qrExpiryMinutes,
        locationLat,
        locationLng,
        radiusMeters
      } = req.body;

      // Kiểm tra lớp học tồn tại
      const existingClass = await prisma.class.findUnique({
        where: { id }
      });

      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Kiểm tra teacher nếu được cung cấp
      if (teacherId) {
        const teacher = await prisma.user.findFirst({
          where: { 
            id: teacherId,
            role: { in: ['TEACHER', 'ADMIN'] }
          }
        });

        if (!teacher) {
          return res.status(400).json({
            success: false,
            message: 'Teacher not found or invalid role'
          });
        }
      }

      // Cập nhật lớp học
      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(teacherId && { teacherId }),
          ...(qrExpiryMinutes && { qrExpiryMinutes: parseInt(qrExpiryMinutes) }),
          ...(locationLat && { locationLat: parseFloat(locationLat) }),
          ...(locationLng && { locationLng: parseFloat(locationLng) }),
          ...(radiusMeters && { radiusMeters: parseInt(radiusMeters) })
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Class updated successfully',
        data: { class: updatedClass }
      });

    } catch (error) {
      console.error('Update class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xóa lớp học
   */
  static async deleteClass(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra lớp học tồn tại
      const existingClass = await prisma.class.findUnique({
        where: { id },
        include: {
          enrollments: true,
          sessions: true
        }
      });

      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Kiểm tra có student enrollment hoặc sessions không
      if (existingClass.enrollments.length > 0 || existingClass.sessions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete class with existing enrollments or sessions'
        });
      }

      // Xóa lớp học
      await prisma.class.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Class deleted successfully'
      });

    } catch (error) {
      console.error('Delete class error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Enroll student vào lớp học
   */
  static async enrollStudent(req, res) {
    try {
      const { classId, studentId } = req.body;

      // Kiểm tra lớp học tồn tại
      const classExists = await prisma.class.findUnique({
        where: { id: classId }
      });

      if (!classExists) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Kiểm tra student tồn tại và có role STUDENT
      const student = await prisma.user.findFirst({
        where: { 
          id: studentId,
          role: 'STUDENT'
        }
      });

      if (!student) {
        return res.status(400).json({
          success: false,
          message: 'Student not found or invalid role'
        });
      }

      // Kiểm tra student đã enroll chưa
      const existingEnrollment = await prisma.classEnrollment.findUnique({
        where: {
          classId_studentId: {
            classId,
            studentId
          }
        }
      });

      if (existingEnrollment) {
        return res.status(409).json({
          success: false,
          message: 'Student already enrolled in this class'
        });
      }

      // Tạo enrollment
      const enrollment = await prisma.classEnrollment.create({
        data: {
          classId,
          studentId
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true
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

      res.status(201).json({
        success: true,
        message: 'Student enrolled successfully',
        data: { enrollment }
      });

    } catch (error) {
      console.error('Enroll student error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Unenroll student khỏi lớp học
   */
  static async unenrollStudent(req, res) {
    try {
      const { classId, studentId } = req.body;

      // Kiểm tra enrollment tồn tại
      const enrollment = await prisma.classEnrollment.findUnique({
        where: {
          classId_studentId: {
            classId,
            studentId
          }
        }
      });

      if (!enrollment) {
        return res.status(404).json({
          success: false,
          message: 'Enrollment not found'
        });
      }

      // Xóa enrollment
      await prisma.classEnrollment.delete({
        where: {
          classId_studentId: {
            classId,
            studentId
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Student unenrolled successfully'
      });

    } catch (error) {
      console.error('Unenroll student error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

// Export cho CommonJS
module.exports = { ClassController };
