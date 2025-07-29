import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { requireAuth } from '../middleware/auth';
import { 
  registerValidation, 
  loginValidation, 
  verifyEmailValidation 
} from '../middleware/validation';

// Router instance cho authentication endpoints
const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, AuthController.login);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmailValidation, AuthController.verifyEmail);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', requireAuth(), AuthController.getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', requireAuth(), AuthController.logout);

// Export router để sử dụng trong main app
export default router;
