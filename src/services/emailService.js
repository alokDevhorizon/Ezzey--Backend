const { Resend } = require('resend');
const crypto = require('crypto');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Check if Resend is properly initialized
if (resend && process.env.RESEND_API_KEY) {
  console.log('✅ Email service (Resend) ready');
} else {
  console.log('❌ Email service error: RESEND_API_KEY not found in environment variables');
}

// Generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, verificationToken, userName) => {
  try {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}`;

    const { data, error } = await resend.emails.send({
      from: `Ezzey <onboarding@resend.dev>`,
      to: email,
      subject: 'Verify Your Email Address - Ezzey',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome to Ezzey, ${userName}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up. Please verify your email address by clicking the button below:
            </p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${verificationUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link in your browser:
            </p>
            
            <p style="color: #007bff; word-break: break-all; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              This link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Error sending verification email:', error);
      throw error;
    }

    console.log('✅ Verification email sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    const { data, error } = await resend.emails.send({
      from: `Ezzey <onboarding@resend.dev>`,
      to: email,
      subject: 'Password Reset Request - Ezzey',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi ${userName}, we received a password reset request for your Ezzey account. Click the button below to reset your password:
            </p>
            
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              Or copy and paste this link in your browser:
            </p>
            
            <p style="color: #dc3545; word-break: break-all; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Error sending password reset email:', error);
      throw error;
    }

    console.log('✅ Password reset email sent:', data);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
