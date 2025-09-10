import nodemailer, { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = this.createTransporter();
  }

  private createTransporter(): Transporter {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    return nodemailer.createTransport(config);
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"DTECH TEAM - Student Management System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🎓 Xác thực tài khoản - DTECH TEAM | Student Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h2>🎓 DTECH TEAM | Student Management System</h2>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc;">
            <h2>Xác thực tài khoản của bạn</h2>
            <p>Chào bạn,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản lớp học IELTS tại Student Management System. Để hoàn tất quá trình đăng ký, vui lòng xác thực email của bạn bằng cách nhấp vào nút bên dưới:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                ✅ Xác thực Email
              </a>
            </div>
            
            <p>Hoặc copy và paste link sau vào trình duyệt:</p>
            <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 5px;">
              ${verificationUrl}
            </p>
            
            <p><strong>Lưu ý:</strong> Bạn không nên chia sẻ link với bất kỳ ai. Link này sẽ hết hạn sau 24 giờ.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email này.
              <br>
              Trân trọng,<br>
              <strong>DTECH TEAM</strong>
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"DTECH TEAM - Student Management System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 Đặt lại mật khẩu - DTECH TEAM | Student Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>🔐 Đặt lại mật khẩu <br> DTECH TEAM | Student Management System</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc;">
            <h2>Yêu cầu đặt lại mật khẩu từ hệ thống lớp học IELTS</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấp vào nút bên dưới để tạo mật khẩu mới:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                🔑 Đặt lại mật khẩu
              </a>
            </div>
            
            <p>Hoặc copy và paste link sau vào trình duyệt:</p>
            <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 5px;">
              ${resetUrl}
            </p>
            
            <p><strong>Lưu ý:</strong> Bạn không nên chia sẻ link này với ai. Link này sẽ hết hạn sau 1 giờ.</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
              <br>
              Trân trọng,<br>
              <strong>DTECH TEAM</strong>
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, name: string, role: string): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

    const mailOptions = {
      from: `"DTECH TEAM - Student Management System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🎉 Chào mừng đến với DTECH TEAM | Student Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>🎉 Chào mừng bạn đến với DTECH TEAM!</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f8fafc;">
            <h2>Xin chào ${name}!</h2>
            <p>Tài khoản <strong>${role}</strong> của bạn đã được kích hoạt thành công.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" 
                 style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                🚀 Vào hệ thống
              </a>
            </div>
            
            <h3>Tính năng chính:</h3>
            <ul>
              ${
                role === 'student' ? `
                  <li>📱 Điểm danh bằng QR code</li>
                  <li>📊 Xem lịch sử điểm danh</li>
                  <li>📚 Quản lý lớp học</li>
                ` : role === 'teacher' ? `
                  <li>👨‍🏫 Tạo và quản lý lớp học</li>
                  <li>📱 Tạo mã QR điểm danh</li>
                  <li>📊 Xem thống kê học sinh</li>
                  <li>📧 Gửi thông báo tự động</li>
                ` : `
                  <li>⚙️ Quản lý toàn bộ hệ thống</li>
                  <li>👥 Quản lý người dùng</li>
                  <li>📊 Thống kê tổng quan</li>
                  <li>🔧 Cài đặt hệ thống</li>
                `
              }
            </ul>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280;">
              Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ với <strong>DTECH TEAM</strong>.
            </p>
          </div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection failed:', error);
      return false;
    }
  }
}

// Export singleton 
export const emailService = new EmailService();
module.exports = { EmailService, emailService };
