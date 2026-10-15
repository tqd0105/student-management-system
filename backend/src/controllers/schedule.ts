/**
 * Schedule Controller
 * Student Management System - LightBrave Team
 * Xử lý nghiệp vụ Thời Khóa Biểu & Lịch Học, Lịch Thi, Sự Kiện
 */

import { Request, Response } from 'express';
import prisma from '../prisma';
import { ScheduleType } from '@prisma/client';

export class ScheduleController {
  /**
   * @route   GET /api/schedule/my-schedule
   * @desc    Lấy toàn bộ thời khóa biểu của người dùng hiện tại (Sinh viên / Giảng viên / Admin)
   * @access  Private (Mọi vai trò đăng nhập)
   */
  static async getMySchedule(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      const { type, classId } = req.query;

      let whereClause: any = {};

      // 1. Phân quyền theo vai trò
      if (user.role === 'TEACHER') {
        // Lấy danh sách lớp giảng viên đang phụ trách
        const teacherClasses = await prisma.class.findMany({
          where: { teacherId: user.userId },
          select: { id: true },
        });
        const classIds = teacherClasses.map((c) => c.id);

        whereClause = {
          OR: [
            { classId: { in: classIds } },
            { createdById: user.userId },
          ],
        };
      } else if (user.role === 'STUDENT') {
        // Lấy danh sách lớp sinh viên đã tham gia (enrollments)
        const enrollments = await prisma.classEnrollment.findMany({
          where: { studentId: user.userId },
          select: { classId: true },
        });
        const enrolledClassIds = enrollments.map((e) => e.classId);

        whereClause = {
          OR: [
            { classId: { in: enrolledClassIds } },
            { classId: null }, // Sự kiện chung toàn trường
          ],
        };
      } else if (user.role === 'ADMIN') {
        // Admin xem toàn bộ
        whereClause = {};
      }

      // 2. Bộ lọc theo loại sự kiện (CLASS, EXAM, EVENT, OTHER)
      if (type && type !== 'ALL') {
        const validTypes = Object.values(ScheduleType);
        if (validTypes.includes(type as ScheduleType)) {
          whereClause.type = type as ScheduleType;
        }
      }

      // 3. Bộ lọc theo lớp học cụ thể (nếu có truyền)
      if (classId && typeof classId === 'string' && classId.trim() !== '') {
        whereClause.classId = classId;
      }

      const schedules = await prisma.scheduleEvent.findMany({
        where: whereClause,
        include: {
          class: {
            select: {
              id: true,
              name: true,
              teacherId: true,
              teacher: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { dayOfWeek: 'asc' },
          { startTime: 'asc' },
        ],
      });

      res.json({
        success: true,
        message: 'Lấy thời khóa biểu thành công',
        data: schedules,
      });
    } catch (error: any) {
      console.error('Lỗi khi lấy thời khóa biểu:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy thời khóa biểu',
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/schedule/classes
   * @desc    Lấy danh sách lớp học mà Giảng viên phụ trách để gắn vào form tạo lịch
   * @access  Teacher / Admin
   */
  static async getClassesForSchedule(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      let classes;
      if (user.role === 'ADMIN') {
        classes = await prisma.class.findMany({
          select: { id: true, name: true, teacherId: true },
          orderBy: { name: 'asc' },
        });
      } else {
        classes = await prisma.class.findMany({
          where: { teacherId: user.userId },
          select: { id: true, name: true, teacherId: true },
          orderBy: { name: 'asc' },
        });
      }

      res.json({
        success: true,
        data: classes,
      });
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách lớp học:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi lấy danh sách lớp học',
        error: error.message,
      });
    }
  }

  /**
   * @route   POST /api/schedule/events
   * @desc    Tạo mới một mục thời khóa biểu / lịch học / lịch thi / sự kiện
   * @access  Teacher / Admin
   */
  static async createScheduleEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      const {
        classId,
        title,
        type = 'CLASS',
        isRecurring = true,
        dayOfWeek,
        startTime,
        endTime,
        room,
        specificDate,
        startDate,
        endDate,
        description,
        color = 'blue',
        isPaused = false,
        pauseReason,
        pauseStartDate,
        pauseEndDate,
      } = req.body;

      // 1. Validation cơ bản
      if (!title || !title.trim()) {
        res.status(400).json({ success: false, message: 'Tiêu đề môn học / sự kiện là bắt buộc' });
        return;
      }

      if (!startTime || !endTime) {
        res.status(400).json({ success: false, message: 'Giờ bắt đầu và kết thúc là bắt buộc' });
        return;
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        res.status(400).json({ success: false, message: 'Định dạng giờ phải là HH:mm (ví dụ 07:30)' });
        return;
      }

      if (startTime >= endTime) {
        res.status(400).json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' });
        return;
      }

      if (isRecurring) {
        if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) {
          res.status(400).json({
            success: false,
            message: 'Lịch định kỳ yêu cầu chọn Thứ trong tuần (1 = Thứ 2 ... 7 = Chủ Nhật)',
          });
          return;
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          res.status(400).json({
            success: false,
            message: 'Ngày kết thúc áp dụng lặp phải sau ngày bắt đầu',
          });
          return;
        }
      } else {
        if (!specificDate) {
          res.status(400).json({
            success: false,
            message: 'Lịch một lần / lịch thi yêu cầu ngày diễn ra cụ thể',
          });
          return;
        }
      }

