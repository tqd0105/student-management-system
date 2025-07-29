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
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid verification token format')
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
  
  body('teacherId')
    .isString()
    .notEmpty()
    .withMessage('Teacher ID is required'),
  
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
  enrollmentValidation
};
