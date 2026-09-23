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
  simpleCheckIn,
  getStudentGrades,
  getStudentAssignments,
  getStudentTuitionFees,
  getClassMaterials,
  submitAssignment,
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

// Grade Routes
router.get('/grades', getStudentGrades);                            // Bảng điểm của sinh viên

// Assignment & Submission Routes
router.get('/assignments', getStudentAssignments);                  // Danh sách bài tập & hạn nộp
router.post('/assignments/:assignmentId/submit', submitAssignment); // Nộp link bài tập

// Tuition Fee Routes
router.get('/tuition-fees', getStudentTuitionFees);                 // Học phí của sinh viên

// Learning Materials Routes
router.get('/classes/:classId/materials', getClassMaterials);       // Tài liệu học tập của lớp

export default router;
