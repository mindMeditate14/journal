/**
 * Admin-only route guard tests.
 * Verifies that requireRole(['admin']) blocks readers/researchers and passes admins.
 */
import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../middleware/auth.js';

const makeReqRes = (role) => {
  const req = { role };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
};

describe('requireRole admin guard', () => {
  const adminMiddleware = requireRole(['admin']);

  it('calls next() for admin users', () => {
    const { req, res, next } = makeReqRes('admin');
    adminMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 for reader users', () => {
    const { req, res, next } = makeReqRes('reader');
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for researcher users', () => {
    const { req, res, next } = makeReqRes('researcher');
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 for practitioner users', () => {
    const { req, res, next } = makeReqRes('practitioner');
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when role is undefined (unauthenticated)', () => {
    const { req, res, next } = makeReqRes(undefined);
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when role is empty string', () => {
    const { req, res, next } = makeReqRes('');
    adminMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('multi-role: passes when user role is in the allowed list', () => {
    const multiGuard = requireRole(['admin', 'researcher']);
    const { req, res, next } = makeReqRes('researcher');
    multiGuard(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('multi-role: blocks when user role is NOT in the allowed list', () => {
    const multiGuard = requireRole(['admin', 'researcher']);
    const { req, res, next } = makeReqRes('reader');
    multiGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
