/**
 * Google OAuth Controller
 * Student Management System - LIGHTBRAVE Team
 * Xử lý đăng nhập bằng Google OAuth 2.0
 */

import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../prisma';
import { AuthUtils } from '../utils/auth';
import { ensureStudentProfileAndCode } from '../utils/studentCode';

const DEFAULT_BACKEND_URL = 'https://student-management-system-udhy.onrender.com';
const DEFAULT_FRONTEND_URL = 'https://sms-fe-lovat.vercel.app';

const getGoogleClientId = (): string => {
  const val = process.env.GOOGLE_CLIENT_ID;
  if (val && val.trim() !== '' && val !== 'YOUR_GOOGLE_CLIENT_ID') {
    return val.trim();
  }
  return '';
};

const getGoogleClientSecret = (): string => {
  const val = process.env.GOOGLE_CLIENT_SECRET;
  if (val && val.trim() !== '' && val !== 'YOUR_GOOGLE_CLIENT_SECRET') {
    return val.trim();
  }
  return '';
};

const getBackendUrl = (req?: Request): string => {
  const envUrl = process.env.BACKEND_URL;
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost') && envUrl !== 'YOUR_BACKEND_URL') {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (req) {
    const host = req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      return `${proto}://${host}`;
    }
  }
  return DEFAULT_BACKEND_URL;
};

const getFrontendUrl = (req?: Request): string => {
  const envUrl = process.env.FRONTEND_URL;
  if (envUrl && envUrl.trim() !== '' && !envUrl.includes('localhost')) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return DEFAULT_FRONTEND_URL;
};

const getOAuthClient = (redirectUri: string) => new OAuth2Client(
  getGoogleClientId(),
  getGoogleClientSecret(),
  redirectUri
);

export class GoogleAuthController {
  /**
   * Step 1: Redirect user đến Google OAuth consent screen
   * GET /api/auth/google
   */
  static initiateGoogleAuth(req: Request, res: Response) {
    const targetFrontendUrl = getFrontendUrl(req);
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();

    if (!clientId || !clientSecret) {
      console.error('❌ GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được thiết lập trên môi trường máy chủ.');
      return res.redirect(`${targetFrontendUrl}/?error=oauth_missing_credentials`);
    }

    const backendUrl = getBackendUrl(req);
    const redirectUri = `${backendUrl}/api/auth/google/callback`;
    const client = getOAuthClient(redirectUri);

    // Lấy client origin từ query hoặc referer để biết redirect về đâu (Vercel, IP AWS, localhost)
    const returnUrl = (req.query.redirect_to as string) || (req.headers.referer ? new URL(req.headers.referer).origin : '') || targetFrontendUrl;

    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['email', 'profile', 'openid'],
      prompt: 'select_account', // Luôn hiện chọn tài khoản
      state: returnUrl, // Google sẽ trả lại state này nguyên vẹn trong callback
      redirect_uri: redirectUri, // Tường minh redirect_uri để tránh lỗi Missing required parameter: redirect_uri
    });

    console.log(`🔗 Google OAuth initiate -> redirect_uri: ${redirectUri}, state: ${returnUrl}`);
    res.redirect(authUrl);
  }

  /**
   * Step 2: Google redirect về đây sau khi user đồng ý
   * GET /api/auth/google/callback?code=xxx
   */
  static async googleCallback(req: Request, res: Response) {
    const { code, error, state } = req.query;

    // Xác định frontend url cần redirect về (nếu có state hợp lệ từ client)
    let targetFrontendUrl = getFrontendUrl(req);
    if (state && typeof state === 'string' && (state.startsWith('http://') || state.startsWith('https://'))) {
      targetFrontendUrl = state.replace(/\/$/, '');
    }

    // User từ chối đăng nhập
    if (error) {
      return res.redirect(`${targetFrontendUrl}/?error=google_denied`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${targetFrontendUrl}/?error=no_code`);
    }

    try {
      const backendUrl = getBackendUrl(req);
      const redirectUri = `${backendUrl}/api/auth/google/callback`;
      const client = getOAuthClient(redirectUri);

      // Đổi code lấy tokens
      const { tokens } = await client.getToken({
        code,
        redirect_uri: redirectUri,
      });
      client.setCredentials(tokens);

      // Lấy thông tin user từ Google
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: getGoogleClientId(),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.redirect(`${targetFrontendUrl}/?error=invalid_token`);
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
      const redirectUrl = `${targetFrontendUrl}/auth/google/success?token=${token}&user=${userInfo}`;
      return res.redirect(redirectUrl);

    } catch (err) {
      console.error('❌ Google OAuth callback error:', err);
      return res.redirect(`${targetFrontendUrl}/?error=oauth_failed`);
    }
  }
}
