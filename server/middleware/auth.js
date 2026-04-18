import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function setAuthCookie(res, token, role) {
  const maxAge = 24 * 60 * 60 * 1000;
  // httpOnly JWT — not readable by JS, protects against XSS token theft
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
  // Non-sensitive role cookie — read by Next.js server components for nav rendering only.
  // Authorization is always enforced by verifying the signed JWT, never this cookie.
  res.cookie('user_role', role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('auth_token');
  res.clearCookie('user_role');
}

// Require valid JWT — attach req.user or return 401
export function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Attach user if JWT present, but don't block unauthenticated requests
export function optionalAuth(req, res, next) {
  const token = req.cookies?.auth_token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // ignore invalid token for optional routes
    }
  }
  next();
}

// Role guard — use after requireAuth
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
