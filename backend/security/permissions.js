const rolePermissions = {
  admin: ["events:read", "events:write"],
  viewer: ["events:read"],
};

function hasPermission(role, permission) {
  // look up permissions for role
  const permissions = rolePermissions[role];
  // return true or false
  return Object.prototype.hasOwnProperty.call(rolePermissions, role) && permissions.includes(permission);
}

function requirePermission(permission) {
  return function (req, res, next) {
    // check req.user.role with hasPermission
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