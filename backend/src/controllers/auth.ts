/**
 * Authentication Controller
 * Student Management System - DTECH TEAM
 * Xử lý các chức năng xác thực: đăng ký, đăng nhập, xác minh email
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../utils/auth';
import emailServiceInstance from '../utils/emailService';

const prisma = new PrismaClient();

class AuthController {
  /**
   * Đăng ký người dùng mới
   */
  static async register(req: Request, res: Response) {
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
      const passwordValidation = AuthUtils.validatePassword(password);
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
        // Nếu user đã verified → không cho đăng ký lại
        if (existingUser.isVerified) {
          return res.status(409).json({
            success: false,
            message: 'Email này đã được đăng ký và xác thực. Vui lòng đăng nhập.'
          });
        }

        // Nếu user chưa verified → xóa token cũ, tạo token mới, gửi lại email
        await prisma.emailVerificationToken.deleteMany({ where: { email } });

        const hashedPassword = await AuthUtils.hashPassword(password);
        const emailToken = AuthUtils.generateEmailToken();

        // Cập nhật lại thông tin user (password mới, name, role)
        await prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            name,
            role: role === 'ADMIN' ? 'ADMIN' : role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          }
        });

        await prisma.emailVerificationToken.create({
          data: {
            email,
            token: emailToken,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            user: { connect: { email } }
          }
        });

        await emailServiceInstance.sendEmailVerification(email, emailToken);

        console.log(`🔗 Re-sent verification for unverified user ${email}: ${emailToken}`);

        return res.status(201).json({
          success: true,
          message: 'Tài khoản chưa xác thực. Mã xác thực mới đã được gửi đến email của bạn.',
          data: {
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name,
              role: existingUser.role,
              isVerified: false
            }
          }
        });
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(password);

      // Generate email verification token
      const emailToken = AuthUtils.generateEmailToken();

      // Tạo user mới
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: role === 'ADMIN' ? 'ADMIN' : role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
          isVerified: false // Cần email verification
        }
      });

      // Tạo email verification token
      await prisma.emailVerificationToken.create({
        data: {
          email: user.email,
          token: emailToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          user: {
            connect: { email: user.email }
          }
        }
      });

      // Gửi email xác thực
      await emailServiceInstance.sendEmailVerification(user.email, emailToken);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified
            // Sử dụng isVerified field
          }
        }
      });

    } catch (error) {
      console.error('Register error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đăng nhập người dùng
   */
  static async login(req: Request, res: Response) {
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
      const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Kiểm tra email đã được xác thực chưa
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }

      // Tạo JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isVerified: user.isVerified
        // Sử dụng isVerified field
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified
            // Sử dụng isVerified field
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xác thực email với token
   */
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params; // Lấy token từ URL
      
      console.log('🔍 DEBUG - Verification request:');
      console.log('   Token received:', token);
      console.log('   Token type:', typeof token);
      console.log('   Token length:', token.length);

      // Tìm token trong database
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });
      
      console.log('   Database result:', verificationToken ? 'FOUND' : 'NOT FOUND');
      if (verificationToken) {
        console.log('   DB token:', verificationToken.token);
        console.log('   DB token type:', typeof verificationToken.token);
        console.log('   Tokens match:', verificationToken.token === token);
      }

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
        data: { isVerified: true }
      });

      // Xóa verification token đã sử dụng
      await prisma.emailVerificationToken.delete({
        where: { token }
      });

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Kiểm tra token xác thực có hợp lệ không (cho frontend)
   */
  static async checkVerificationToken(req: Request, res: Response) {
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
          message: 'Invalid verification token',
          data: { isValid: false }
        });
      }

      // Kiểm tra token đã hết hạn chưa
      if (verificationToken.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired',
          data: { isValid: false, expired: true }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: { 
          isValid: true,
          email: verificationToken.email,
          expiresAt: verificationToken.expiresAt
        }
      });

    } catch (error) {
      console.error('Check verification token error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Xác thực email bằng mã verification code
   */
  static async verifyEmailCode(req: Request, res: Response) {
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

      const { email, verificationCode } = req.body;

      console.log('🔍 DEBUG - Email verification by code:');
      console.log('   Email:', email);
      console.log('   Code:', verificationCode);

      // Tìm token trong database bằng verification code
      const verificationToken = await prisma.emailVerificationToken.findFirst({
        where: { 
          email,
          token: verificationCode 
        },
        include: { user: true }
      });

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code or email'
        });
      }

      // Kiểm tra token đã hết hạn chưa
      if (verificationToken.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired'
        });
      }

      // Kiểm tra user đã được verify chưa
      if (verificationToken.user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Update user email verified status
      await prisma.user.update({
        where: { email },
        data: { isVerified: true }
      });

      // Xóa verification token đã sử dụng
      await prisma.emailVerificationToken.delete({
        where: { token: verificationCode }
      });

      console.log('✅ Email verified successfully for:', email);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });

    } catch (error) {
      console.error('Email verification by code error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Lấy thông tin profile của user hiện tại
   */
  static async getProfile(req: Request, res: Response) {
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
          isVerified: true,
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

      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Gửi lại email verification
   */
  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Tìm user theo email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified'
        });
      }

      // Xóa token cũ nếu có
      await prisma.emailVerificationToken.deleteMany({
        where: { email }
      });

      // Tạo token mới
      const emailToken = AuthUtils.generateEmailToken();
      
      // Lưu token mới
      await prisma.emailVerificationToken.create({
        data: {
          email: user.email,
          token: emailToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          user: {
            connect: { email: user.email }
          }
        }
      });

      // Gửi email
      await emailServiceInstance.sendEmailVerification(user.email, emailToken);

      console.log(`🔗 Email verification token for ${email}: ${emailToken}`);

      return res.status(200).json({
        success: true,
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Đăng xuất (hiện tại chỉ trả về thông báo)
   */
  static async logout(req: Request, res: Response) {
    // Với JWT stateless, logout chỉ cần frontend xóa token
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}

export { AuthController };