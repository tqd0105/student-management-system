/**
 * QR Code Service
 * Student Management System - DTECH TEAM
 * Generate và validate QR codes cho attendance system
 */

const crypto = require('crypto'); /* Tạo mã hoá, token, hash (qr có thời hạn, mã hoá mk, verifyToken để xác thực mail) */
const QRCode = require('qrcode'); /* Tạo mã qr từ chuỗi, url, anydata */

class QRService {
  /**
   * Generate unique QR code string
   */
  static generateQRCode() {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return crypto
      .createHash('sha256')
      .update(timestamp + randomBytes)
      .digest('hex');
  }

  /**
   * Generate QR code image (base64)
   */
  static async generateQRImage(qrData, options = {}) {
    try {
      const defaultOptions = {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      const qrOptions = { ...defaultOptions, ...options };
      
      // Generate QR code as base64 string
      const qrImageBase64 = await QRCode.toDataURL(qrData, qrOptions);
      
      return {
        success: true,
        qrImage: qrImageBase64,
        format: 'base64'
      };
      
    } catch (error) {
      console.error('QR Code generation error:', error);
      return {
        success: false,
        error: 'Failed to generate QR code image'
      };
    }
  }

  /**
   * Create attendance QR data object
   */
  static createAttendanceQRData(sessionId, qrCode, classInfo) {
    return {
      type: 'attendance',
      sessionId,
      qrCode,
      className: classInfo.name,
      timestamp: new Date().toISOString(),
      appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      checkInUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/attendance/${qrCode}`
    };
  }

  /**
   * Validate QR code format
   */
  static validateQRCodeFormat(qrCode) {
    if (!qrCode || typeof qrCode !== 'string') {
      return {
        valid: false,
        error: 'QR code must be a string'
      };
    }

    if (qrCode.length < 10) {
      return {
        valid: false,
        error: 'QR code too short'
      };
    }

    if (qrCode.length > 100) {
      return {
        valid: false,
        error: 'QR code too long'
      };
    }

    // Check if it's a valid hex string
    const hexRegex = /^[a-f0-9]+$/i;
    if (!hexRegex.test(qrCode)) {
      return {
        valid: false,
        error: 'Invalid QR code format'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Generate time-limited QR code với expiry
   */
  static generateTimeLimitedQR(expiryMinutes = 5) {
    const qrCode = this.generateQRCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      qrCode,
      expiresAt,
      isExpired: false
    };
  }

  /**
   * Check if QR code is expired
   */
  static isQRCodeExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  }

  /**
   * Generate QR code with embedded session data
   */
  static async generateSessionQR(session) {
    try {
      const qrData = this.createAttendanceQRData(
        session.id,
        session.qrCode,
        session.class
      );

      // Convert to JSON string for QR code
      const qrString = JSON.stringify(qrData);
      
      // Generate QR image
      const qrImage = await this.generateQRImage(qrString, {
        width: 300,
        color: {
          dark: '#1f2937', // Dark gray
          light: '#ffffff'
        }
      });

      return {
        success: true,
        qrCode: session.qrCode,
        qrData,
        qrImage: qrImage.qrImage,
        checkInUrl: qrData.checkInUrl
      };

    } catch (error) {
      console.error('Session QR generation error:', error);
      return {
        success: false,
        error: 'Failed to generate session QR code'
      };
    }
  }

  /**
   * Parse QR data from scanned code
   */
  static parseQRData(qrString) {
    try {
      const qrData = JSON.parse(qrString);
      
      if (qrData.type !== 'attendance') {
        return {
          valid: false,
          error: 'Invalid QR code type'
        };
      }

      return {
        valid: true,
        data: qrData
      };

    } catch (error) {
      // If it's not JSON, treat as simple QR code
      const validation = this.validateQRCodeFormat(qrString);
      if (validation.valid) {
        return {
          valid: true,
          data: {
            type: 'simple',
            qrCode: qrString
          }
        };
      }

      return {
        valid: false,
        error: 'Invalid QR code format'
      };
    }
  }

  /**
   * Generate multiple QR codes for batch sessions
   */
  static generateBatchQRCodes(count = 1) {
    const qrCodes = [];
    
    for (let i = 0; i < count; i++) {
      qrCodes.push(this.generateQRCode());
    }

    return qrCodes;
  }

  /**
   * Calculate QR code usage statistics
   */
  static calculateQRStats(attendanceLogs) {
    const stats = {
      totalScans: attendanceLogs.length,
      uniqueUsers: new Set(attendanceLogs.map(log => log.studentId)).size,
      scansByStatus: {
        PRESENT: 0,
        LATE: 0,
        ABSENT: 0
      },
      averageResponseTime: 0
    };

    attendanceLogs.forEach(log => {
      stats.scansByStatus[log.status]++;
    });

    return stats;
  }
}

// Export cho CommonJS
module.exports = { QRService };
