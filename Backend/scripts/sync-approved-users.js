import prisma from "../Config/Prisma.js";
import { syncAllLegacyApprovedUsers } from "../Model/DLE-Model/dle-user-model.js";

const count = await syncAllLegacyApprovedUsers();
console.log(`Synced approval_status for ${count} legacy approved user(s).`);

await prisma.$disconnect();
