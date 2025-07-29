/**
 * Class Management Routes
 * Student Management System - DTECH TEAM
 * Routes cho quản lý lớp học và enrollment
 */

import { Router } from 'express';
import { ClassController } from '../controllers/class';
import { requireAuth, requireAdmin, requireTeacher } from '../middleware/auth';
import { 
  createClassValidation,
  updateClassValidation,
  enrollmentValidation
} from '../middleware/validation';

// Router instance cho class management endpoints
const router = Router();

/**
 * @route   GET /api/classes
 * @desc    Lấy danh sách tất cả lớp học (với pagination, search, filter)
 * @access  Teacher và Admin
 */
router.get('/', requireTeacher, ClassController.getAllClasses);

/**
 * @route   GET /api/classes/:id
 * @desc    Lấy thông tin lớp học theo ID
 * @access  Teacher và Admin (chỉ lớp của mình), Student (chỉ lớp đã enroll)
 */
router.get('/:id', requireAuth(), ClassController.getClassById);

/**
 * @route   POST /api/classes
 * @desc    Tạo lớp học mới
 * @access  Teacher và Admin
 */
router.post('/', requireTeacher, createClassValidation, ClassController.createClass);

/**
 * @route   PUT /api/classes/:id
 * @desc    Cập nhật thông tin lớp học
 * @access  Teacher (chỉ lớp của mình) và Admin
 */
router.put('/:id', requireTeacher, updateClassValidation, ClassController.updateClass);

/**
 * @route   DELETE /api/classes/:id
 * @desc    Xóa lớp học
 * @access  Admin only
 */
router.delete('/:id', requireAdmin, ClassController.deleteClass);

/**
 * @route   POST /api/classes/enroll
 * @desc    Enroll student vào lớp học
 * @access  Teacher và Admin
 */
router.post('/enroll', requireTeacher, enrollmentValidation, ClassController.enrollStudent);

/**
 * @route   POST /api/classes/unenroll
 * @desc    Unenroll student khỏi lớp học
 * @access  Teacher và Admin
 */
router.post('/unenroll', requireTeacher, enrollmentValidation, ClassController.unenrollStudent);

// Export router để sử dụng trong main app
export default router;