      // 2. Kiểm tra quyền trên lớp học
      if (classId) {
        const targetClass = await prisma.class.findUnique({
          where: { id: classId },
        });

        if (!targetClass) {
          res.status(404).json({ success: false, message: 'Lớp học không tồn tại' });
          return;
        }

        if (user.role === 'TEACHER' && targetClass.teacherId !== user.userId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xếp lịch cho lớp do chính mình phụ trách',
          });
          return;
        }
      }

      // 3. Kiểm tra xung đột phòng học (nếu có nhập phòng)
      if (room && room.trim()) {
        const conflictQuery: any = {
          room: room.trim(),
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        };

        if (isRecurring) {
          conflictQuery.isRecurring = true;
          conflictQuery.dayOfWeek = Number(dayOfWeek);
        } else {
          const parsedDate = new Date(specificDate);
          const startOfDay = new Date(parsedDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(parsedDate.setHours(23, 59, 59, 999));
          conflictQuery.specificDate = {
            gte: startOfDay,
            lte: endOfDay,
          };
        }

        const conflict = await prisma.scheduleEvent.findFirst({
          where: conflictQuery,
        });

        if (conflict) {
          res.status(409).json({
            success: false,
            message: `Trùng phòng học! Phòng "${room.trim()}" đã có lịch "${conflict.title}" từ ${conflict.startTime} đến ${conflict.endTime}.`,
          });
          return;
        }
      }

      // 4. Tạo bản ghi
      const newEvent = await prisma.scheduleEvent.create({
        data: {
          classId: classId || null,
          title: title.trim(),
          type: type as ScheduleType,
          isRecurring: Boolean(isRecurring),
          dayOfWeek: isRecurring ? Number(dayOfWeek) : null,
          startTime,
          endTime,
          room: room ? room.trim() : null,
          specificDate: !isRecurring && specificDate ? new Date(specificDate) : null,
          startDate: isRecurring && startDate ? new Date(startDate) : null,
          endDate: isRecurring && endDate ? new Date(endDate) : null,
          description: description ? description.trim() : null,
          color: color || 'blue',
          isPaused: Boolean(isPaused),
          pauseReason: isPaused && pauseReason ? pauseReason.trim() : null,
          pauseStartDate: isPaused && pauseStartDate ? new Date(pauseStartDate) : null,
          pauseEndDate: isPaused && pauseEndDate ? new Date(pauseEndDate) : null,
          createdById: user.userId,
        },
        include: {
          class: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Tạo lịch học / sự kiện thành công',
        data: newEvent,
      });
    } catch (error: any) {
      console.error('Lỗi khi tạo lịch:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi tạo lịch',
        error: error.message,
      });
    }
  }

  /**
   * @route   PUT /api/schedule/events/:id
   * @desc    Cập nhật thời khóa biểu
   * @access  Teacher (người tạo / phụ trách lớp) / Admin
   */
  static async updateScheduleEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      const existingEvent = await prisma.scheduleEvent.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!existingEvent) {
        res.status(404).json({ success: false, message: 'Không tìm thấy lịch học' });
        return;
      }

      // Kiểm tra quyền
      const isOwner = existingEvent.createdById === user.userId;
      const isClassTeacher = existingEvent.class?.teacherId === user.userId;
      const isAdmin = user.role === 'ADMIN';

      if (!isOwner && !isClassTeacher && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chỉnh sửa mục thời khóa biểu này',
        });
        return;
      }

      const {
        classId,
        title,
        type,
        isRecurring,
        dayOfWeek,
        startTime,
        endTime,
        room,
        specificDate,
        startDate,
        endDate,
        description,
        color,
        isPaused,
        pauseReason,
        pauseStartDate,
        pauseEndDate,
      } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title.trim();
      if (type !== undefined) updateData.type = type as ScheduleType;
      if (isRecurring !== undefined) updateData.isRecurring = Boolean(isRecurring);
      if (dayOfWeek !== undefined) updateData.dayOfWeek = Number(dayOfWeek);
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (room !== undefined) updateData.room = room ? room.trim() : null;
      if (specificDate !== undefined) {
        updateData.specificDate = specificDate ? new Date(specificDate) : null;
      }
      if (startDate !== undefined) {
        updateData.startDate = startDate ? new Date(startDate) : null;
      }
      if (endDate !== undefined) {
        updateData.endDate = endDate ? new Date(endDate) : null;
      }
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (color !== undefined) updateData.color = color;
      if (classId !== undefined) updateData.classId = classId || null;
      if (isPaused !== undefined) updateData.isPaused = Boolean(isPaused);
      if (pauseReason !== undefined) updateData.pauseReason = pauseReason ? pauseReason.trim() : null;
      if (pauseStartDate !== undefined) {
        updateData.pauseStartDate = pauseStartDate ? new Date(pauseStartDate) : null;
      }
      if (pauseEndDate !== undefined) {
        updateData.pauseEndDate = pauseEndDate ? new Date(pauseEndDate) : null;
      }

      const updated = await prisma.scheduleEvent.update({
        where: { id },
        data: updateData,
        include: {
          class: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      res.json({
        success: true,
        message: 'Cập nhật lịch học thành công',
        data: updated,
      });
    } catch (error: any) {
      console.error('Lỗi khi cập nhật lịch:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi cập nhật lịch',
        error: error.message,
      });
    }
  }

  /**
   * @route   PATCH /api/schedule/events/:id/pause
   * @desc    Tạm ngưng hoặc khôi phục hoạt động của một mục lịch học / sự kiện với tùy chỉnh lý do và ngày
   * @access  Teacher (người tạo / phụ trách lớp) / Admin
   */
  static async togglePauseScheduleEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      const existingEvent = await prisma.scheduleEvent.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!existingEvent) {
        res.status(404).json({ success: false, message: 'Không tìm thấy lịch học' });
        return;
      }

      // Kiểm tra quyền
      const isOwner = existingEvent.createdById === user.userId;
      const isClassTeacher = existingEvent.class?.teacherId === user.userId;
      const isAdmin = user.role === 'ADMIN';

      if (!isOwner && !isClassTeacher && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền thay đổi trạng thái tạm ngưng mục thời khóa biểu này',
        });
        return;
      }

      const { isPaused, pauseReason, pauseStartDate, pauseEndDate } = req.body;

      const updateData: any = {
        isPaused: Boolean(isPaused),
      };

      if (isPaused) {
        updateData.pauseReason = pauseReason ? String(pauseReason).trim() : null;
        updateData.pauseStartDate = pauseStartDate ? new Date(pauseStartDate) : null;
        updateData.pauseEndDate = pauseEndDate ? new Date(pauseEndDate) : null;
      } else {
        // Khi khôi phục lịch
        updateData.pauseReason = null;
        updateData.pauseStartDate = null;
        updateData.pauseEndDate = null;
      }

      const updated = await prisma.scheduleEvent.update({
        where: { id },
        data: updateData,
        include: {
          class: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      res.json({
        success: true,
        message: isPaused ? 'Đã tạm ngưng lịch thành công' : 'Đã khôi phục hoạt động cho lịch thành công',
        data: updated,
      });
    } catch (error: any) {
      console.error('Lỗi khi cập nhật trạng thái tạm ngưng lịch:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi thay đổi trạng thái tạm ngưng lịch',
        error: error.message,
      });
    }
  }

  /**
   * @route   DELETE /api/schedule/events/:id
   * @desc    Xóa một mục thời khóa biểu
   * @access  Teacher (người tạo / phụ trách lớp) / Admin
   */
  static async deleteScheduleEvent(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { id } = req.params;

      if (!user) {
        res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
        return;
      }

      const existingEvent = await prisma.scheduleEvent.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!existingEvent) {
        res.status(404).json({ success: false, message: 'Không tìm thấy lịch học' });
        return;
      }

      // Kiểm tra quyền
      const isOwner = existingEvent.createdById === user.userId;
      const isClassTeacher = existingEvent.class?.teacherId === user.userId;
      const isAdmin = user.role === 'ADMIN';

      if (!isOwner && !isClassTeacher && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa mục thời khóa biểu này',
        });
        return;
      }

      await prisma.scheduleEvent.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Đã xóa lịch học thành công',
      });
    } catch (error: any) {
      console.error('Lỗi khi xóa lịch:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi máy chủ khi xóa lịch',
        error: error.message,
      });
    }
  }
}
export default ScheduleController;
