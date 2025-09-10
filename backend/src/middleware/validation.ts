import { body, param } from 'express-validator';

export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'TEACHER', 'STUDENT'])
    .withMessage('Role must be ADMIN, TEACHER, or STUDENT')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const verifyEmailValidation = [
  param('token')
    .isString()
    .isLength({ min: 6, max: 64 })
    .withMessage('Invalid verification token format')
];

export const verifyEmailCodeValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('verificationCode')
    .isString()
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be exactly 6 digits')
];

// User management validations
export const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'TEACHER', 'STUDENT'])
    .withMessage('Role must be ADMIN, TEACHER, or STUDENT')
];

export const updateUserValidation = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('role')
    .optional()
    .isIn(['ADMIN', 'TEACHER', 'STUDENT'])
    .withMessage('Role must be ADMIN, TEACHER, or STUDENT')
];

export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
];

// Class management validations
export const createClassValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('qrExpiryMinutes')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('QR expiry must be between 1 and 60 minutes'),
  
  body('locationLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('locationLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('radiusMeters')
    .optional()
    .isInt({ min: 10, max: 1000 })
    .withMessage('Radius must be between 10 and 1000 meters')
];

export const updateClassValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Class name must be between 2 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('teacherId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Teacher ID cannot be empty'),
  
  body('qrExpiryMinutes')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('QR expiry must be between 1 and 60 minutes'),
  
  body('locationLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('locationLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('radiusMeters')
    .optional()
    .isInt({ min: 10, max: 1000 })
    .withMessage('Radius must be between 10 and 1000 meters')
];

export const enrollmentValidation = [
  body('classId')
    .isString()
    .notEmpty()
    .withMessage('Class ID is required'),
  
  body('studentId')
    .isString()
    .notEmpty()
    .withMessage('Student ID is required')
];

// ==================== ATTENDANCE VALIDATIONS ====================

/**
 * Validation cho tạo attendance session
 */
export const createSessionValidation = [
  body('classId')
    .isString()
    .withMessage('Class ID is required')
    .notEmpty()
    .withMessage('Class ID cannot be empty'),
    
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date')
    .custom((value) => {
      const startTime = new Date(value);
      const now = new Date();
      if (startTime < now) {
        throw new Error('Start time cannot be in the past');
      }
      return true;
    }),
    
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      const startTime = new Date(req.body.startTime);
      const endTime = new Date(value);
      if (endTime <= startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
    
  body('locationLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
    
  body('locationLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
    
  body('radiusMeters')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Radius must be between 1 and 10000 meters')
];

/**
 * Validation cho student check-in
 */
export const checkInValidation = [
  body('qrCode')
    .isString()
    .withMessage('QR code is required')
    .isLength({ min: 10 })
    .withMessage('Invalid QR code format'),
    
  body('deviceId')
    .isString()
    .withMessage('Device ID is required')
    .notEmpty()
    .withMessage('Device ID cannot be empty'),
    
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
    
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

/**
 * Validation cho session ID parameter
 */
export const sessionIdValidation = [
  param('sessionId')
    .isString()
    .withMessage('Session ID must be a string')
    .notEmpty()
    .withMessage('Session ID is required')
];

/**
 * Validation cho QR code parameter
 */
export const qrCodeValidation = [
  param('qrCode')
    .isString()
    .withMessage('QR code must be a string')
    .isLength({ min: 10 })
    .withMessage('Invalid QR code format')
];

// Export for CommonJS compatibility
module.exports = {
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  createUserValidation,
  updateUserValidation,
  changePasswordValidation,
  createClassValidation,
  updateClassValidation,
  enrollmentValidation,
  createSessionValidation,
  checkInValidation,
  sessionIdValidation,
  qrCodeValidation
};
