import User from '../models/User.js';
import { generateTokens } from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const registerUser = async (email, password, role = 'researcher') => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw { status: 400, message: 'User already exists' };
    }

    const user = new User({
      uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      password,
      roles: Array.isArray(role) ? role : [role],
    });

    await user.save();
    logger.info(`✅ User registered: ${email}`);

    const { accessToken, refreshToken } = generateTokens(user._id, user.roles || user.role);
    return { user: user.toJSON(), accessToken, refreshToken };
  } catch (error) {
    logger.error('Registration error:', error.message);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw { status: 401, message: 'Invalid email or password' };
    }

    user.lastLogin = new Date();
    await user.save();

    logger.info(`✅ User logged in: ${email}`);

    const { accessToken, refreshToken } = generateTokens(user._id, user.roles || user.role);
    return { user: user.toJSON(), accessToken, refreshToken };
  } catch (error) {
    logger.error('Login error:', error.message);
    throw error;
  }
};

export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw { status: 404, message: 'User not found' };
    }
    return user;
  } catch (error) {
    logger.error('Get user error:', error.message);
    throw error;
  }
};

export default {
  registerUser,
  loginUser,
  getUserById,
};
