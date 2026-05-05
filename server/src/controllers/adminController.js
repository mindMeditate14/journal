import User from '../models/User.js';
import logger from '../utils/logger.js';

const ALLOWED_ROLES = ['admin', 'editor', 'researcher', 'reviewer', 'practitioner', 'reader'];
const normalizeRoles = (role, roles) => {
  const next = Array.isArray(roles) && roles.length > 0 ? roles : (role ? [role] : []);
  const unique = [...new Set(next.filter(Boolean))];
  return unique.length > 0 ? unique : ['researcher'];
};

export const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = {};
    if (role && ALLOWED_ROLES.includes(role)) {
      filter.$or = [{ role }, { roles: role }];
    }
    if (search && search.trim()) {
      filter.email = { $regex: search.trim(), $options: 'i' };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .select('_id uid email role roles isActive createdAt lastLogin')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: safePage, limit: safeLimit });
  } catch (error) {
    next(error);
  }
};

export const changeUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, roles } = req.body;
    const nextRoles = normalizeRoles(role, roles);

    if (!nextRoles.every((r) => ALLOWED_ROLES.includes(r))) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }

    // Prevent admins from demoting themselves
    if (userId === req.userId && !nextRoles.includes('admin')) {
      return res.status(400).json({ error: 'You cannot change your own admin role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role: nextRoles[0], roles: nextRoles } },
      { new: true, runValidators: true }
    ).select('_id uid email role roles isActive');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Admin ${req.userId} changed roles of ${user.email} to ${nextRoles.join(', ')}`);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const setUserActive = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Prevent admins from deactivating themselves
    if (userId === req.userId && !isActive) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive } },
      { new: true }
    ).select('_id uid email role isActive');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const action = isActive ? 'activated' : 'deactivated';
    logger.info(`Admin ${req.userId} ${action} account: ${user.email}`);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, users] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.find({}).select('role roles').lean(),
    ]);

    const roleBreakdown = {};
    users.forEach((u) => {
      const roles = normalizeRoles(u.role, u.roles);
      roles.forEach((r) => {
        roleBreakdown[r] = (roleBreakdown[r] || 0) + 1;
      });
    });

    res.json({
      totalUsers,
      activeUsers,
      roleBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

export default { listUsers, changeUserRole, setUserActive, getAdminStats };
