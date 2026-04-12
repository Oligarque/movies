import React, { useEffect, useRef, useState } from 'react'
import '../styles/DetailOverlay.css'

export interface Movie {
  id: number
  tmdbId: number
  title: string
  posterUrl?: string | null
  directorName?: string | null
  releaseDate?: string | null
  synopsis?: string | null
  rank: number
  lastWatchedAt?: string | null
  reviewText?: string | null
  createdAt: string
  updatedAt: string
}

interface DetailOverlayProps {
  movie: Movie | null
  isOpen: boolean
  onClose: () => void
  maxRank: number
  onSave?: (movieId: number, updates: { lastWatchedAt?: string | null; reviewText?: string; rank?: number }) => Promise<void>
}

export const DetailOverlay: React.FC<DetailOverlayProps> = ({
  movie,
  isOpen,
  onClose,
  maxRank,
  onSave,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Edit state
  const [editLastWatchedAt, setEditLastWatchedAt] = useState('')
  const [editReviewText, setEditReviewText] = useState('')
  const [editRank, setEditRank] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Initialize edit fields when movie changes
  useEffect(() => {
    if (movie && isOpen) {
      // Convert ISO datetime to YYYY-MM-DD for date input
      let dateValue = ''
      if (movie.lastWatchedAt) {
        try {
          const date = new Date(movie.lastWatchedAt)
          dateValue = date.toISOString().split('T')[0] // YYYY-MM-DD
        } catch {
          dateValue = ''
        }
      }
      setEditLastWatchedAt(dateValue)
      setEditReviewText(movie.reviewText || '')
      setEditRank(movie.rank)
      setSaveError(null)
    }
  }, [movie, isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent scroll on body when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle backdrop click (click on overlay background, not the modal content)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === modalRef.current) {
      onClose()
    }
  }

  // Handle Save
  const handleSave = async () => {
    if (!movie || !onSave) return

    setIsSaving(true)
    setSaveError(null)

    try {
      // Convert date back to ISO string if provided
      let isoDate: string | null = null
      if (editLastWatchedAt) {
        isoDate = new Date(editLastWatchedAt).toISOString()
      }

      const safeRank = Math.max(1, Math.min(editRank, maxRank))

      await onSave(movie.id, {
        lastWatchedAt: isoDate,
        reviewText: editReviewText,
        rank: safeRank,
      })
      onClose()
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to save changes'
      setSaveError(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen || !movie) return null

  return (
    <div
      ref={modalRef}
      className="detailOverlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={contentRef} className="detailOverlayContent">
        {/* Close Button */}
        <button
          className="closeButton"
          onClick={onClose}
          aria-label="Close overlay"
          title="Close (Esc)"
        >
          ✕
        </button>

        {/* Poster */}
        <div className="posterSection">
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="detailPoster"
            />
          ) : (
            <div className="posterPlaceholder">No poster</div>
          )}
        </div>

        {/* Movie Info */}
        <div className="movieInfo">
          <h2 id="modal-title" className="movieTitle">
            {movie.title}
          </h2>

          {movie.directorName && (
            <p className="movieDirector">
              <strong>Réalisateur:</strong> {movie.directorName}
            </p>
          )}

          {movie.releaseDate && (
            <p className="movieReleaseDate">
              <strong>Année:</strong> {movie.releaseDate}
            </p>
          )}

          <p className="movieRank">
            <strong>Rang:</strong> #{movie.rank}
          </p>

          {movie.synopsis && (
            <div className="synopsisSection">
              <strong>Synopsis:</strong>
              <p className="synopsis">{movie.synopsis}</p>
            </div>
          )}

          {/* Editable Fields Section */}
          <div className="editableSection">
            <div className="formGroup">
              <label htmlFor="movieRank" className="formLabel">
                Rang:
              </label>
              <input
                id="movieRank"
                type="number"
                className="dateInput"
                value={editRank}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value, 10)
                  if (Number.isFinite(value)) {
                    setEditRank(value)
                  }
                }}
                min={1}
                max={maxRank}
                disabled={isSaving}
              />
              <small className="rankHelpText">Entre 1 et {maxRank}</small>
            </div>

            <div className="formGroup">
              <label htmlFor="lastWatchedAt" className="formLabel">
                Regardé le:
              </label>
              <input
                id="lastWatchedAt"
                type="date"
                className="dateInput"
                value={editLastWatchedAt}
                onChange={(e) => setEditLastWatchedAt(e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="formGroup">
              <label htmlFor="reviewText" className="formLabel">
                Critique:
              </label>
              <textarea
                id="reviewText"
                className="reviewTextarea"
                value={editReviewText}
                onChange={(e) => setEditReviewText(e.target.value)}
                disabled={isSaving}
                rows={4}
                placeholder="Partage ton avis sur ce film..."
              />
            </div>

            {/* Error Message */}
            {saveError && (
              <p className="errorMessage">{saveError}</p>
            )}

            {/* Save Button */}
            <button
              className="saveButton"
              onClick={handleSave}
              disabled={isSaving}
              title="Save changes (Ctrl+S)"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailOverlay
