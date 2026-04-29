import crypto from 'crypto';
import emailService from '../utils/emailService.js';
import logger from '../utils/logger.js';

// Request password reset
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const db = req.app.get('db');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, reset link sent' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await usersCollection.updateOne(
      { email },
      {
        $set: {
          passwordResetToken: resetTokenHash,
          passwordResetExpiresAt: resetExpiresAt,
        },
      }
    );

    // Send email with reset link
    const resetUrl = `${process.env.CLIENT_URL || 'https://journal.mind-meditate.com'}/reset-password/${resetToken}`;

    await emailService.send({
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });

    logger.info(`Password reset email sent to: ${email}`);
    res.json({ message: 'If email exists, reset link sent' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

// Reset password with token
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = req.app.get('db');
    const usersCollection = db.collection('users');

    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await usersCollection.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash the new password
    const bcryptjs = await import('bcryptjs').then(m => m.default);
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(newPassword, salt);

    // Update password and clear reset token
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: {
          passwordResetToken: '',
          passwordResetExpiresAt: '',
        },
      }
    );

    logger.info(`Password reset successful for: ${user.email}`);
    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};
