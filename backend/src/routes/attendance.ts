/**
 * Attendance Routes
 * Student Management System - DTECH TEAM
 * API endpoints cho QR attendance system
 */

import express from 'express';
import { AttendanceController } from '../controllers/attendance.js';
import { requireAuth, requireAdmin, requireTeacher } from '../middleware/auth.js';
import { 
  createSessionValidation,
  checkInValidation,
  sessionIdValidation,
  qrCodeValidation
} from '../middleware/validation.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(requireAuth());

/**
 * @route   POST /api/attendance/sessions
 * @desc    Tạo session điểm danh mới
 * @access  Teacher, Admin
 * @body    { classId, startTime, endTime, locationLat?, locationLng?, radiusMeters? }
 */
router.post('/sessions', 
  requireTeacher,
  createSessionValidation,
  AttendanceController.createSession
);

/**
 * @route   GET /api/attendance/classes/:classId/sessions
 * @desc    Lấy danh sách sessions của một class
 * @access  Teacher (own classes), Student (enrolled classes), Admin
 * @query   ?page=1&limit=20
 */
router.get('/classes/:classId/sessions',
  AttendanceController.getClassSessions
);

/**
 * @route   POST /api/attendance/checkin
 * @desc    Student điểm danh qua QR code
 * @access  Student, Teacher, Admin
 * @body    { qrCode, deviceId, latitude?, longitude? }
 */
router.post('/checkin',
  checkInValidation,
  AttendanceController.checkIn
);

/**
 * @route   GET /api/attendance/qr/:qrCode
 * @desc    Lấy thông tin session từ QR code (để hiển thị trước khi điểm danh)
 * @access  All authenticated users
 */
router.get('/qr/:qrCode',
  qrCodeValidation,
  AttendanceController.getSessionByQR
);

/**
 * @route   PUT /api/attendance/sessions/:sessionId/close
 * @desc    Đóng session điểm danh
 * @access  Teacher (own sessions), Admin
 */
router.put('/sessions/:sessionId/close',
  requireTeacher,
  sessionIdValidation,
  AttendanceController.closeSession
);

/**
 * @route   GET /api/attendance/sessions/:sessionId/report
 * @desc    Lấy báo cáo điểm danh của một session
 * @access  Teacher (own sessions), Admin
 */
router.get('/sessions/:sessionId/report',
  requireTeacher,
  sessionIdValidation,
  AttendanceController.getSessionReport
);

export default router;
