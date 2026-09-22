import crypto from "crypto";
import prisma from "../../Config/Prisma.js";
import { PORTAL_API_DEFAULT_SCOPES } from "../../Utils/portalPermissionCatalog.js";
import { hashPassword } from "../../Utils/password.js";

const ALLOWED_SCOPES = new Set(["read", "approve", "write", "all"]);

export const parseCredentialScopes = (scopes) => {
  let list = scopes;
  if (typeof scopes === "string") {
    try {
      list = JSON.parse(scopes);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) {
    list = [];
  }
  const filtered = [...new Set(list.map(String))].filter((s) => ALLOWED_SCOPES.has(s));
  return filtered.length ? filtered : [...PORTAL_API_DEFAULT_SCOPES];
};

export const generatePortalApiKey = () => crypto.randomBytes(24).toString("hex");

export const findActivePortalApiCredentialByKey = async (apiKey) => {
  const row = await prisma.portalApiCredential.findFirst({
    where: {
      api_key: String(apiKey).trim(),
      is_active: true,
    },
  });
  if (!row) return null;
  return {
    ...row,
    scopes: parseCredentialScopes(row.scopes),
  };
};

export const listPortalApiCredentialsByCompany = async (companyId) => {
  const rows = await prisma.portalApiCredential.findMany({
    where: { company_id: String(companyId) },
    orderBy: { created_at: "desc" },
  });

  return rows.map((row) => ({
    id: row.id.toString(),
    company_id: row.company_id,
    label: row.label,
    api_key: row.api_key,
    scopes: parseCredentialScopes(row.scopes),
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

export const createPortalApiCredential = async ({ companyId, label, secret, scopes }) => {
  const apiKey = generatePortalApiKey();
  const secretHash = await hashPassword(String(secret));
  const normalizedScopes = parseCredentialScopes(scopes);

  const row = await prisma.portalApiCredential.create({
    data: {
      company_id: String(companyId),
      label: label?.trim() || "External portal",
      api_key: apiKey,
      secret_hash: secretHash,
      scopes: normalizedScopes,
      is_active: true,
    },
  });

  return {
    id: row.id.toString(),
    company_id: row.company_id,
    label: row.label,
    api_key: row.api_key,
    scopes: parseCredentialScopes(row.scopes),
    is_active: row.is_active,
    created_at: row.created_at,
    plain_secret: String(secret),
  };
};

export const updatePortalApiCredential = async (id, companyId, { label, scopes, is_active }) => {
  const existing = await prisma.portalApiCredential.findFirst({
    where: { id: BigInt(id), company_id: String(companyId) },
  });
  if (!existing) return null;

  const row = await prisma.portalApiCredential.update({
    where: { id: BigInt(id) },
    data: {
      label: label !== undefined ? label?.trim() || existing.label : undefined,
      scopes: scopes !== undefined ? parseCredentialScopes(scopes) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      updated_at: new Date(),
    },
  });

  return {
    id: row.id.toString(),
    company_id: row.company_id,
    label: row.label,
    api_key: row.api_key,
    scopes: parseCredentialScopes(row.scopes),
    is_active: row.is_active,
  };
};

export const rotatePortalApiCredentialSecret = async (id, companyId, newSecret) => {
  const existing = await prisma.portalApiCredential.findFirst({
    where: { id: BigInt(id), company_id: String(companyId) },
  });
  if (!existing) return null;

  const secretHash = await hashPassword(String(newSecret));
  await prisma.portalApiCredential.update({
    where: { id: BigInt(id) },
    data: { secret_hash: secretHash, updated_at: new Date() },
  });

  return { api_key: existing.api_key, plain_secret: String(newSecret) };
};

export const deletePortalApiCredential = async (id, companyId) => {
  const existing = await prisma.portalApiCredential.findFirst({
    where: { id: BigInt(id), company_id: String(companyId) },
  });
  if (!existing) return false;
  await prisma.portalApiCredential.delete({ where: { id: BigInt(id) } });
  return true;
};
