/**
 * User Management Controller
 * Student Management System - DTECH TEAM
 * Quản lý CRUD users, roles, và profiles
 */

const { Request, Response } = require('express');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword } = require('../utils/auth');

const prisma = new PrismaClient();

class UserController {
  /**
   * Lấy danh sách tất cả users (Admin only)
   */
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, role, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build where condition
      const whereCondition = {};
      
      if (role && ['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
        whereCondition.role = role;
      }

      if (search) {
        whereCondition.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereCondition,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true
          },
          skip, 
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where: whereCondition })
      ]);

      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy thông tin user theo ID
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id }, /* SELECT * FROM users WHERE id = ? */
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Tạo user mới (Admin only)
   */
  static async createUser(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, name, role } = req.body;

      // Kiểm tra user đã tồn tại chưa
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Tạo user mới
      const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: role || 'STUDENT'
          },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cập nhật thông tin user
   */
  static async updateUser(req, res) {
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
      const { email, name, role } = req.body;

      // Kiểm tra user tồn tại
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Kiểm tra email đã được sử dụng bởi user khác chưa
      if (email && email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email }
        });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use by another user'
          });
        }
      }

      // Cập nhật user
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(email && { email }), /* object spread */
          ...(name && { name }),
          ...(role && { role })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true
        }
      });

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đổi mật khẩu user
   */
  static async changePassword(req, res) {
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
      const { currentPassword, newPassword } = req.body;

      // Lấy user với password
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          password: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id },
        data: { password: hashedNewPassword }
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xóa user (Admin only)
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Kiểm tra user tồn tại
      const user = await prisma.user.findUnique({
        where: { id }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Không cho phép admin xóa chính mình
      if (req.user?.userId === id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Xóa user
      await prisma.user.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy statistics về users
   */
  static async getUserStats(req, res) {
    try {
      const [totalUsers, adminCount, teacherCount, studentCount] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'ADMIN' } }),
        prisma.user.count({ where: { role: 'TEACHER' } }),
        prisma.user.count({ where: { role: 'STUDENT' } })
      ]);

      res.status(200).json({
        success: true,
        message: 'User statistics retrieved successfully',
        data: {
          total: totalUsers,
          byRole: {
            admin: adminCount,
            teacher: teacherCount,
            student: studentCount
          }
        }
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xóa tài khoản của chính user đang đăng nhập
   */
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.userId; /* có thể được lấy trong token jwt*/

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get user info first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Begin transaction to delete all related data
      await prisma.$transaction(async (tx) => {
        // Delete email verification tokens
        await tx.emailVerificationToken.deleteMany({
          where: { email: user.email }
        });

        // If user is a teacher, delete related data
        if (user.role === 'TEACHER') {
          // Get teacher's classes first
          const teacherClasses = await tx.class.findMany({
            where: { teacherId: userId },
            select: { id: true }
          });

          if (teacherClasses.length > 0) {
            const classIds = teacherClasses.map((c: any) => c.id);

            // Get all attendance sessions for these classes
            const sessions = await tx.attendanceSession.findMany({
              where: { classId: { in: classIds } },
              select: { id: true }
            });

            const sessionIds = sessions.map((s: any) => s.id);

            // Delete attendance records first (if any sessions exist)
            if (sessionIds.length > 0) {
              await tx.attendanceLog.deleteMany({
                where: { sessionId: { in: sessionIds } }
              });
            }

            // Delete attendance sessions
            await tx.attendanceSession.deleteMany({
              where: { classId: { in: classIds } }
            });

            // Delete class enrollments  
            await tx.classEnrollment.deleteMany({
              where: { classId: { in: classIds } }
            });

            // Finally delete classes
            await tx.class.deleteMany({
              where: { teacherId: userId }
            });
          }
        }

        // If user is a student, delete related data
        if (user.role === 'STUDENT') {
          // Delete attendance records
          await tx.attendanceLog.deleteMany({
            where: { studentId: userId }
          });

          // Delete class enrollments
          await tx.classEnrollment.deleteMany({
            where: { studentId: userId }
          });
        }

        // Finally delete the user
        await tx.user.delete({
          where: { id: userId }
        });
      });

      console.log(`✅ Account deleted successfully for user: ${user.email} (${user.role})`);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

// Export cho CommonJS và ES6
module.exports = { UserController };
export { UserController };
