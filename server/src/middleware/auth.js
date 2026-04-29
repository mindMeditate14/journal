import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import User from '../models/User.js';

export const generateTokens = (userId, role) => {
  const roles = Array.isArray(role) ? role : [role].filter(Boolean);
  const normalizedRoles = roles.length > 0 ? roles : ['researcher'];
  const accessToken = jwt.sign(
    { userId, roles: normalizedRoles, role: normalizedRoles[0] },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch (error) {
    logger.warn('Access token verification failed:', error.message);
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Fetch user from database to set req.user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = decoded.userId;
    req.user = user;
    req.roles = Array.isArray(decoded.roles)
      ? decoded.roles
      : [decoded.role].filter(Boolean);
    req.role = req.roles[0] || 'researcher';
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRoles = Array.isArray(req.roles) ? req.roles : [req.role].filter(Boolean);
    if (!userRoles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireRoles = (roles) => (req, res, next) => {
  const userRoles = Array.isArray(req.roles) ? req.roles : [req.role].filter(Boolean);
  if (!userRoles.some((r) => roles.includes(r))) {
    return res.status(403).json({
      error: 'Forbidden',
      requiredRoles: roles,
      userRole: userRoles,
    });
  }
  next();
};

export const adminMiddleware = requireRole(['admin']);
export const researcherMiddleware = requireRole(['admin', 'editor', 'researcher']);

export default { authMiddleware, requireRole, adminMiddleware };
