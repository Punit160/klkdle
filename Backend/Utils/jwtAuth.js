import jwt from "jsonwebtoken";

/** Access token lifetime (login + refresh). Default 30 days. */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

/**
 * After expiry, refresh is still allowed for this many days (sliding re-login without password).
 * Default 30 days.
 */
export const JWT_REFRESH_GRACE_DAYS = Number(process.env.JWT_REFRESH_GRACE_DAYS || 30);

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error("JWT_SECRET is not set");
    error.statusCode = 500;
    throw error;
  }
  return secret;
};

export const signAccessToken = (user) =>
  jwt.sign(
    {
      id: user.id?.toString?.() ?? String(user.id),
      email: user.email,
      role: Number(user.role ?? 2),
    },
    getSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );

export const verifyAccessToken = (token) => jwt.verify(token, getSecret());

/** Valid token, or expired within refresh grace window. */
export const verifyAccessTokenForRefresh = (token) => {
  try {
    return { payload: verifyAccessToken(token), expired: false };
  } catch (err) {
    if (err?.name !== "TokenExpiredError") {
      throw err;
    }
    const payload = jwt.verify(token, getSecret(), { ignoreExpiration: true });
    const expiredAtMs = (payload.exp || 0) * 1000;
    const graceMs = JWT_REFRESH_GRACE_DAYS * 24 * 60 * 60 * 1000;
    if (!expiredAtMs || Date.now() - expiredAtMs > graceMs) {
      const error = new Error("Session expired. Please sign in again.");
      error.statusCode = 401;
      throw error;
    }
    return { payload, expired: true };
  }
};

export const extractBearerToken = (req) => {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};
