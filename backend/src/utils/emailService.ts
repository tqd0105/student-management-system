/**
 * Student Management System - LIGHTBRAVE Team
 * Gửi email thông qua Nodemailer với Gmail SMTP
 * Cấu hình transporter với Gmail
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Cấu hình transporter với Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Email Gmail của bạn
      pass: process.env.GMAIL_APP_PASSWORD // App Password từ Gmail
    }
  });
};

/**
 * Gửi email thông qua Gmail SMTP
 * @param to - Email người nhận
 * @param subject - Tiêu đề email
 * @param html - Nội dung HTML
 */
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    // ENABLE REAL EMAIL SENDING FOR TESTING
    // Development: Simulate email để dễ test
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('\n📧 [DEV MODE] Email Service - Email được gửi (mô phỏng):');
    //   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    //   console.log('📬 Đến:', to);
    //   console.log('📝 Tiêu đề:', subject);
    //   console.log('📄 Nội dung preview:');
    //   console.log(html.substring(0, 200).replace(/<[^>]*>/g, '') + '...');
    //   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    //   console.log('✅ [DEV MODE] Email đã được gửi thành công (mô phỏng)\n');
    //   
    //   // Giả lập delay gửi email
    //   await new Promise(resolve => setTimeout(resolve, 500));
    //   return;
    // }

    // REAL EMAIL SENDING - Always enabled for testing
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error('Gmail credentials not configured. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    }

    console.log('\n📧 [REAL EMAIL] Sending email via Gmail SMTP...');
    console.log('📬 To:', to);
    console.log('📝 Subject:', subject);

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Student Management System - LIGHTBRAVE Team" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ [REAL EMAIL] Email sent successfully! Message ID:', info.messageId);
    console.log('📧 Email delivered to:', to);
    
  } catch (error) {
    console.error('❌ Email service error:', error);
    // In development, log error but don't crash
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [DEV MODE] Email failed, continuing...');
      console.error('Email error details:', error);
      return;
    }
    throw error;
  }
};

/**
 * Gửi email xác thực account với mã 6 số
 * @param to - Email người nhận  
 * @param token - Mã xác thực 6 số
 */
