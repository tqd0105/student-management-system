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
  getAllStudents,
  getClassStudents,
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
  getClassAttendanceStats,
  manualAttendance,
  getClassAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getClassGrades,
  updateGrades,
  getAllManagedStudents,
  getStudentProfile,
  updateStudentProfile,
  createStudentQuickAccount,
  getTuitionFees,
  getTuitionStats,
  createTuitionFee,
  recordTuitionPayment,
  updateTuitionFee,
  deleteTuitionFee,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from '../controllers/teacher';

const router = Router();

// Middleware: Yêu cầu đăng nhập và là TEACHER
router.use(requireAuth(['TEACHER', 'ADMIN']));

// Class Management Routes
router.get('/classes', getTeacherClasses);                          // Lấy danh sách lớp
router.post('/classes', createClass);                               // Tạo lớp mới
router.put('/classes/:classId', updateClass);                       // Cập nhật lớp
router.delete('/classes/:classId', deleteClass);                    // Xóa lớp

// Student Directory Routes (Teacher can see ALL students)
router.get('/students', getAllStudents);                              // Tìm kiếm sinh viên trong hệ thống

// Comprehensive Student Management Routes
router.get('/managed-students', getAllManagedStudents);                         // Danh sách học sinh quản lý
router.get('/managed-students/:studentId', getStudentProfile);                  // Chi tiết hồ sơ học sinh
router.put('/managed-students/:studentId', updateStudentProfile);               // Cập nhật hồ sơ học sinh
router.post('/managed-students', createStudentQuickAccount);                    // Tạo nhanh tài khoản học sinh

// Tuition & Fee Management Routes
router.get('/tuition-fees', getTuitionFees);                                    // Danh sách phiếu học phí
router.get('/tuition-fees/stats', getTuitionStats);                             // Thống kê tài chính học phí
router.post('/tuition-fees', createTuitionFee);                                 // Tạo khoản thu học phí
router.put('/tuition-fees/:feeId/payment', recordTuitionPayment);               // Ghi nhận thanh toán / nộp tiền
router.put('/tuition-fees/:feeId', updateTuitionFee);                           // Sửa khoản thu
router.delete('/tuition-fees/:feeId', deleteTuitionFee);                        // Xóa khoản thu

// Student Management Routes
router.get('/classes/:classId/students', getClassStudents);          // Sinh viên trong lớp (kèm điểm danh)
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
router.put('/sessions/:sessionId/attendance', manualAttendance);    // Điểm danh thủ công cho session

// Gradebook & Assignments Routes
router.get('/classes/:classId/assignments', getClassAssignments);    // Lấy danh sách cột điểm
router.post('/classes/:classId/assignments', createAssignment);      // Tạo cột điểm mới
router.put('/assignments/:assignmentId', updateAssignment);          // Cập nhật cột điểm
router.delete('/assignments/:assignmentId', deleteAssignment);       // Xóa cột điểm
router.get('/classes/:classId/grades', getClassGrades);              // Lấy bảng điểm của lớp
router.put('/classes/:classId/grades', updateGrades);                // Cập nhật điểm số

// Statistics routes
router.get('/sessions/:sessionId/stats', getSessionAttendanceStats);    // Thống kê chi tiết session
router.get('/classes/:classId/stats', getClassAttendanceStats);         // Thống kê tổng hợp class

// Learning Materials Routes
router.get('/classes/:classId/materials', getMaterials);                 // Danh sách tài liệu của lớp
router.post('/classes/:classId/materials', createMaterial);              // Thêm tài liệu mới
router.put('/materials/:materialId', updateMaterial);                    // Cập nhật tài liệu
router.delete('/materials/:materialId', deleteMaterial);                 // Xóa tài liệu

export default router;
