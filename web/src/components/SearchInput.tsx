import React from 'react'
import '../styles/SearchInput.css'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  isLoading?: boolean
  placeholder?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  isLoading = false,
  placeholder = 'Ex: Inception',
}) => {
  const handleClear = () => {
    onChange('')
  }

  return (
    <div className="searchInputWrap">
      <input
        type="search"
        className="searchInputField"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-busy={isLoading}
        aria-label="Search for movies on TMDb"
      />
      {isLoading && <div className="loadingSpinner" aria-label="Loading..." />}
      {!isLoading && value && (
        <button
          className="clearButton"
          onClick={handleClear}
          aria-label="Clear search"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default SearchInput
