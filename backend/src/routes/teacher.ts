/**
 * Teacher Routes
 * Student Management System - DTECH TEAM
 * Routes cho các chức năng giáo viên
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getTeacherClasses,
  createClass,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  createAttendanceSession,
  generateQRCode,
  getClassSessions,
  endAttendanceSession,
  resumeSession,
  deleteSession,
  updateSession,
  deleteQRCode,
  getSessionAttendanceStats,
  getClassAttendanceStats
} from '../controllers/teacher';

const router = Router();

// Middleware: Yêu cầu đăng nhập và là TEACHER
router.use(requireAuth(['TEACHER', 'ADMIN']));

// Class Management Routes
router.get('/classes', getTeacherClasses);                          // Lấy danh sách lớp
router.post('/classes', createClass);                               // Tạo lớp mới
router.put('/classes/:classId', updateClass);                       // Cập nhật lớp
router.delete('/classes/:classId', deleteClass);                    // Xóa lớp

// Student Management Routes
router.post('/classes/:classId/students', addStudentToClass);        // Thêm sinh viên
router.delete('/classes/:classId/students/:studentId', removeStudentFromClass); // Xóa sinh viên

// Attendance Session Routes
router.post('/classes/:classId/sessions', createAttendanceSession);  // Tạo buổi học mới
router.get('/classes/:classId/sessions', getClassSessions);          // Lấy danh sách buổi học
router.post('/sessions/:sessionId/qr', generateQRCode);              // Tạo QR code
router.post('/sessions/:sessionId/end', endAttendanceSession);       // Dừng tạm thời buổi học
router.post('/sessions/:sessionId/resume', resumeSession);           // Tiếp tục buổi học
router.delete('/sessions/:sessionId', deleteSession);               // Xóa session hoàn toàn
router.put('/sessions/:sessionId', updateSession);                  // Cập nhật tên và thời gian session
router.delete('/sessions/:sessionId/qr', deleteQRCode);             // Xóa QR code khỏi session

// Statistics routes
router.get('/sessions/:sessionId/stats', getSessionAttendanceStats);    // Thống kê chi tiết session
router.get('/classes/:classId/stats', getClassAttendanceStats);         // Thống kê tổng hợp class

export default router;
