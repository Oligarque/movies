import "dotenv/config";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 4000);

type TmdbSearchMovie = {
  id: number;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
};

type TmdbMovieDetails = {
  overview?: string | null;
  credits?: {
    crew?: Array<{
      job?: string;
      name?: string;
    }>;
  };
};

async function fetchTmdbMovieDetails(tmdbApiKey: string, tmdbId: number) {
  const tmdbUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  tmdbUrl.searchParams.set("api_key", tmdbApiKey);
  tmdbUrl.searchParams.set("language", "fr-FR");
  tmdbUrl.searchParams.set("append_to_response", "credits");

  const response = await fetch(tmdbUrl);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as TmdbMovieDetails;
}

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.patch("/api/movies/reorder", async (req, res) => {
  const { movieIds } = req.body as { movieIds?: number[] };

  if (!Array.isArray(movieIds) || movieIds.length === 0) {
    res.status(400).json({ error: "movieIds array is required" });
    return;
  }

  const uniqueMovieIds = new Set(movieIds);
  if (uniqueMovieIds.size !== movieIds.length) {
    res.status(400).json({ error: "movieIds must not contain duplicates" });
    return;
  }

  try {
    const currentMovies = await prisma.movie.findMany({
      select: { id: true },
    });

    if (currentMovies.length !== movieIds.length) {
      res.status(400).json({ error: "movieIds must include every movie" });
      return;
    }

    const currentMovieIdSet = new Set(currentMovies.map((movie: { id: number }) => movie.id));
    const requestedMovieIdSet = new Set(movieIds);

    for (const movieId of requestedMovieIdSet) {
      if (!currentMovieIdSet.has(movieId)) {
        res.status(400).json({ error: "movieIds contains an unknown movie id" });
        return;
      }
    }

    await prisma.$transaction(
      movieIds.map((movieId, index) =>
        prisma.movie.update({
          where: { id: movieId },
          data: { rank: index + 1 },
        })
      )
    );

    const updatedMovies = await prisma.movie.findMany({
      orderBy: { rank: "asc" },
      select: {
        id: true,
        tmdbId: true,
        rank: true,
        title: true,
        posterUrl: true,
        directorName: true,
        releaseDate: true,
        synopsis: true,
        lastWatchedAt: true,
        reviewText: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ movies: updatedMovies });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error reordering movies:", error);
    res.status(500).json({ error: "Failed to reorder movies" });
  }
});

app.get("/api/movies", async (_req, res) => {
  const movies = await prisma.movie.findMany({
    orderBy: { rank: "asc" },
    select: {
      id: true,
      tmdbId: true,
      rank: true,
      title: true,
      posterUrl: true,
      directorName: true,
      releaseDate: true,
      synopsis: true,
      lastWatchedAt: true,
      reviewText: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(movies);
});

app.patch("/api/movies/:id", async (req, res) => {
  const movieId = parseInt(req.params.id, 10);
  const { lastWatchedAt, reviewText, rank } = req.body as {
    lastWatchedAt?: string | null;
    reviewText?: string;
    rank?: number;
  };

  try {
    // Validate movieId
    if (isNaN(movieId)) {
      res.status(400).json({ error: "Invalid movie ID" });
      return;
    }

    const currentMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      select: { id: true, rank: true },
    });

    if (!currentMovie) {
      res.status(404).json({ error: "Movie not found" });
      return;
    }

    // Prepare update payload
    const updateData: Record<string, unknown> = {};
    if (lastWatchedAt !== undefined) {
      updateData.lastWatchedAt = lastWatchedAt ? new Date(lastWatchedAt) : null;
    }
    if (reviewText !== undefined) {
      updateData.reviewText = reviewText || null;
    }

    let targetRank = currentMovie.rank;
    if (rank !== undefined) {
      if (!Number.isInteger(rank) || rank < 1) {
        res.status(400).json({ error: "Invalid rank" });
        return;
      }

      const maxRankResult = await prisma.movie.aggregate({
        _max: { rank: true },
      });
      const maxRank = maxRankResult._max.rank ?? currentMovie.rank;
      targetRank = Math.min(rank, maxRank);
    }

    const hasRankChange = targetRank !== currentMovie.rank;

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0 && !hasRankChange) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const updatedMovie = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (hasRankChange) {
        if (targetRank < currentMovie.rank) {
          await tx.movie.updateMany({
            where: {
              id: { not: movieId },
              rank: { gte: targetRank, lt: currentMovie.rank },
            },
            data: { rank: { increment: 1 } },
          });
        } else {
          await tx.movie.updateMany({
            where: {
              id: { not: movieId },
              rank: { gt: currentMovie.rank, lte: targetRank },
            },
            data: { rank: { decrement: 1 } },
          });
        }
      }

      return tx.movie.update({
        where: { id: movieId },
        data: {
          ...updateData,
          ...(hasRankChange ? { rank: targetRank } : {}),
        },
        select: {
          id: true,
          tmdbId: true,
          rank: true,
          title: true,
          posterUrl: true,
          directorName: true,
          releaseDate: true,
          synopsis: true,
          lastWatchedAt: true,
          reviewText: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    res.json(updatedMovie);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error updating movie:", error);

    if (error instanceof Error && "code" in error) {
      // Prisma error
      if ((error as { code: string }).code === "P2025") {
        res.status(404).json({ error: "Movie not found" });
        return;
      }
    }

    res.status(500).json({ error: "Failed to update movie" });
  }
});

app.post("/api/movies", async (req, res) => {
  const { tmdbId, title, posterUrl, directorName, releaseDate, synopsis, rank } = req.body as {
    tmdbId?: number;
    title?: string;
    posterUrl?: string | null;
    directorName?: string | null;
    releaseDate?: string | null;
    synopsis?: string | null;
    rank?: number;
  };

  if (
    typeof tmdbId !== "number" ||
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof rank !== "number" ||
    !Number.isInteger(rank) ||
    rank < 1
  ) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const existingMovie = await prisma.movie.findUnique({
      where: { tmdbId },
      select: { id: true, rank: true },
    });

    if (existingMovie) {
      res.status(409).json({
        error: "Movie already exists in library",
        movieId: existingMovie.id,
        rank: existingMovie.rank,
      });
      return;
    }

    const maxRankResult = await prisma.movie.aggregate({
      _max: { rank: true },
    });
    const maxRank = maxRankResult._max.rank ?? 0;
    const insertionRank = Math.min(rank, maxRank + 1);

    const createdMovie = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.movie.updateMany({
        where: { rank: { gte: insertionRank } },
        data: { rank: { increment: 1 } },
      });

      return tx.movie.create({
        data: {
          tmdbId,
          title: title.trim(),
          posterUrl: posterUrl ?? null,
          directorName: typeof directorName === "string" ? directorName.trim() || null : null,
          releaseDate: releaseDate ?? null,
          synopsis: typeof synopsis === "string" ? synopsis.trim() || null : null,
          rank: insertionRank,
        },
      });
    });

    res.status(201).json(createdMovie);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error creating movie:", error);
    res.status(500).json({ error: "Failed to create movie" });
  }
});

app.get("/api/tmdb/search", async (req, res) => {
  const { query } = req.query as { query?: string };

  if (!query || query.trim() === "") {
    res.status(400).json({ error: "Query parameter is required" });
    return;
  }

  try {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      res.status(500).json({ error: "TMDb API key is missing" });
      return;
    }

    const tmdbUrl = new URL("https://api.themoviedb.org/3/search/movie");
    tmdbUrl.searchParams.set("api_key", tmdbApiKey);
    tmdbUrl.searchParams.set("query", query.trim());
    tmdbUrl.searchParams.set("include_adult", "false");
    tmdbUrl.searchParams.set("language", "fr-FR");
    tmdbUrl.searchParams.set("page", "1");

    const tmdbResponse = await fetch(tmdbUrl);
    if (!tmdbResponse.ok) {
      const errorText = await tmdbResponse.text();
      res.status(502).json({
        error: "Failed to search TMDb",
        details: errorText,
      });
      return;
    }

    const tmdbData = (await tmdbResponse.json()) as {
      results?: TmdbSearchMovie[];
    };

    const filtered = (tmdbData.results ?? []).filter(
      (movie): movie is TmdbSearchMovie & { title: string } =>
        typeof movie.id === "number" && typeof movie.title === "string" && movie.title.trim() !== ""
    );

    const topResults = filtered.slice(0, 10);

    if (topResults.length === 0) {
      res.json({ results: [] });
      return;
    }

    // Extract TMDb IDs for library lookup
    const tmdbIds = topResults.map((r) => r.id);

    // Check which movies are already in library
    const libraryMovies = await prisma.movie.findMany({
      where: { tmdbId: { in: tmdbIds } },
      select: { tmdbId: true, rank: true },
    });

    const libraryMap = new Map(
      libraryMovies.map((movie: { tmdbId: number; rank: number }) => [movie.tmdbId, movie.rank])
    );

    const enrichedMovies = await Promise.all(
      topResults.map(async (movie) => {
        const details = await fetchTmdbMovieDetails(tmdbApiKey, movie.id);
        const directorName = details?.credits?.crew?.find((crewMember) => crewMember.job === "Director")?.name ?? null;

        return {
          tmdbId: movie.id,
          title: movie.title,
          posterUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
            : null,
          releaseDate: movie.release_date || "",
          directorName,
          synopsis: details?.overview?.trim() || null,
        };
      })
    );

    // Transform TMDb results with library info
    const results = enrichedMovies.map((movie) => {
      const rank = libraryMap.get(movie.tmdbId);
      const alreadyInLibrary = rank !== undefined;

      return {
        ...movie,
        alreadyInLibrary,
        libraryRank: alreadyInLibrary ? rank : null,
      };
    });

    res.json({ results });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error searching TMDb:", error);
    res.status(500).json({ error: "Failed to search TMDb" });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
