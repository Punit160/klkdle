// utils/auth.js

const TOKEN_KEY = "token";
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

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveAuthData = (token, user) => {
  setToken(token);
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    const companyId =
      user.company_id ?? user.companyId ?? user.company?.id ?? null;
    if (companyId !== undefined && companyId !== null) {
      setCompanyId(companyId);
    }
  }
};


export const isAuthenticated = () => {
  return !!getToken();
};

export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(COMPANY_ID_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
};