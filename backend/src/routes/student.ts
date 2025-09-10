/**
 * Student Routes
 * Student Management System - DTECH TEAM
 * Routes cho các chức năng sinh viên
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getStudentClasses,
  scanQRAndCheckIn,
  getAttendanceHistory,
  getStudentProfile,
  simpleCheckIn
} from '../controllers/student';

const router = Router();

// Middleware: Yêu cầu đăng nhập và là STUDENT hoặc cao hơn
router.use(requireAuth(['STUDENT', 'TEACHER', 'ADMIN']));

// Profile Routes
router.get('/profile', getStudentProfile);                          // Lấy thông tin cá nhân

// Class Management Routes
router.get('/classes', getStudentClasses);                          // Lấy danh sách lớp đã đăng ký

// Attendance Routes
router.post('/scan-qr', scanQRAndCheckIn);                          // Quét QR và điểm danh
router.get('/attendance', getAttendanceHistory);                    // Lịch sử điểm danh
router.post('/checkin', simpleCheckIn);                             // Điểm danh đơn giản (legacy)

export default router;
