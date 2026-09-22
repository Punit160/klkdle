#!/usr/bin/env node
/**
 * Copy local /uploads/... files to Cloudflare R2 and rewrite DB paths to r2:...
 *
 * Usage (from Backend/):
 *   node scripts/migrate-uploads-to-r2.js --dry-run
 *   node scripts/migrate-uploads-to-r2.js --apply
 *   node scripts/migrate-uploads-to-r2.js --apply --only=users
 *
 * Requires R2 credentials in .env (same as app uploads).
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../Config/Prisma.js";
import {
  getObjectStorageDiagnostics,
  isR2Configured,
  isR2UploadsEnabled,
} from "../Utils/objectStorage.js";
import {
  isLocalUploadReference,
  migrateStoredUploadFieldValue,
} from "../Utils/migrateLocalUploadToR2.js";
import { getUploadsInfo } from "../Utils/uploadsPath.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(scriptDir, "..", ".env") });

const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");
const onlyFilter = args.find((a) => a.startsWith("--only="))?.split("=")[1]?.trim();

const stats = {
  rows_scanned: 0,
  fields_checked: 0,
  fields_changed: 0,
  migrated_files: 0,
  would_migrate: 0,
  missing_files: 0,
  skipped: 0,
  errors: 0,
};

const logPart = (result) => {
  if (result.action === "migrated") stats.migrated_files += 1;
  if (result.action === "would_migrate") stats.would_migrate += 1;
  if (result.action === "missing") stats.missing_files += 1;
  if (result.action === "skip") stats.skipped += 1;
  if (result.action === "error") stats.errors += 1;
};

const processField = async (label, value, options) => {
  if (!isLocalUploadReference(value)) return { value, changed: false, parts: [] };
  stats.fields_checked += 1;
  const { newValue, parts, changed } = await migrateStoredUploadFieldValue(value, options);
  parts.forEach(logPart);
  if (changed) {
    stats.fields_changed += 1;
    console.log(`  ${label}: ${value} → ${newValue}`);
  }
  return { value: newValue, changed, parts };
};

const migrateUsers = async (options) => {
  const fields = [
    "educational_document",
    "aadhaar_voter_id",
    "pan_card",
    "driving_license",
    "police_verification",
    "cancelled_cheque",
    "rent_agreement_electricity_bill",
    "profile_image",
  ];

  const users = await prisma.user.findMany({
    select: {
      id: true,
      ...Object.fromEntries(fields.map((f) => [f, true])),
    },
  });

  console.log(`\nUsers (${users.length} rows)`);
  for (const user of users) {
    stats.rows_scanned += 1;
    const data = {};
    let rowChanged = false;

    for (const field of fields) {
      const current = user[field];
      if (!isLocalUploadReference(current)) continue;
      const { value, changed } = await processField(
        `user#${user.id}.${field}`,
        current,
        options
      );
      if (changed) {
        data[field] = value;
        rowChanged = true;
      }
    }

    if (rowChanged && !dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data,
      });
    }
  }
};

const migrateBiharAmc = async (options) => {
  const rows = await prisma.biharSslAmcUploadDocument.findMany({
    select: { id: true, amc_document: true, invoice_document: true },
  });
  console.log(`\nBihar SSL AMC uploads (${rows.length} rows)`);
  for (const row of rows) {
    stats.rows_scanned += 1;
    const data = {};
    for (const field of ["amc_document", "invoice_document"]) {
      const current = row[field];
      if (!isLocalUploadReference(current)) continue;
      const { value, changed } = await processField(
        `bihar_amc_upload#${row.id}.${field}`,
        current,
        options
      );
      if (changed) data[field] = value;
    }
    if (Object.keys(data).length && !dryRun) {
      await prisma.biharSslAmcUploadDocument.update({ where: { id: row.id }, data });
    }
  }
};

const migrateUpAmc = async (options) => {
  const rows = await prisma.upSslAmcUploadDocument.findMany({
    select: { id: true, amc_document: true, invoice_document: true },
  });
  console.log(`\nUP SSL AMC uploads (${rows.length} rows)`);
  for (const row of rows) {
    stats.rows_scanned += 1;
    const data = {};
    for (const field of ["amc_document", "invoice_document"]) {
      const current = row[field];
      if (!isLocalUploadReference(current)) continue;
      const { value, changed } = await processField(
        `up_amc_upload#${row.id}.${field}`,
        current,
        options
      );
      if (changed) data[field] = value;
    }
    if (Object.keys(data).length && !dryRun) {
      await prisma.upSslAmcUploadDocument.update({ where: { id: row.id }, data });
    }
  }
};

const migrateLightAmc = async (options) => {
  const rows = await prisma.biharLightAmc.findMany({
    select: { id: true, image_1: true, image_2: true },
  });
  console.log(`\nLight AMC (${rows.length} rows)`);
  for (const row of rows) {
    stats.rows_scanned += 1;
    const data = {};
    for (const field of ["image_1", "image_2"]) {
      const current = row[field];
      if (!isLocalUploadReference(current)) continue;
      const { value, changed } = await processField(
        `light_amc#${row.id}.${field}`,
        current,
        options
      );
      if (changed) data[field] = value;
    }
    if (Object.keys(data).length && !dryRun) {
      await prisma.biharLightAmc.update({ where: { id: row.id }, data });
    }
  }
};

const migrateBiharUla = async (options) => {
  const imgFields = [
    "panel_one_img",
    "panel_two_img",
    "inverter_img",
    "smart_meter_img",
    "acdb_img",
    "system_img",
    "solar_meter_img",
    "solar_meter_img2",
    "system_img2",
  ];

  const rows = await prisma.biharUlaSurvey.findMany({
    select: {
      id: true,
      ...Object.fromEntries(imgFields.map((f) => [f, true])),
    },
  });

  console.log(`\nBihar ULA (${rows.length} rows)`);
  for (const row of rows) {
    stats.rows_scanned += 1;
    const data = {};
    for (const field of imgFields) {
      const current = row[field];
      if (!isLocalUploadReference(current)) continue;
      const { value, changed } = await processField(
        `bihar_ula#${row.id}.${field}`,
        current,
        options
      );
      if (changed) data[field] = value;
    }
    if (Object.keys(data).length && !dryRun) {
      await prisma.biharUlaSurvey.update({ where: { id: row.id }, data });
    }
  }
};

const JOBS = {
  users: migrateUsers,
  bihar_amc: migrateBiharAmc,
  up_amc: migrateUpAmc,
  light_amc: migrateLightAmc,
  bihar_ula: migrateBiharUla,
};

const main = async () => {
  console.log(JSON.stringify(getObjectStorageDiagnostics(), null, 2));
  const uploads = getUploadsInfo();
  console.log("Local uploads root:", uploads.uploadsRoot, "| exists:", uploads.exists);

  if (!isR2UploadsEnabled()) {
    console.error("\nR2_UPLOADS_ENABLED is off. Enable R2 before migrating.");
    process.exit(1);
  }
  if (!isR2Configured()) {
    console.error("\nR2 is not configured. Set credentials in Backend/.env");
    process.exit(1);
  }

  console.log(`\nMode: ${dryRun ? "DRY RUN (no uploads/DB writes)" : "APPLY"}`);
  if (dryRun) {
    console.log("Pass --apply to upload files and update the database.\n");
  }

  const options = { dryRun };
  const jobNames = onlyFilter
    ? onlyFilter.split(",").map((s) => s.trim()).filter(Boolean)
    : Object.keys(JOBS);

  for (const name of jobNames) {
    const job = JOBS[name];
    if (!job) {
      console.error(`Unknown job: ${name}. Valid: ${Object.keys(JOBS).join(", ")}`);
      process.exit(1);
    }
    await job(options);
  }

  console.log("\n--- Summary ---");
  console.log(JSON.stringify(stats, null, 2));

  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
