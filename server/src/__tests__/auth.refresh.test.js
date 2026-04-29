/**
 * Regression test: POST /api/auth/refresh must preserve the user's current DB role.
 * Bug that was fixed: the refresh handler had hardcoded `generateTokens(userId, 'reader')`,
 * which silently stripped admin role on every token refresh.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth middleware module before importing the controller
vi.mock('../middleware/auth.js', () => ({
  verifyRefreshToken: vi.fn(),
  generateTokens: vi.fn(),
  authMiddleware: vi.fn((req, _res, next) => next()),
  requireRole: vi.fn(() => (_req, _res, next) => next()),
  requireRoles: vi.fn(() => (_req, _res, next) => next()),
}));

vi.mock('../services/authService.js', () => ({
  getUserById: vi.fn(),
  default: { getUserById: vi.fn() },
}));

import { verifyRefreshToken, generateTokens } from '../middleware/auth.js';
import { getUserById } from '../services/authService.js';
import { refresh } from '../controllers/authController.js';

const makeReqRes = (body = {}) => {
  const req = { body };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
};

describe('POST /api/auth/refresh — role preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the role from the database, not a hardcoded fallback', async () => {
    const userId = 'user_abc123';
    verifyRefreshToken.mockReturnValue({ userId });
    getUserById.mockResolvedValue({ _id: userId, role: 'admin' });
    generateTokens.mockReturnValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const { req, res, next } = makeReqRes({ refreshToken: 'valid-refresh-token' });

    // refresh handler is async (internally uses .then chain)
    await new Promise((resolve) => {
      res.json.mockImplementation(resolve);
      refresh(req, res, next);
    });

    // generateTokens MUST be called with the DB role, not 'reader'
    expect(generateTokens).toHaveBeenCalledWith(userId, 'admin');
    expect(generateTokens).not.toHaveBeenCalledWith(expect.anything(), 'reader');
  });

  it('preserves researcher role from DB', async () => {
    const userId = 'user_researcher';
    verifyRefreshToken.mockReturnValue({ userId });
    getUserById.mockResolvedValue({ _id: userId, role: 'researcher' });
    generateTokens.mockReturnValue({ accessToken: 'tok', refreshToken: 'rtok' });

    const { req, res } = makeReqRes({ refreshToken: 'valid-refresh-token' });
    await new Promise((resolve) => {
      res.json.mockImplementation(resolve);
      refresh(req, res, vi.fn());
    });

    expect(generateTokens).toHaveBeenCalledWith(userId, 'researcher');
  });

  it('returns 400 when refreshToken is missing', () => {
    const { req, res, next } = makeReqRes({});
    refresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when refreshToken is invalid', () => {
    verifyRefreshToken.mockReturnValue(null);
    const { req, res, next } = makeReqRes({ refreshToken: 'bad-token' });
    refresh(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
