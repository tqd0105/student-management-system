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

// Export for CommonJS compatibility
module.exports = {
  registerValidation,
  loginValidation,
  verifyEmailValidation
};
