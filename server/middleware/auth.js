export function requireAuth(req, res, next) {
  const token = req.query.token || req.headers["x-auth-token"];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  if (token === process.env.ADMIN_TOKEN) {
    req.authRole = "admin";
    return next();
  }

  if (token === process.env.VIEW_TOKEN) {
    req.authRole = "viewer";
    return next();
  }

  return res.status(401).json({ error: "Invalid token" });
}

export function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers["x-auth-token"];

  if (!token) {
    return res.status(401).json({ error: "Token required" });
  }

  if (token === process.env.ADMIN_TOKEN) {
    req.authRole = "admin";
    return next();
  }

  return res.status(403).json({ error: "Admin access required" });
}