export const sendEmailVerification = async (to: string, token: string): Promise<void> => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?email=${encodeURIComponent(to)}`;
  
  const subject = '🔐 Mã Xác Thực Email - Student Management System';
  const html = EmailTemplates.emailVerification(to, token, verifyUrl);
  
  await sendEmail(to, subject, html);
};

/**
 * Email templates
 */
export const EmailTemplates = {
  emailVerification: (email: string, token: string, verifyUrl: string): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Mã Xác Thực Email</h1>
        <p style="color: #dbeafe; margin: 10px 0 0 0; font-size: 16px;">Student Management System</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <h2 style="color: #374151; margin-top: 0;">Chào mừng!</h2>
        
        <p style="color: #6b7280; line-height: 1.6;">
          Cảm ơn bạn đã đăng ký tài khoản Student Management System. 
          Để hoàn tất đăng ký và bảo mật tài khoản, vui lòng xác thực email bằng mã dưới đây.
        </p>
        
        <div style="background-color: #eff6ff; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin-top: 0; color: #374151; font-size: 18px;">🔑 Mã Xác Thực của bạn:</h3>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 2px solid #3b82f6; text-align: center; margin: 15px 0;">
            <code style="font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 4px; background-color: #f8fafc; padding: 10px 20px; border-radius: 6px;">${token}</code>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0; text-align: center;">
            <strong>Sao chép mã này và nhập vào trang xác thực</strong>
          </p>
        </div>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 25px 0;">
          <h4 style="color: #dc2626; margin-top: 0; font-size: 16px;">⚠️ Lưu ý quan trọng:</h4>
          <ul style="color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Hãy copy mã số và nhập thủ công</li>
            <li>Mã xác thực có hiệu lực trong <strong>24 giờ</strong></li>
            <li>Chỉ sử dụng mã này một lần duy nhất</li>
            <li>Nếu không phải bạn đăng ký, hãy bỏ qua email này</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Đi đến trang xác thực email
          </a>
          <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
            Link này chỉ dẫn đến trang nhập mã, không tự động xác thực
          </p>
        </div>
        
        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 25px 0;">
          <h4 style="color: #0c4a6e; margin-top: 0;">📋 Hướng dẫn xác thực:</h4>
          <ol style="color: #075985; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>Copy mã 6 số phía trên</li>
            <li>Click vào nút "Đi đến trang xác thực email"</li>
            <li>Nhập email và mã xác thực vào form</li>
            <li>Click "Xác thực" để hoàn tất</li>
          </ol>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Trân trọng,</p>
          <p style="margin: 5px 0; font-weight: 600; color: #3b82f6;">LIGHTBRAVE Team</p>
          <p style="margin: 0;">Student Management System</p>
        </div>
      </div>
    </div>
  `,

  teacherWelcome: (name: string, email: string, password: string): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Student Management System</h1>
        <p style="color: #e5e7eb; margin: 10px 0 0 0; font-size: 16px;">Teacher Account Created</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <h2 style="color: #374151; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #6b7280; line-height: 1.6;">
          A teacher account has been created for you by the system administrator. 
          You can now access the system and manage your classes and student attendance.
        </p>
        
        <div style="background-color: #f3f4f6; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #7c3aed;">
          <h3 style="margin-top: 0; color: #374151; font-size: 18px;">🔑 Your Login Credentials:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #374151; font-family: monospace; background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Temporary Password:</td>
              <td style="padding: 8px 0; color: #374151; font-family: monospace; background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${password}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b; margin: 25px 0;">
          <p style="margin: 0; color: #92400e; font-weight: 600;">
            ⚠️ <strong>Important Security Notice:</strong>
          </p>
          <p style="margin: 8px 0 0 0; color: #92400e;">
            Please log in and change your password immediately for security reasons. 
            This temporary password should not be shared with anyone.
          </p>
        </div>
        
        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981; margin: 25px 0;">
          <h4 style="margin-top: 0; color: #065f46;">🎯 What you can do:</h4>
          <ul style="color: #047857; margin: 0; padding-left: 20px;">
            <li>Create and manage your classes</li>
            <li>Generate QR codes for attendance</li>
            <li>Track student attendance records</li>
            <li>View attendance analytics and reports</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <p style="color: #6b7280; line-height: 1.6;">
          If you have any questions or need assistance, please contact the system administrator.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Best regards,</p>
          <p style="margin: 5px 0; font-weight: 600; color: #7c3aed;">LIGHTBRAVE Team</p>
          <p style="margin: 0;">Student Management System</p>
        </div>
      </div>
    </div>
  `,

  studentWelcome: (name: string, email: string): string => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Student Management System</h1>
        <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Student Account Verified</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <h2 style="color: #374151; margin-top: 0;">Hello ${name},</h2>
        
        <p style="color: #6b7280; line-height: 1.6;">
          Welcome! Your student account has been successfully verified. 
          You can now participate in classes and use the QR attendance system.
        </p>
        
        <div style="background-color: #ecfdf5; padding: 25px; border-radius: 12px; border-left: 4px solid #10b981; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #065f46; font-size: 18px;">🎓 Your Student Features:</h3>
          <ul style="color: #047857; margin: 10px 0; padding-left: 20px;">
            <li>Join classes using invite codes</li>
            <li>Scan QR codes for quick attendance</li>
            <li>View your attendance history</li>
            <li>Access class schedules and materials</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Access Your Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="text-align: center; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Best regards,</p>
          <p style="margin: 5px 0; font-weight: 600; color: #10b981;">LIGHTBRAVE Team</p>
          <p style="margin: 0;">Student Management System</p>
        </div>
      </div>
    </div>
  `
};

export default { sendEmail, sendEmailVerification, EmailTemplates };
