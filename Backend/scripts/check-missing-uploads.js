#!/usr/bin/env node
/**
 * List DB upload paths that are missing on disk.
 * Run on live: cd Backend && node scripts/check-missing-uploads.js
 */
import dotenv from "dotenv";
import prisma from "../Config/Prisma.js";
import { getUploadsInfo, uploadFileExists } from "../Utils/uploadsPath.js";

dotenv.config();

const checkPaths = (label, paths) => {
  const unique = [...new Set(paths.filter(Boolean))];
  const missing = unique.filter((value) => !uploadFileExists(value));

  console.log(`\n${label}`);
  console.log(`  referenced: ${unique.length}`);
  console.log(`  missing:    ${missing.length}`);

  missing.slice(0, 20).forEach((value) => console.log(`    - ${value}`));
  if (missing.length > 20) {
    console.log(`    ... and ${missing.length - 20} more`);
  }

  return missing.length;
};

const run = async () => {
  const info = getUploadsInfo();
  console.log("Uploads root:", info.uploadsRoot);
  console.log("Exists:", info.exists);
  console.log("light-amc files:", info.lightAmcCount);

  let totalMissing = 0;

  const lightRows = await prisma.biharLightAmc.findMany({
    select: { id: true, image_1: true, image_2: true },
  });

  totalMissing += checkPaths(
    "Light AMC images",
    lightRows.flatMap((row) => [row.image_1, row.image_2])
  );

  const biharRows = await prisma.biharSslAmcUploadDocument.findMany({
    select: { id: true, amc_document: true, invoice_document: true },
  });

  totalMissing += checkPaths(
    "Bihar AMC documents",
    biharRows.flatMap((row) => [row.amc_document, row.invoice_document])
  );

  const upRows = await prisma.upSslAmcUploadDocument.findMany({
    select: { id: true, amc_document: true, invoice_document: true },
  });

  totalMissing += checkPaths(
    "UP AMC documents",
    upRows.flatMap((row) => [row.amc_document, row.invoice_document])
  );

  console.log(`\nTotal missing files: ${totalMissing}`);
  await prisma.$disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
