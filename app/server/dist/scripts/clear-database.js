import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    await prisma.movie.deleteMany({});
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = 'Movie';`);
    console.log("Database cleared.");
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=clear-database.js.map