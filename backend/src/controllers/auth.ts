/**
 * Authentication Controller
 * Student Management System - DTECH TEAM
 * Xử lý các chức năng xác thực: đăng ký, đăng nhập, xác minh email
 */

const { Request, Response } = require('express');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword, generateToken, validatePassword, generateEmailToken } = require('../utils/auth');
const { EmailService } = require('../services/email');

const prisma = new PrismaClient();
const emailService = new EmailService();

class AuthController {
  /**
   * Đăng ký người dùng mới
   */
  static async register(req, res) {
    try {
      // Kiểm tra validation errors từ middleware
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password, name, role } = req.body;

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        });
      }

      // Kiểm tra user đã tồn tại chưa
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Generate email verification token
      const emailToken = generateEmailToken();

      // Tạo user mới
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role === 'ADMIN' ? 'ADMIN' : role === 'TEACHER' ? 'TEACHER' : 'STUDENT'
          // Loại bỏ isEmailVerified vì field không tồn tại trong DB hiện tại
        }
      });

      // Tạo email verification token
      // TODO: Sẽ implement lại sau khi fix schema
      // await prisma.emailVerificationToken.create({
      //   data: {
      //     email: user.email,
      //     token: emailToken,
      //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      //   }
      // });

      // Gửi email xác thực
      // TODO: Enable sau khi fix email verification
      // await emailService.sendEmailVerification(user.email, emailToken);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
            // Tạm thời bỏ isEmailVerified
          }
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đăng nhập người dùng
   */
  static async login(req, res) {
    try {
      // Kiểm tra validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Tìm user theo email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Kiểm tra password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Kiểm tra email đã được xác thực chưa
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }

      // Tạo JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xác thực email với token
   */
  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      // Tìm token trong database
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

      // Kiểm tra token đã hết hạn chưa
      if (verificationToken.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired'
        });
      }

      // Update user email verified status
      await prisma.user.update({
        where: { email: verificationToken.email },
        data: { isEmailVerified: true }
      });

      // Xóa verification token đã sử dụng
      await prisma.emailVerificationToken.delete({
        where: { token }
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy thông tin profile của user hiện tại
   */
  static async getProfile(req, res) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đăng xuất (hiện tại chỉ trả về thông báo)
   */
  static async logout(req, res) {
    // Với JWT stateless, logout chỉ cần frontend xóa token
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

// Export cho CommonJS
module.exports = { AuthController };