import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import '../App.css'
import AddMovieFlow from '../components/AddMovieFlow'
import type { SearchResult } from '../components/SearchResultsGrid'
import DetailOverlay from '../components/DetailOverlay'
import MovieCardList from '../components/MovieCardList'
import { authService } from '../services/authService'
import type { PublicMovie } from '../types/auth'

type MovieCard = PublicMovie

function sortAndNormalizeRanks(movies: MovieCard[]): MovieCard[] {
  return [...movies]
    .sort((a, b) => a.rank - b.rank)
    .map((movie, index) => ({ ...movie, rank: index + 1 }))
}

export default function DemoPage() {
  const [movies, setMovies] = useState<MovieCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedMovie, setSelectedMovie] = useState<MovieCard | null>(null)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isAddMovieFlowOpen, setIsAddMovieFlowOpen] = useState(false)
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null)
  const [highlightMovieId, setHighlightMovieId] = useState<number | null>(null)
  const [dropTargetMovieId, setDropTargetMovieId] = useState<number | null>(null)
  const movieCardRefs = useRef(new Map<number, HTMLElement>())

  const loadMovies = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      const data = await authService.getPublicRanking()
      setMovies(sortAndNormalizeRanks(data))
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMovies()
  }, [])

  useEffect(() => {
    if (!duplicateNotice) return
    const timeoutId = setTimeout(() => setDuplicateNotice(null), 4000)
    return () => clearTimeout(timeoutId)
  }, [duplicateNotice])

  const focusMovieInList = (movieId: number) => {
    window.requestAnimationFrame(() => {
      const element = movieCardRefs.current.get(movieId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
        setHighlightMovieId(movieId)
        window.setTimeout(() => {
          setHighlightMovieId((current) => (current === movieId ? null : current))
        }, 2200)
      }
    })
  }

  const handleOpenOverlay = (movie: MovieCard) => {
    setSelectedMovie(movie)
    setIsOverlayOpen(true)
  }

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false)
    setSelectedMovie(null)
  }

  const handleSaveMovieMetadata = async (
    movieId: number,
    updates: { lastWatchedAt?: string | null; reviewText?: string; rank?: number }
  ) => {
    const currentMovie = movies.find((movie) => movie.id === movieId)
    if (!currentMovie) {
      throw new Error('Film introuvable')
    }

    const normalized = sortAndNormalizeRanks(movies)
    const sourceIndex = normalized.findIndex((movie) => movie.id === movieId)
    if (sourceIndex < 0) {
      throw new Error('Film introuvable')
    }

    const targetRank = updates.rank ? Math.max(1, Math.min(updates.rank, normalized.length)) : normalized[sourceIndex].rank
    const targetIndex = targetRank - 1

    const moved = updates.rank ? arrayMove(normalized, sourceIndex, targetIndex) : normalized

    const next = moved.map((movie, index) => {
      if (movie.id !== movieId) {
        return {
          ...movie,
          rank: index + 1,
        }
      }

      return {
        ...movie,
        rank: index + 1,
        lastWatchedAt: updates.lastWatchedAt !== undefined ? updates.lastWatchedAt : movie.lastWatchedAt,
        reviewText: updates.reviewText !== undefined ? updates.reviewText : movie.reviewText,
        updatedAt: new Date().toISOString(),
      }
    })

    setMovies(next)
    const updatedMovie = next.find((movie) => movie.id === movieId) ?? null
    setSelectedMovie(updatedMovie)

    if (updates.rank !== undefined && updates.rank !== currentMovie.rank) {
      setQuery('')
      focusMovieInList(movieId)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const isReorderEnabled = normalizedQuery.length === 0

  const filteredMovies = useMemo(
    () =>
      movies.filter((movie) => {
        if (!normalizedQuery) {
          return true
        }

        const normalizedTitle = movie.title.trim().toLowerCase()
        const normalizedDirector = (movie.directorName ?? '').trim().toLowerCase()

        return (
          normalizedTitle.includes(normalizedQuery) ||
          normalizedDirector.includes(normalizedQuery)
        )
      }),
    [movies, normalizedQuery]
  )

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    if (!isReorderEnabled) return
    setHighlightMovieId(Number(event.active.id))
    setDropTargetMovieId(Number(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!isReorderEnabled) return
    setDropTargetMovieId(event.over ? Number(event.over.id) : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isReorderEnabled) {
      setHighlightMovieId(null)
      setDropTargetMovieId(null)
      return
    }

    const { active, over } = event
    setHighlightMovieId(null)
    setDropTargetMovieId(null)

    if (!over || active.id === over.id) return

    const oldIndex = movies.findIndex((movie) => movie.id === Number(active.id))
    const newIndex = movies.findIndex((movie) => movie.id === Number(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(movies, oldIndex, newIndex).map((movie, index) => ({
      ...movie,
      rank: index + 1,
      updatedAt: new Date().toISOString(),
    }))

    setMovies(reordered)
  }

  const onAddMovieLocal = ({ movie, rank }: { movie: SearchResult; rank: number }) => {
    const duplicateMovie = movies.find((existing) => existing.tmdbId === movie.tmdbId)
    if (duplicateMovie) {
      return {
        status: 'duplicate' as const,
        movieId: duplicateMovie.id,
        rank: duplicateMovie.rank,
        title: duplicateMovie.title,
      }
    }

    const nowIso = new Date().toISOString()
    const nextId = (movies.reduce((max, item) => Math.max(max, item.id), 0) || 0) + 1
    const insertionRank = Math.max(1, Math.min(rank, movies.length + 1))

    const shifted = movies.map((existing) =>
      existing.rank >= insertionRank
        ? { ...existing, rank: existing.rank + 1, updatedAt: nowIso }
        : existing
    )

    const newMovie: MovieCard = {
      id: nextId,
      tmdbId: movie.tmdbId,
      title: movie.title,
      posterUrl: movie.posterUrl,
      directorName: movie.directorName ?? null,
      releaseDate: movie.releaseDate || null,
      synopsis: movie.synopsis ?? null,
      rank: insertionRank,
      lastWatchedAt: null,
      reviewText: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    setMovies(sortAndNormalizeRanks([...shifted, newMovie]))

    return {
      status: 'added' as const,
      movieId: newMovie.id,
      rank: newMovie.rank,
      title: newMovie.title,
    }
  }

  const showLibraryEmptyState = !isLoading && !hasError && movies.length === 0
  const showFilteredNoResultState =
    !isLoading &&
    !hasError &&
    movies.length > 0 &&
    normalizedQuery.length > 0 &&
    filteredMovies.length === 0

  return (
    <main className="page">
      <header className="pageHeader">
        <div className="headerTitleWrap">
          <h1>Mode Demo</h1>
          <p>Sandbox publique: toutes les modifications sont locales et non sauvegardees</p>
          <div className="demoModeBadge" role="note" aria-label="Mode demo non sauvegarde">
            Mode demo - non sauvegarde
          </div>
        </div>
        <button
          className="addMovieButton"
          onClick={() => setIsAddMovieFlowOpen(true)}
          title="Ajouter un film dans la demo"
        >
          + Ajouter un film
        </button>
      </header>

      {duplicateNotice ? <p className="state duplicateNotice">{duplicateNotice}</p> : null}

      {!isLoading && !hasError && movies.length > 0 ? (
        <div className="searchWrap">
          <label htmlFor="movieSearchDemo" className="searchLabel">
            Rechercher par titre ou realisateur
          </label>
          <input
            id="movieSearchDemo"
            type="search"
            className="searchInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex: Inception ou Nolan"
          />
        </div>
      ) : null}

      {isLoading ? <p className="state">Chargement...</p> : null}
      {hasError ? <p className="state error">Impossible de charger la liste.</p> : null}

      {showLibraryEmptyState ? (
        <section className="emptyState">
          <h2>Aucun film pour le moment</h2>
          <p>Ajoute ton premier film pour commencer le classement demo.</p>
        </section>
      ) : null}

      {showFilteredNoResultState ? (
        <section className="emptyState">
          <h2>Aucun resultat</h2>
          <p>Aucun film ne correspond a ta recherche.</p>
        </section>
      ) : null}

      {!isLoading && !hasError && filteredMovies.length > 0 ? (
        isReorderEnabled ? (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredMovies.map((movie) => movie.id)}
              strategy={verticalListSortingStrategy}
            >
              <MovieCardList
                movies={filteredMovies}
                highlightMovieId={highlightMovieId}
                dropTargetMovieId={dropTargetMovieId}
                onOpenMovie={handleOpenOverlay}
                movieCardRefs={movieCardRefs}
              />
            </SortableContext>
          </DndContext>
        ) : (
          <MovieCardList
            movies={filteredMovies}
            isDragDisabled
            highlightMovieId={highlightMovieId}
            dropTargetMovieId={dropTargetMovieId}
            onOpenMovie={handleOpenOverlay}
            movieCardRefs={movieCardRefs}
          />
        )
      ) : null}

      <DetailOverlay
        movie={selectedMovie}
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        maxRank={movies.length || 1}
        onSave={handleSaveMovieMetadata}
      />

      <AddMovieFlow
        isOpen={isAddMovieFlowOpen}
        onClose={() => setIsAddMovieFlowOpen(false)}
        maxRank={movies.length}
        onAddMovieLocal={onAddMovieLocal}
        onMovieAdded={({ movieId }) => {
          setQuery('')
          focusMovieInList(movieId)
        }}
        onDuplicateMovie={({ movieId, rank, title }) => {
          setIsAddMovieFlowOpen(false)
          setQuery('')
          setDuplicateNotice(
            rank
              ? `"${title}" est deja dans la demo (rang #${rank}).`
              : `"${title}" est deja dans la demo.`
          )
          focusMovieInList(movieId)
        }}
      />

      {isReorderEnabled && !isLoading && !hasError && movies.length > 1 ? (
        <p className="dragHint">Maintiens une carte puis glisse-la vers la position voulue.</p>
      ) : null}
    </main>
  )
}
