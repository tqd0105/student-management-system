/**
 * Schedule Routes
 * Student Management System - LightBrave Team
 * Endpoints cho Thời khóa biểu, Lịch học, Lịch thi, Sự kiện
 */

import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule';
import { requireAuth, requireTeacher } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/schedule/my-schedule
 * @desc    Lấy thời khóa biểu của người dùng (Sinh viên, Giảng viên, Admin)
 * @access  Private (Đăng nhập)
 */
router.get('/my-schedule', requireAuth(), ScheduleController.getMySchedule);

/**
 * @route   GET /api/schedule/classes
 * @desc    Lấy danh sách các lớp học của Giảng viên để chọn trong modal tạo lịch
 * @access  Teacher / Admin
 */
router.get('/classes', requireTeacher, ScheduleController.getClassesForSchedule);

/**
 * @route   POST /api/schedule/events
 * @desc    Tạo mới một ca học / lịch thi / sự kiện
 * @access  Teacher / Admin
 */
router.post('/events', requireTeacher, ScheduleController.createScheduleEvent);

/**
 * @route   PUT /api/schedule/events/:id
 * @desc    Chỉnh sửa ca học / lịch thi / sự kiện
 * @access  Teacher / Admin
 */
router.put('/events/:id', requireTeacher, ScheduleController.updateScheduleEvent);

/**
 * @route   DELETE /api/schedule/events/:id
 * @desc    Xóa ca học / lịch thi / sự kiện
 * @access  Teacher / Admin
 */
router.delete('/events/:id', requireTeacher, ScheduleController.deleteScheduleEvent);

export default router;
