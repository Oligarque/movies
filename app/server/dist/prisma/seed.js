import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const seedMovies = [
    {
        tmdbId: 27205,
        title: "Inception",
        posterUrl: "https://image.tmdb.org/t/p/w342/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
        directorName: "Christopher Nolan",
        releaseDate: "2010-07-16",
        synopsis: "A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        rank: 1,
        lastWatchedAt: new Date("2025-12-15"),
        reviewText: "Masterpiece. Mind-bending narrative with stunning visuals.",
    },
    {
        tmdbId: 680,
        title: "Pulp Fiction",
        posterUrl: "https://image.tmdb.org/t/p/w342/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
        directorName: "Quentin Tarantino",
        releaseDate: "1994-10-14",
        synopsis: "The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.",
        rank: 2,
        lastWatchedAt: new Date("2025-11-20"),
        reviewText: "Iconic dialogue and non-linear storytelling. Classic.",
    },
    {
        tmdbId: 157336,
        title: "Interstellar",
        posterUrl: "https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        directorName: "Christopher Nolan",
        releaseDate: "2014-11-07",
        synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        rank: 3,
        lastWatchedAt: new Date("2025-10-05"),
        reviewText: "Epic space opera. Hans Zimmer's score is incredible.",
    },
    {
        tmdbId: 13,
        title: "Forrest Gump",
        posterUrl: "https://image.tmdb.org/t/p/w342/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
        directorName: "Robert Zemeckis",
        releaseDate: "1994-07-06",
        synopsis: "The presidencies of Kennedy and Johnson unfold from the perspective of an Alabama man with an IQ of 75.",
        rank: 4,
        lastWatchedAt: new Date("2025-09-12"),
        reviewText: "Feel-good movie. Tom Hanks is perfect. Run, Forrest, run!",
    },
    {
        tmdbId: 550,
        title: "Fight Club",
        posterUrl: "https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        directorName: "David Fincher",
        releaseDate: "1999-10-15",
        synopsis: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
        rank: 5,
        lastWatchedAt: new Date("2025-08-28"),
        reviewText: "Twist ending is legendary. Rewatches reveal new details.",
    },
];
async function main() {
    for (const movie of seedMovies) {
        await prisma.movie.upsert({
            where: { tmdbId: movie.tmdbId },
            create: movie,
            update: {
                title: movie.title,
                posterUrl: movie.posterUrl,
                directorName: movie.directorName,
                releaseDate: movie.releaseDate,
                synopsis: movie.synopsis,
                rank: movie.rank,
                lastWatchedAt: movie.lastWatchedAt,
                reviewText: movie.reviewText,
            },
        });
    }
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map