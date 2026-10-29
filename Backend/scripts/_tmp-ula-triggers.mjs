import prisma from "../Config/Prisma.js"
const triggers = await prisma.$queryRawUnsafe("SHOW TRIGGERS LIKE 'bihar_ula_site_survey'")
console.log(JSON.stringify(triggers, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2))
await prisma.$disconnect()
