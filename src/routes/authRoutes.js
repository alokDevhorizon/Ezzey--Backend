const express = require('express');
const { register, login, getProfile, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification-email', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;