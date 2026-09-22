// utils/auth.js

const TOKEN_KEY = "token";

/** Match backend JWT_REFRESH_GRACE_DAYS default (30). */
const REFRESH_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/** Refresh when less than this remains before expiry (sliding 30-day session). */
const PROACTIVE_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const COMPANY_ID_KEY = "companyId";
const USER_KEY = "dleUser";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const getCompanyId = () => localStorage.getItem(COMPANY_ID_KEY);

export const setCompanyId = (companyId) => {
  if (companyId !== undefined && companyId !== null) {
    localStorage.setItem(COMPANY_ID_KEY, companyId);
  }
};

const parseStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Role from stored user, else JWT payload (after SQL admin / old sessions). */
export const getEffectiveUserRole = (userArg = null) => {
  const user = userArg ?? parseStoredUser();
  if (user?.role != null && user.role !== "") {
    return Number(user.role);
  }
  const payload = decodeJwtPayload(getToken());
  if (payload?.role != null && payload.role !== "") {
    return Number(payload.role);
  }
  return 2;
};

export const getUser = () => {
  const user = parseStoredUser();
  if (!user) return null;
  return {
    ...user,
    role: getEffectiveUserRole(user),
  };
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(
      base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getTokenExpiryMs = (token = getToken()) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
};

export const isTokenValid = (token = getToken()) => {
  if (!token || typeof token !== "string") return false;

  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return true;
  return expMs > Date.now();
};

/** Still signed in: valid token or expired within server refresh grace. */
export const isTokenWithinRefreshGrace = (token = getToken()) => {
  if (!token || typeof token !== "string") return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return true;
  if (expMs > Date.now()) return true;
  return Date.now() - expMs <= REFRESH_GRACE_MS;
};

export const shouldProactivelyRefreshToken = (token = getToken()) => {
  if (!token) return false;
  const expMs = getTokenExpiryMs(token);
  if (expMs == null) return false;
  const msLeft = expMs - Date.now();
  return msLeft < PROACTIVE_REFRESH_WINDOW_MS;
};

export const saveAuthData = (token, user) => {
  setToken(token);
  if (user) {
    const normalized = {
      ...user,
      role: getEffectiveUserRole(user),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    localStorage.setItem("user", JSON.stringify(normalized));
    const companyId =
      normalized.company_id ?? normalized.companyId ?? normalized.company?.id ?? null;
    if (companyId !== undefined && companyId !== null) {
      setCompanyId(companyId);
    }
    window.dispatchEvent(new CustomEvent("dle-auth-updated"));
  }
};


export const isAuthenticated = () => isTokenWithinRefreshGrace();

export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(COMPANY_ID_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
};