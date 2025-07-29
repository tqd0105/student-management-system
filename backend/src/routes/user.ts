/**
 * User Management Routes
 * Student Management System - DTECH TEAM
 * Routes cho CRUD users và user management
 */

import { Router } from 'express';
import { UserController } from '../controllers/user';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { 
  createUserValidation,
  updateUserValidation, 
  changePasswordValidation
} from '../middleware/validation';

// Router instance cho user management endpoints
const router = Router();

/**
 * @route   GET /api/users
 * @desc    Lấy danh sách tất cả users (với pagination, search, filter)
 * @access  Admin only
 */
router.get('/', requireAdmin, UserController.getAllUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Lấy thống kê users theo role
 * @access  Admin only
 */
router.get('/stats', requireAdmin, UserController.getUserStats);

/**
 * @route   GET /api/users/:id
 * @desc    Lấy thông tin user theo ID
 * @access  Admin hoặc chính user đó
 */
router.get('/:id', requireAuth(), UserController.getUserById);

/**
 * @route   POST /api/users
 * @desc    Tạo user mới
 * @access  Admin only
 */
router.post('/', requireAdmin, createUserValidation, UserController.createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Cập nhật thông tin user
 * @access  Admin hoặc chính user đó
 */
router.put('/:id', requireAuth(), updateUserValidation, UserController.updateUser);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Đổi mật khẩu user
 * @access  Admin hoặc chính user đó
 */
router.put('/:id/password', requireAuth(), changePasswordValidation, UserController.changePassword);

/**
 * @route   DELETE /api/users/:id
 * @desc    Xóa user
 * @access  Admin only
 */
router.delete('/:id', requireAdmin, UserController.deleteUser);

// Export router để sử dụng trong main app
export default router;
