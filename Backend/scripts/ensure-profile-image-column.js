#!/usr/bin/env node
/**
 * Adds users.profile_image if missing (safe on live/local).
 * Run: cd Backend && node scripts/ensure-profile-image-column.js
 */
import dotenv from "dotenv";
import prisma from "../Config/Prisma.js";

dotenv.config();

const run = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`users\`
      ADD COLUMN \`profile_image\` VARCHAR(255) NULL
      AFTER \`rent_agreement_electricity_bill\`
    `);
    console.log("Added column users.profile_image");
  } catch (error) {
    const message = String(error?.message || error);
    if (
      message.includes("Duplicate column") ||
      message.includes("1060")
    ) {
      console.log("Column users.profile_image already exists — OK");
    } else {
      throw error;
    }
  }

  await prisma.$disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
