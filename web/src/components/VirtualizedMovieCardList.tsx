import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import SortableMovieCard, { type SortableMovie } from './SortableMovieCard'

interface VirtualizedMovieCardListProps {
  movies: SortableMovie[]
  isDragDisabled?: boolean
  highlightMovieId: number | null
  dropTargetMovieId: number | null
  onOpenMovie: (movie: SortableMovie) => void
  movieCardRefs: { current: Map<number, HTMLElement> }
  focusRequest: { movieId: number; nonce: number } | null
  onFocusRequestResolved?: (movieId: number) => void
}

const ROW_ESTIMATED_SIZE = 188

const VirtualizedMovieCardList: React.FC<VirtualizedMovieCardListProps> = ({
  movies,
  isDragDisabled = false,
  highlightMovieId,
  dropTargetMovieId,
  onOpenMovie,
  movieCardRefs,
  focusRequest,
  onFocusRequestResolved,
}) => {
  'use no memo'

  const parentRef = useRef<HTMLDivElement | null>(null)
  const lastHandledFocusNonceRef = useRef<number | null>(null)

  const rowVirtualizer = useVirtualizer({
    count: movies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATED_SIZE,
    overscan: 8,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  React.useEffect(() => {
    if (!focusRequest) {
      return
    }

    if (lastHandledFocusNonceRef.current === focusRequest.nonce) {
      return
    }

    const targetIndex = movies.findIndex((movie) => movie.id === focusRequest.movieId)
    if (targetIndex < 0) {
      return
    }

    rowVirtualizer.scrollToIndex(targetIndex, { align: 'center' })

    let attempt = 0
    const maxAttempts = 12

    const tryFocus = () => {
      const targetCard = movieCardRefs.current.get(focusRequest.movieId)
      if (targetCard) {
        lastHandledFocusNonceRef.current = focusRequest.nonce
        targetCard.focus()
        onFocusRequestResolved?.(focusRequest.movieId)
        return
      }

      attempt += 1
      if (attempt < maxAttempts) {
        window.requestAnimationFrame(tryFocus)
      }
    }

    window.requestAnimationFrame(tryFocus)
  }, [focusRequest, movieCardRefs, movies, onFocusRequestResolved, rowVirtualizer])

  return (
    <div ref={parentRef} className="virtualListViewport" aria-label="Liste classee des films">
      <div
        className="virtualListInner"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {virtualRows.map((virtualRow) => {
          const movie = movies[virtualRow.index]
          if (!movie) {
            return null
          }

          return (
            <div
              key={movie.id}
              className="virtualRow"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SortableMovieCard
                ref={(element) => {
                  if (element) {
                    movieCardRefs.current.set(movie.id, element)
                    return
                  }
                  movieCardRefs.current.delete(movie.id)
                }}
                movie={movie}
                isDragDisabled={isDragDisabled}
                isHighlighted={highlightMovieId === movie.id}
                isDropTarget={dropTargetMovieId === movie.id}
                onOpen={onOpenMovie}
                registerCardRef={(movieId, element) => {
                  if (element) {
                    movieCardRefs.current.set(movieId, element)
                    return
                  }
                  movieCardRefs.current.delete(movieId)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default VirtualizedMovieCardList
