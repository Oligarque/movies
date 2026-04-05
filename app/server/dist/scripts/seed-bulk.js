import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const parseArgs = () => {
    const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
    const target = targetArg ? Number(targetArg.split("=")[1]) : 1000;
    if (!Number.isInteger(target) || target < 1) {
        throw new Error("--target must be a positive integer");
    }
    return { target };
};
const makeMovie = (rank, tmdbId) => {
    const decade = 1980 + (rank % 5) * 10;
    const month = String((rank % 12) + 1).padStart(2, "0");
    const day = String((rank % 28) + 1).padStart(2, "0");
    return {
        tmdbId,
        title: `Perf Movie ${rank}`,
        posterUrl: null,
        directorName: `Director ${(rank % 40) + 1}`,
        releaseDate: `${decade}-${month}-${day}`,
        synopsis: `Synthetic movie generated for performance checks (#${rank}).`,
        rank,
        lastWatchedAt: null,
        reviewText: null,
    };
};
async function main() {
    const { target } = parseArgs();
    const currentCount = await prisma.movie.count();
    if (currentCount >= target) {
        console.log(`No-op: already ${currentCount} movies (target=${target}).`);
        return;
    }
    const maxRankResult = await prisma.movie.aggregate({
        _max: { rank: true },
    });
    const maxTmdbResult = await prisma.movie.aggregate({
        _max: { tmdbId: true },
    });
    const currentMaxRank = maxRankResult._max.rank ?? 0;
    const currentMaxTmdbId = maxTmdbResult._max.tmdbId ?? 500000;
    const toCreate = target - currentCount;
    const rows = Array.from({ length: toCreate }, (_, index) => {
        const rank = currentMaxRank + index + 1;
        const tmdbId = currentMaxTmdbId + index + 1;
        return makeMovie(rank, tmdbId);
    });
    await prisma.movie.createMany({
        data: rows,
    });
    const newCount = await prisma.movie.count();
    console.log(`Seed complete: ${currentCount} -> ${newCount} movies.`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-bulk.js.map