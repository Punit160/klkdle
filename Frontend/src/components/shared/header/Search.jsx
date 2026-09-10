import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FiArrowRight,
  FiClock,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { useSearch } from '../../../contentApi/searchProvider'
import '../../../styles/header-search.css'

const Search = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const {
    searchTerm,
    setSearchTerm,
    searchOpen,
    setSearchOpen,
    searchCategory,
    setSearchCategory,
    searchResults,
    categories,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    clearSearch,
  } = useSearch()

  const visibleResults = searchTerm.trim()
    ? searchResults
    : recentSearches.map((item, index) => ({
      ...item,
      id: `recent-${index}`,
      type: 'recent',
      categoryLabel: 'Recent',
    }))

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [setSearchOpen])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setActiveIndex(-1)
  }, [setSearchOpen])

  const handleSelect = useCallback((item) => {
    if (!item?.path) return

    addRecentSearch(item)
    setSearchTerm('')
    closeSearch()
    navigate(item.path)
  }, [addRecentSearch, closeSearch, navigate, setSearchTerm])

  useEffect(() => {
    closeSearch()
    setActiveIndex(-1)
  }, [location.pathname, closeSearch])

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }

      if (event.key === 'Escape' && searchOpen) {
        event.preventDefault()
        closeSearch()
        inputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeSearch, openSearch, searchOpen])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        closeSearch()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [closeSearch])

  const handleInputKeyDown = (event) => {
    if (!visibleResults.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % visibleResults.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? visibleResults.length - 1 : prev - 1))
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelect(visibleResults[activeIndex])
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`nxl-h-item nxl-header-search header-search-wrap ${searchOpen ? 'is-open' : ''}`}
    >
      <button
        type="button"
        className="nxl-head-link header-search-trigger"
        aria-label="Open search"
        onClick={openSearch}
      >
        <FiSearch size={20} />
      </button>

      <div className="header-search-panel">
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (visibleResults[0]) handleSelect(visibleResults[0])
          }}
        >
          <div className="input-group">
            <span className="input-group-text">
              <FiSearch size={16} />
            </span>
            <input
              ref={inputRef}
              type="search"
              className="form-control search-input-field"
              placeholder="Search pages, modules, records..."
              value={searchTerm}
              autoComplete="off"
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setSearchOpen(true)
                setActiveIndex(-1)
              }}
              onKeyDown={handleInputKeyDown}
            />
            <span className="input-group-text header-search-actions">
              {searchTerm && (
                <button
                  type="button"
                  className="header-search-clear"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <FiX size={14} />
                </button>
              )}
              <span className="header-search-kbd d-none d-md-inline">Ctrl K</span>
            </span>
          </div>
        </form>
      </div>

      {searchOpen && (
        <div className="nxl-search-dropdown">
          <div className="header-search-filters">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`header-search-filter ${searchCategory === category.id ? 'active' : ''}`}
                onClick={() => setSearchCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="search-items-wrapper">
            {!searchTerm.trim() && recentSearches.length > 0 && (
              <div className="header-search-section-head">
                <span>Recent searches</span>
                <button type="button" onClick={clearRecentSearches}>Clear</button>
              </div>
            )}

            {visibleResults.length === 0 ? (
              <div className="header-search-empty">
                {searchTerm.trim()
                  ? `No results for "${searchTerm}"`
                  : 'Start typing to search pages and modules'}
              </div>
            ) : (
              visibleResults.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`header-search-result ${activeIndex === index ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(item)}
                >
                  <span className="header-search-result-icon">
                    {item.type === 'recent' ? <FiClock size={15} /> : <FiSearch size={15} />}
                  </span>
                  <span className="header-search-result-body">
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </span>
                  <FiArrowRight size={14} className="header-search-result-arrow" />
                </button>
              ))
            )}
          </div>

          {searchTerm.trim() && (
            <div className="header-search-footer">
              <span>Tip: search also filters table data on list pages</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Search
