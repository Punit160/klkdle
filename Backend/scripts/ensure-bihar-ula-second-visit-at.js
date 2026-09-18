/**
 * Ensures bihar_ula_site_survey.second_visit_at exists and backfills completed 2nd visits.
 * Safe to run on live: node scripts/ensure-bihar-ula-second-visit-at.js
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../Config/Prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const main = async () => {
  const columns = await prisma.$queryRaw`
    SHOW COLUMNS FROM bihar_ula_site_survey LIKE 'second_visit_at'
  `;

  if (!Array.isArray(columns) || columns.length === 0) {
    console.log("[ula] Adding column second_visit_at…");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`bihar_ula_site_survey\`
      ADD COLUMN \`second_visit_at\` TIMESTAMP(0) NULL AFTER \`user_id2\`
    `);
    console.log("[ula] Column added.");
  } else {
    console.log("[ula] Column second_visit_at already exists.");
  }

  const backfill = await prisma.$executeRawUnsafe(`
    UPDATE \`bihar_ula_site_survey\`
    SET \`second_visit_at\` = COALESCE(\`updated_at\`, \`created_at\`, NOW())
    WHERE \`system_img2\` IS NOT NULL
      AND \`system_img2\` != ''
      AND \`solar_meter_img2\` IS NOT NULL
      AND \`solar_meter_img2\` != ''
      AND \`second_visit_at\` IS NULL
  `);

  console.log("[ula] Backfill rows updated:", Number(backfill) || backfill);

  const sample = await prisma.biharUlaSurvey.findMany({
    where: { second_visit_at: { not: null } },
    select: { id: true, ca_no: true, second_visit_at: true },
    take: 5,
    orderBy: { id: "desc" },
  });

  console.log("[ula] Sample with second_visit_at:", sample);
};

main()
  .catch((err) => {
    console.error("[ula] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
