import prisma from "./Config/Prisma.js";

async function testDatabase() {
    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;

        console.log(" Database connection successful");
    } catch (error) {
        console.error(" Database connection failed:");
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();
