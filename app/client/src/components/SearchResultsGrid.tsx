import React from 'react'
import '../styles/SearchResultsGrid.css'

export interface SearchResult {
  tmdbId: number
  title: string
  posterUrl: string | null
  releaseDate: string
  directorName?: string | null
  synopsis?: string | null
  alreadyInLibrary: boolean
  libraryRank: number | null
}

interface SearchResultsGridProps {
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  onSelectResult?: (result: SearchResult) => void
  selectedTmdbId?: number | null
}

export const SearchResultsGrid: React.FC<SearchResultsGridProps> = ({
  results,
  isLoading,
  error,
  onSelectResult,
  selectedTmdbId = null,
}) => {
  if (isLoading) {
    return (
      <div className="searchResultsCenter">
        <p>Recherche en cours...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="searchResultsCenter error">
        <p>{error}</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="searchResultsCenter">
        <p>Aucun film trouvé. Essaie un autre titre.</p>
      </div>
    )
  }

  return (
    <div className="searchResultsGrid">
      {results.map((result) => (
        <article
          key={result.tmdbId}
          className={`searchResultCard ${selectedTmdbId === result.tmdbId ? 'selected' : ''}`}
          onClick={() => onSelectResult?.(result)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectResult?.(result)
            }
          }}
          role="button"
          tabIndex={0}
        >
          {result.alreadyInLibrary && (
            <div className="rankBadge">#{result.libraryRank}</div>
          )}

          <div className="posterContainer">
            {result.posterUrl ? (
              <img
                src={result.posterUrl}
                alt={result.title}
                className="resultPoster"
                loading="lazy"
                width={150}
                height={225}
              />
            ) : (
              <div className="posterPlaceholder">No Poster</div>
            )}
          </div>

          <div className="resultInfo">
            <h3 className="resultTitle">{result.title}</h3>
            {result.releaseDate && (
              <p className="resultYear">
                {result.releaseDate.substring(0, 4)}
              </p>
            )}
            {result.directorName && (
              <p className="resultDirector">Réal. {result.directorName}</p>
            )}
            {result.synopsis && (
              <p className="resultSynopsis">{result.synopsis}</p>
            )}
            {result.alreadyInLibrary && (
              <p className="alreadyAdded">Déjà dans ta liste</p>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

export default SearchResultsGrid
