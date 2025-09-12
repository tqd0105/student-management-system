/**
 * Admin Routes (TypeScript)
 * Student Management System - LightBrave Team
 * Secure admin endpoints for teacher management
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { sendEmail, EmailTemplates } from '../utils/emailService';

const router = express.Router();
const prisma = new PrismaClient();

// Auth middleware
const authMiddleware = requireAuth([]);
const adminMiddleware = requireAuth(['ADMIN']);

/**
 * @route POST /api/admin/create-teacher
 * @desc Create new teacher account (Admin only)
 * @access Admin
 */
router.post('/create-teacher', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teacher account
    const teacher = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        isVerified: true, // Admin-created accounts are pre-verified
      }
    });

    // Log admin action
    console.log(`Admin ${(req as any).user.email} created teacher account for ${email}`);

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role
      }
    });

  } catch (error) {
    console.error('Create teacher account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/admin/teachers
 * @desc Get all teachers (Admin only)
 * @access Admin
 */
router.get('/teachers', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        teacherClasses: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: teachers
    });

  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/admin/students
 * @desc Get all students (Admin only)
 * @access Admin
 */
router.get('/students', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        attendanceLogs: {
          select: {
            id: true,
            status: true,
            checkedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: students
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/admin/stats
 * @desc Get system statistics (Admin only)
 * @access Admin
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req: any, res: any) => {
  try {
    const [
      totalTeachers,
      totalStudents,
      totalClasses,
      totalAttendanceLogs,
      recentRegistrations
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.class.count(),
      prisma.attendanceLog.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalTeachers,
        totalStudents,
        totalClasses,
        totalAttendances: totalAttendanceLogs,
        recentRegistrations
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
