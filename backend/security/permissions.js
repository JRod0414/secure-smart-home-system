const rolePermissions = {
  admin: ["events:read", "users:read", "users:write"],
  viewer: ["events:read"],
};

function hasPermission(role, permission) {
  const permissions = rolePermissions[role];
  return Object.prototype.hasOwnProperty.call(rolePermissions, role) 
  && permissions.includes(permission);
}

function requirePermission(permission) {
  return function (req, res, next) {
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

module.exports = {
  rolePermissions,
  hasPermission,
  requirePermission,
};