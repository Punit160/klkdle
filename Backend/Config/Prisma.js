import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";

dotenv.config();

const parseDatabaseUrl = (rawUrl = "") => {
  if (!rawUrl) return null;

  try {
    const normalized = rawUrl.replace(/^mysql:\/\//, "http://");
    const url = new URL(normalized);

    return {
      host: url.hostname || "localhost",
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username || "root"),
      password: decodeURIComponent(url.password || ""),
      database: url.pathname.replace(/^\//, "") || "klkdle",
    };
  } catch {
    return null;
  }
};

const fromUrl = parseDatabaseUrl(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: fromUrl?.host || process.env.DB_HOST || "localhost",
  port: Number(fromUrl?.port || process.env.DB_PORT || 3306),
  user: fromUrl?.user || process.env.DB_USER || "root",
  password: fromUrl?.password ?? process.env.DB_PASSWORD ?? "",
  database: fromUrl?.database || process.env.DB_NAME || "klkdle",
  connectionLimit: 10,
  connectTimeout: 15000,
});

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
