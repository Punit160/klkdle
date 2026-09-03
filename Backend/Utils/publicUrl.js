export const getPublicBaseUrl = (req) => {
  const fromEnv = String(process.env.APP_URL || process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const proto = req?.headers?.["x-forwarded-proto"] || req?.protocol || "http";
  const host = req?.headers?.["x-forwarded-host"] || req?.get?.("host") || "";
  if (host) return `${String(proto).split(",")[0].trim()}://${String(host).split(",")[0].trim()}`;

  return "";
};

export const toPublicFileUrl = (req, filePath) => {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const path = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const base = getPublicBaseUrl(req);
  return base ? `${base}${path}` : path;
};
