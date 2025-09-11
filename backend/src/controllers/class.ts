/**
 * Class Management Controller
 * Student Management System - DTECH TEAM
 * Quản lý lớp học, enrollment, và class schedules
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { WhereCondition } from '../types';

const prisma = new PrismaClient();

class ClassController {
  /**
   * Lấy danh sách tất cả lớp học
   */
  static async getAllClasses(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, teacherId, search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build where condition
      const whereCondition: WhereCondition = {};
      
      if (teacherId) {
        whereCondition.teacherId = teacherId as string;
      }

      if (search) {
        whereCondition.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
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
            // sessions: {
            //   select: {
            //     id: true,
            //     title: true,
            //     date: true,
            //     isActive: true
            //   },
            //   orderBy: { date: 'desc' },
            //   take: 5 // Chỉ lấy 5 sessions gần nhất
            // }
          },
          skip,
          take: limitNum,
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
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
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
          }
          // sessions: {
          //   include: {
          //     attendanceRecords: {
          //       include: {
          //         student: {
          //           select: {
          //             id: true,
          //             name: true
          //           }
          //         }
          //       }
          //     }
          //   },
          //   orderBy: { date: 'desc' }
          // }
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
        description
      } = req.body;

      // Lấy teacherId từ authenticated user
      const teacherId = req.user.userId;

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
          teacherId
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
          enrollments: true
          // sessions: true
        }
      });

      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Kiểm tra có student enrollment không
      if (existingClass.enrollments.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete class with existing enrollments'
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
          studentId_classId: {
            studentId,
            classId
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
          studentId_classId: {
            studentId,
            classId
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
          studentId_classId: {
            studentId,
            classId
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

export { ClassController };
module.exports = { ClassController };
