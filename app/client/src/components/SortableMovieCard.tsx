import { forwardRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type SortableMovie = {
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

interface SortableMovieCardProps {
  movie: SortableMovie
  isDragDisabled?: boolean
  hideDragHandle?: boolean
  isHighlighted?: boolean
  isDropTarget?: boolean
  onOpen: (movie: SortableMovie) => void
  registerCardRef?: (movieId: number, element: HTMLElement | null) => void
}

const SortableMovieCard = forwardRef<HTMLElement, SortableMovieCardProps>(
  ({ movie, isDragDisabled = false, hideDragHandle = false, isHighlighted = false, isDropTarget = false, onOpen, registerCardRef }, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({
        id: movie.id,
        disabled: isDragDisabled,
      })

    const combinedRef = (node: HTMLElement | null) => {
      setNodeRef(node)

      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }

      registerCardRef?.(movie.id, node)
    }

    const handleOpen = () => {
      onOpen(movie)
    }

    const releaseYear = movie.releaseDate?.slice(0, 4)?.trim()
    const hasValidYear = typeof releaseYear === 'string' && /^\d{4}$/.test(releaseYear)

    return (
      <article
        ref={combinedRef}
        className={`movieCard sortableMovieCard ${isDragging ? 'dragging' : ''} ${
          isDropTarget ? 'dropTarget' : ''
        } ${
          isHighlighted ? 'duplicateHighlight' : ''
        } ${
          hideDragHandle ? 'noDragHandle' : ''
        }`}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleOpen()
          }
        }}
        role="button"
        tabIndex={0}
      >
        {!hideDragHandle ? (
          <button
            type="button"
            className="dragHandle"
            aria-label={`Déplacer ${movie.title}`}
            {...attributes}
            {...listeners}
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            ⋮⋮
          </button>
        ) : null}

        <div className="rank">#{movie.rank}</div>
        <img
          className="poster"
          src={movie.posterUrl ?? 'https://via.placeholder.com/92x138?text=No+Poster'}
          alt={movie.title}
          loading="lazy"
          width={92}
          height={138}
        />
        <div className="movieInfo">
          <h2>{movie.title}</h2>
          <p>{movie.directorName ?? 'Realisateur inconnu'}</p>
          <p>{hasValidYear ? releaseYear : 'Annee inconnue'}</p>
        </div>
      </article>
    )
  }
)

SortableMovieCard.displayName = 'SortableMovieCard'

export default SortableMovieCard
