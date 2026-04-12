import React, { useCallback, useEffect, useRef, useState } from 'react'
import SearchInput from './SearchInput'
import SearchResultsGrid, { type SearchResult } from './SearchResultsGrid'
import '../styles/AddMovieFlow.css'
import { apiUrl } from '../api'

interface AddMovieFlowProps {
  isOpen: boolean
  onClose: () => void
  maxRank: number
  onMovieAdded?: (payload: { movieId: number; rank: number; title: string }) => Promise<void> | void
  onDuplicateMovie?: (payload: { movieId: number; rank: number | null; title: string }) => void
  onAddMovieLocal?: (payload: {
    movie: SearchResult
    rank: number
  }) => {
    status: 'added'
    movieId: number
    rank: number
    title: string
  } | {
    status: 'duplicate'
    movieId: number
    rank: number | null
    title: string
  }
}

export const AddMovieFlow: React.FC<AddMovieFlowProps> = ({
  isOpen,
  onClose,
  maxRank,
  onMovieAdded,
  onDuplicateMovie,
  onAddMovieLocal,
}) => {
  const maxInsertionRank = maxRank + 1
  const getDefaultRank = useCallback(() => {
    if (maxRank <= 1) {
      return 1
    }
    return Math.max(1, Math.ceil(maxRank / 2))
  }, [maxRank])
  const clampRank = useCallback(
    (value: number) => Math.max(1, Math.min(value, maxInsertionRank)),
    [maxInsertionRank]
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [selectedRank, setSelectedRank] = useState<number>(getDefaultRank)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const rankListRef = useRef<HTMLDivElement>(null)
  const rankItemRefs = useRef(new Map<number, HTMLButtonElement>())

  const resetFormState = useCallback(() => {
    setSearchQuery('')
    setResults([])
    setError(null)
    setSelectedResult(null)
    setSelectedRank(getDefaultRank())
    setSubmitError(null)
    setIsLoading(false)
    setIsSubmitting(false)
  }, [getDefaultRank])

  useEffect(() => {
    setSelectedRank((previous) => clampRank(previous))
  }, [clampRank])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    window.setTimeout(() => {
      const selectedItem = rankItemRefs.current.get(selectedRank)
      if (selectedItem) {
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 0)
  }, [isOpen, selectedRank])

  useEffect(() => {
    if (!isOpen) {
      resetFormState()
    }
  }, [isOpen, resetFormState])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setResults([])
      setError(null)
      setIsLoading(false)
      setSelectedResult(null)
      return
    }
    setError(null)
    setSubmitError(null)

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          apiUrl(`/api/tmdb/search?query=${encodeURIComponent(searchQuery)}`)
        )
        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = (await response.json()) as { results: SearchResult[] }
        setResults(data.results || [])
      } catch {
        setError('Erreur réseau. Réessaie plus tard.')
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      resetFormState()
      onClose()
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    setSelectedResult(result)
    setSelectedRank(getDefaultRank())
    setSubmitError(null)
  }

  const rankOptions = Array.from({ length: maxInsertionRank }, (_, index) => index + 1)

  const handleAddMovie = async () => {
    if (!selectedResult) {
      return
    }

    const safeRank = clampRank(selectedRank)
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      if (onAddMovieLocal) {
        const localResult = onAddMovieLocal({
          movie: selectedResult,
          rank: safeRank,
        })

        if (localResult.status === 'duplicate') {
          onDuplicateMovie?.({
            movieId: localResult.movieId,
            rank: localResult.rank,
            title: localResult.title,
          })
          resetFormState()
          onClose()
          return
        }

        await onMovieAdded?.({
          movieId: localResult.movieId,
          rank: localResult.rank,
          title: localResult.title,
        })
        resetFormState()
        onClose()
        return
      }

      const response = await fetch(apiUrl('/api/movies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tmdbId: selectedResult.tmdbId,
          title: selectedResult.title,
          posterUrl: selectedResult.posterUrl,
          directorName: selectedResult.directorName,
          releaseDate: selectedResult.releaseDate,
          synopsis: selectedResult.synopsis,
          rank: safeRank,
        }),
      })

      if (response.status === 409) {
        const duplicateData = (await response.json()) as {
          movieId?: number
          rank?: number
          error?: string
        }

        if (typeof duplicateData.movieId === 'number') {
          onDuplicateMovie?.({
            movieId: duplicateData.movieId,
            rank: typeof duplicateData.rank === 'number' ? duplicateData.rank : null,
            title: selectedResult.title,
          })
          resetFormState()
          onClose()
          return
        }
      }

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Impossible d\'ajouter le film')
      }

      const createdMovie = (await response.json()) as { id: number; rank: number; title: string }

      await onMovieAdded?.({
        movieId: createdMovie.id,
        rank: createdMovie.rank,
        title: createdMovie.title,
      })
      resetFormState()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d\'ajouter le film'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className="addMovieOverlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-movie-title"
    >
      <div ref={contentRef} className="addMovieContent">
        {/* Close Button */}
        <button
          className="closeButton"
          onClick={() => {
            resetFormState()
            onClose()
          }}
          aria-label="Close add movie"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Title */}
        <h2 id="add-movie-title" className="addMovieTitle">
          Ajouter un film
        </h2>

        {/* Search Input */}
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          isLoading={isLoading}
          placeholder="Ex: Inception"
        />

        {/* Results Grid */}
        <SearchResultsGrid
          results={results}
          isLoading={isLoading}
          error={error}
          onSelectResult={handleSelectResult}
          selectedTmdbId={selectedResult?.tmdbId ?? null}
        />

        {selectedResult ? (
          <section className="addMovieActionPanel" aria-live="polite">
            <p className="selectedMovieLabel">
              Sélection: <strong>{selectedResult.title}</strong>
            </p>
            {selectedResult.directorName ? (
              <p className="selectedMovieMeta">Réalisation: {selectedResult.directorName}</p>
            ) : null}
            {selectedResult.synopsis ? (
              <p className="selectedMovieSynopsis">{selectedResult.synopsis}</p>
            ) : null}

            <div className="rankPickerRow">
              <label htmlFor="rankPicker">Rang:</label>
              <div
                ref={rankListRef}
                id="rankPicker"
                className="rankWheelList"
                role="listbox"
                aria-label="Sélecteur vertical de rang"
              >
                {rankOptions.map((rankOption) => {
                  const isSelected = rankOption === selectedRank

                  return (
                    <button
                      key={rankOption}
                      ref={(element) => {
                        if (element) {
                          rankItemRefs.current.set(rankOption, element)
                          return
                        }
                        rankItemRefs.current.delete(rankOption)
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`rankWheelItem ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRank(rankOption)}
                    >
                      {rankOption}
                    </button>
                  )
                })}
              </div>
              <div className="rankPickerMeta">
                <button
                  type="button"
                  className="rankStepButton"
                  onClick={() => setSelectedRank((prev) => clampRank(prev - 1))}
                  aria-label="Diminuer le rang"
                >
                  -
                </button>
                <span className="rankCurrentValue">Rang actuel: #{selectedRank}</span>
                <button
                  type="button"
                  className="rankStepButton"
                  onClick={() => setSelectedRank((prev) => clampRank(prev + 1))}
                  aria-label="Augmenter le rang"
                >
                  +
                </button>
              </div>
              <span className="rankHint">1 à {maxInsertionRank}</span>
            </div>

            {submitError ? <p className="submitError">{submitError}</p> : null}

            <button
              type="button"
              className="confirmAddButton"
              onClick={handleAddMovie}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ajout...' : 'Ajouter à ma liste'}
            </button>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export default AddMovieFlow
