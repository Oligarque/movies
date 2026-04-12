import { useEffect, useRef, useState } from 'react'
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
import './App.css'
import DetailOverlay from './components/DetailOverlay'
import AddMovieFlow from './components/AddMovieFlow'
import MovieCardList from './components/MovieCardList'
import VirtualizedMovieCardList from './components/VirtualizedMovieCardList'
import { apiUrl } from './api'

type MovieCard = {
  id: number
  tmdbId: number
  rank: number
  title: string
  posterUrl: string | null
  directorName: string | null
  releaseDate?: string | null
  synopsis?: string | null
  lastWatchedAt?: string | null
  reviewText?: string | null
  createdAt: string
  updatedAt: string
}

type FocusRequest = {
  movieId: number
  nonce: number
}

const ENABLE_VIRTUALIZED_LIST = (import.meta.env.VITE_ENABLE_VIRTUALIZED_LIST ?? 'true') !== 'false'
const VIRTUALIZATION_THRESHOLD = Number.parseInt(
  import.meta.env.VITE_VIRTUALIZATION_THRESHOLD ?? '300',
  10
)

function App() {
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
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const [lastResolvedFocusNonce, setLastResolvedFocusNonce] = useState<number | null>(null)
  const movieCardRefs = useRef(new Map<number, HTMLElement>())

  const loadMovies = async () => {
    try {
      setIsLoading(true)
      setHasError(false)

      const response = await fetch(apiUrl('/movies-api/movies'))
      if (!response.ok) {
        throw new Error('Failed to load movies')
      }

      const data = (await response.json()) as MovieCard[]
      setMovies(data)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenOverlay = (movie: MovieCard) => {
    setSelectedMovie(movie)
    setIsOverlayOpen(true)
  }

  const handleCloseOverlay = () => {
    setIsOverlayOpen(false)
    setSelectedMovie(null)
  }

  const handleSaveMovieMetadata = async (movieId: number, updates: { lastWatchedAt?: string | null; reviewText?: string; rank?: number }) => {
    try {
      const previousMovie = movies.find((movie) => movie.id === movieId)
      const hasRankChanged =
        updates.rank !== undefined &&
        previousMovie !== undefined &&
        updates.rank !== previousMovie.rank

      const response = await fetch(apiUrl(`/movies-api/movies/${movieId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error: string }
        throw new Error(errorData.error || 'Failed to save changes')
      }

      const updatedMovie = (await response.json()) as MovieCard

      if (updates.rank !== undefined) {
        await loadMovies()
        if (hasRankChanged) {
          setQuery('')
          focusMovieInList(movieId)
        }
        setSelectedMovie((previous) => (previous?.id === movieId ? updatedMovie : previous))
      } else {
        // Update local state
        setMovies((prevMovies) =>
          prevMovies.map((m) => (m.id === movieId ? updatedMovie : m))
        )

        // Update selected movie in overlay
        if (selectedMovie?.id === movieId) {
          setSelectedMovie(updatedMovie)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save changes'
      throw new Error(errorMsg)
    }
  }

  const persistMovieOrder = async (orderedMovies: MovieCard[]) => {
    const response = await fetch(apiUrl('/movies-api/movies/reorder'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieIds: orderedMovies.map((movie) => movie.id) }),
    })

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string }
      throw new Error(errorData.error || 'Failed to reorder movies')
    }

    const data = (await response.json()) as { movies: MovieCard[] }
    setMovies(data.movies)
  }

  useEffect(() => {
    void loadMovies()
  }, [])

  useEffect(() => {
    if (!duplicateNotice) return

    const timeoutId = setTimeout(() => {
      setDuplicateNotice(null)
    }, 4000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [duplicateNotice])

  const focusMovieInList = (movieId: number) => {
    setFocusRequest({ movieId, nonce: Date.now() })
  }

  const handleFocusRequestResolved = (movieId: number) => {
    setLastResolvedFocusNonce(focusRequest?.nonce ?? null)
    setHighlightMovieId(movieId)
    window.setTimeout(() => {
      setHighlightMovieId((current) => (current === movieId ? null : current))
    }, 2200)
  }

  const normalizedQuery = query.trim().toLowerCase()
  const isReorderEnabled = normalizedQuery.length === 0
  const shouldUseVirtualizedList =
    ENABLE_VIRTUALIZED_LIST &&
    Number.isFinite(VIRTUALIZATION_THRESHOLD) &&
    movies.length >= VIRTUALIZATION_THRESHOLD

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    if (!isReorderEnabled) {
      return
    }

    setHighlightMovieId(Number(event.active.id))
    setDropTargetMovieId(Number(event.active.id))
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!isReorderEnabled) {
      return
    }

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

    if (!over || active.id === over.id) {
      return
    }

    const activeMovieId = Number(active.id)
    const overMovieId = Number(over.id)

    const oldIndex = movies.findIndex((movie) => movie.id === activeMovieId)
    const newIndex = movies.findIndex((movie) => movie.id === overMovieId)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reorderedMovies = arrayMove(movies, oldIndex, newIndex)
    setMovies(reorderedMovies)

    void persistMovieOrder(reorderedMovies).catch(() => {
      void loadMovies()
    })
  }

  const filteredMovies = movies.filter((movie) => {
    if (!normalizedQuery) {
      return true
    }

    const normalizedTitle = movie.title.trim().toLowerCase()
    const normalizedDirector = (movie.directorName ?? '').trim().toLowerCase()

    return (
      normalizedTitle.includes(normalizedQuery) ||
      normalizedDirector.includes(normalizedQuery)
    )
  })

  const showLibraryEmptyState = !isLoading && !hasError && movies.length === 0
  const showFilteredNoResultState =
    !isLoading &&
    !hasError &&
    movies.length > 0 &&
    normalizedQuery.length > 0 &&
    filteredMovies.length === 0

  useEffect(() => {
    if (!focusRequest || shouldUseVirtualizedList) {
      return
    }

    if (lastResolvedFocusNonce === focusRequest.nonce) {
      return
    }

    let attempt = 0
    const maxAttempts = 12

    const tryFocus = () => {
      const targetCard = movieCardRefs.current.get(focusRequest.movieId)
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        targetCard.focus()
        handleFocusRequestResolved(focusRequest.movieId)
        return
      }

      attempt += 1
      if (attempt < maxAttempts) {
        window.requestAnimationFrame(tryFocus)
      }
    }

    window.requestAnimationFrame(tryFocus)
  }, [focusRequest, shouldUseVirtualizedList, lastResolvedFocusNonce])

  return (
    <main className="page">
      <header className="pageHeader">
        <div className="headerTitleWrap">
          <h1>Mon Classement Films</h1>
          <p>Classement personnel des films vus</p>
        </div>
        <button
          className="addMovieButton"
          onClick={() => setIsAddMovieFlowOpen(true)}
          title="Add a new movie"
        >
          + Ajouter un film
        </button>
      </header>

      {duplicateNotice ? (
        <p className="state duplicateNotice">{duplicateNotice}</p>
      ) : null}

      {!isLoading && !hasError && movies.length > 0 ? (
        <div className="searchWrap">
          <label htmlFor="movieSearch" className="searchLabel">
            Rechercher par titre ou realisateur
          </label>
          <input
            id="movieSearch"
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
          <p>Ajoute ton premier film pour commencer le classement.</p>
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
              {shouldUseVirtualizedList ? (
                <VirtualizedMovieCardList
                  movies={filteredMovies}
                  highlightMovieId={highlightMovieId}
                  dropTargetMovieId={dropTargetMovieId}
                  onOpenMovie={handleOpenOverlay}
                  movieCardRefs={movieCardRefs}
                  focusRequest={focusRequest}
                  onFocusRequestResolved={handleFocusRequestResolved}
                />
              ) : (
                <MovieCardList
                  movies={filteredMovies}
                  highlightMovieId={highlightMovieId}
                  dropTargetMovieId={dropTargetMovieId}
                  onOpenMovie={handleOpenOverlay}
                  movieCardRefs={movieCardRefs}
                />
              )}
            </SortableContext>
          </DndContext>
        ) : (
          shouldUseVirtualizedList ? (
            <VirtualizedMovieCardList
              movies={filteredMovies}
              isDragDisabled
              highlightMovieId={highlightMovieId}
              dropTargetMovieId={dropTargetMovieId}
              onOpenMovie={handleOpenOverlay}
              movieCardRefs={movieCardRefs}
              focusRequest={focusRequest}
              onFocusRequestResolved={handleFocusRequestResolved}
            />
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
        )
      ) : null}

      <DetailOverlay
        movie={selectedMovie}
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
        maxRank={movies.length}
        onSave={handleSaveMovieMetadata}
      />
      <AddMovieFlow
        isOpen={isAddMovieFlowOpen}
        onClose={() => setIsAddMovieFlowOpen(false)}
        maxRank={movies.length}
        onMovieAdded={async ({ movieId }) => {
          setQuery('')
          await loadMovies()
          focusMovieInList(movieId)
        }}
        onDuplicateMovie={({ movieId, rank, title }) => {
          setIsAddMovieFlowOpen(false)
          setQuery('')
          setDuplicateNotice(
            rank
              ? `"${title}" est deja dans ta liste (rang #${rank}).`
              : `"${title}" est deja dans ta liste.`
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

export default App
