import { registerUser, loginUser, getUserById } from '../services/authService.js';
import { verifyRefreshToken, generateTokens } from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { user, accessToken, refreshToken } = await registerUser(email, password, 'researcher');

    res.status(201).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { user, accessToken, refreshToken } = await loginUser(email, password);

    res.json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export const refresh = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    getUserById(decoded.userId)
      .then((user) => {
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(
          decoded.userId,
          user.roles || user.role || 'researcher'
        );

        res.json({
          accessToken,
          refreshToken: newRefreshToken,
        });
      })
      .catch((error) => {
        if (error.status) {
          return res.status(error.status).json({ error: error.message });
        }
        next(error);
      });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getUserById(req.userId);
    res.json(user);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
};

export default { register, login, refresh, getMe };
