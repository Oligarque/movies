import React from 'react'
import SortableMovieCard, { type SortableMovie } from './SortableMovieCard'

interface MovieCardListProps {
  movies: SortableMovie[]
  isDragDisabled?: boolean
  hideDragHandle?: boolean
  highlightMovieId: number | null
  dropTargetMovieId: number | null
  onOpenMovie: (movie: SortableMovie) => void
  movieCardRefs: React.MutableRefObject<Map<number, HTMLElement>>
}

const MovieCardList: React.FC<MovieCardListProps> = ({
  movies,
  isDragDisabled = false,
  hideDragHandle = false,
  highlightMovieId,
  dropTargetMovieId,
  onOpenMovie,
  movieCardRefs,
}) => {
  return (
    <section className="listSection" aria-label="Liste classee des films">
      {movies.map((movie) => (
        <SortableMovieCard
          key={movie.id}
          ref={(element) => {
            if (element) {
              movieCardRefs.current.set(movie.id, element)
              return
            }
            movieCardRefs.current.delete(movie.id)
          }}
          movie={movie}
          isDragDisabled={isDragDisabled}
          hideDragHandle={hideDragHandle}
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
      ))}
    </section>
  )
}

export default MovieCardList
