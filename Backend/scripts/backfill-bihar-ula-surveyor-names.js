/**
 * Backfill surveyor_name / surveyor_name2 and second_visit_at (DB + remarks)
 * for completed 2nd visits. Safe to run multiple times.
 *
 * Usage: node scripts/backfill-bihar-ula-surveyor-names.js
 *   or: npm run prisma:ula-surveyor-names
 */
import dotenv from "dotenv";
dotenv.config({ quiet: true });

import prisma from "../Config/Prisma.js";

const parseMeta = (remarks) => {
  try {
    const parsed = JSON.parse(remarks || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    /* plain text */
  }
  return {};
};

const lookupName = async (userId) => {
  const raw = String(userId ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  const user = await prisma.user.findUnique({
    where: { id: BigInt(raw) },
    select: { name: true, email: true },
  });
  const label = String(user?.name || user?.email || "").trim();
  return label || null;
};

const rows = await prisma.biharUlaSurvey.findMany({
  select: {
    id: true,
    user_id: true,
    user_id2: true,
    remarks: true,
    system_img2: true,
    solar_meter_img2: true,
    second_visit_at: true,
    updated_at: true,
    created_at: true,
  },
});

let updated = 0;
for (const row of rows) {
  const meta = parseMeta(row.remarks);
  let changed = false;

  if (row.user_id && !meta.surveyor_name) {
    const name = await lookupName(row.user_id);
    if (name) {
      meta.surveyor_name = name;
      changed = true;
    }
  }

  if (row.user_id2 && !meta.surveyor_name2) {
    const name = await lookupName(row.user_id2);
    if (name) {
      meta.surveyor_name2 = name;
      changed = true;
    }
  }

  const secondComplete =
    Boolean(String(row.system_img2 ?? "").trim()) &&
    Boolean(String(row.solar_meter_img2 ?? "").trim());

  let dataPatch = null;
  if (changed) {
    dataPatch = { remarks: JSON.stringify(meta) };
  }

  if (secondComplete && !row.second_visit_at) {
    const at = row.updated_at || row.created_at || new Date();
    const iso = at instanceof Date ? at.toISOString() : new Date(at).toISOString();
    if (!meta.second_visit_at) {
      meta.second_visit_at = iso;
      dataPatch = { ...(dataPatch || {}), remarks: JSON.stringify(meta) };
    }
    dataPatch = { ...(dataPatch || {}), second_visit_at: at };
    changed = true;
  }

  if (dataPatch) {
    await prisma.biharUlaSurvey.update({
      where: { id: row.id },
      data: dataPatch,
    });
    updated += 1;
  }
}

console.log(`Backfill complete: ${updated} of ${rows.length} survey(s) updated.`);
await prisma.$disconnect();
