const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User Not Authorized" });
    }
    if (!allowedRoles.includes(user.role)) {
      console.log(`${user.role} ${allowedRoles}`);
      return res.status(403).json({ message: "Access Denied" });
    }
    next();
  };
};

module.exports = roleMiddleware;
