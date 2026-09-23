/**
 * Google OAuth Controller
 * Student Management System - LIGHTBRAVE Team
 * Xử lý đăng nhập bằng Google OAuth 2.0
 */

import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import { AuthUtils } from '../utils/auth';
import { ensureStudentProfileAndCode } from '../utils/studentCode';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const BACKEND_URL = process.env.BACKEND_URL || 'https://student-management-system-udhy.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sms-fe-lovat.vercel.app';

const REDIRECT_URI = `${BACKEND_URL}/api/auth/google/callback`;

const getOAuthClient = () => new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export class GoogleAuthController {
  /**
   * Step 1: Redirect user đến Google OAuth consent screen
   * GET /api/auth/google
   */
  static initiateGoogleAuth(req: Request, res: Response) {
    const client = getOAuthClient();

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile', 'openid'],
      prompt: 'select_account', // Luôn hiện chọn tài khoản
    });

    res.redirect(authUrl);
  }

  /**
   * Step 2: Google redirect về đây sau khi user đồng ý
   * GET /api/auth/google/callback?code=xxx
   */
  static async googleCallback(req: Request, res: Response) {
    const { code, error } = req.query;

    // User từ chối đăng nhập
    if (error) {
      return res.redirect(`${FRONTEND_URL}/?error=google_denied`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${FRONTEND_URL}/?error=no_code`);
    }

    try {
      const client = getOAuthClient();

      // Đổi code lấy tokens
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Lấy thông tin user từ Google
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.redirect(`${FRONTEND_URL}/?error=invalid_token`);
      }

      const { email, name, picture, sub: googleId } = payload;

      // Tìm user theo googleId hoặc email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId },
            { email }
          ]
        }
      });

      if (user) {
        // User đã tồn tại — cập nhật googleId nếu chưa có
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId,
              avatar: picture,
              isVerified: true,
              authProvider: 'google',
            }
          });
        } else {
          // Cập nhật avatar mới nhất
          user = await prisma.user.update({
            where: { id: user.id },
            data: { avatar: picture }
          });
        }
      } else {
        // User mới — tạo tài khoản
        user = await prisma.user.create({
          data: {
            email: email!,
            name: name || email!.split('@')[0],
            googleId,
            avatar: picture,
            isVerified: true, // Google đã xác thực email
            authProvider: 'google',
            role: 'STUDENT', // Mặc định là Student, Admin có thể đổi sau
          }
        });
        console.log(`✅ New Google user created: ${email}`);
      }

      // Đảm bảo học sinh có MSSV tự động theo quy luật khi đăng nhập Google
      let studentProfile = null;
      if (user.role === 'STUDENT') {
        studentProfile = await ensureStudentProfileAndCode(user.id);
      }

      // Tạo JWT token
      const token = AuthUtils.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        isVerified: user.isVerified,
      });

      // Encode user info để truyền qua URL
      const userInfo = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        studentCode: studentProfile?.studentCode,
      }));

      // Redirect về frontend với token
      const redirectUrl = `${FRONTEND_URL}/auth/google/success?token=${token}&user=${userInfo}`;
      return res.redirect(redirectUrl);

    } catch (err) {
      console.error('❌ Google OAuth callback error:', err);
      return res.redirect(`${FRONTEND_URL}/?error=oauth_failed`);
    }
  }
}
