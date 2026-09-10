/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { getUser } from '../utils/auth'
import {
  buildSearchIndex,
  filterSearchResults,
  getSearchCategories,
} from '../utils/searchIndex'

const RECENT_KEY = 'klkdle_recent_searches'
const MAX_RECENT = 6

const SearchContext = createContext()

const readRecentSearches = () => {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const SearchProvider = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchCategory, setSearchCategory] = useState('all')
  const [recentSearches, setRecentSearches] = useState(readRecentSearches)

  const user = useMemo(() => getUser(), [])
  const searchIndex = useMemo(() => buildSearchIndex(user), [user])
  const categories = useMemo(() => getSearchCategories(user), [user])

  const searchResults = useMemo(
    () => filterSearchResults(searchIndex, searchTerm, searchCategory).slice(0, 12),
    [searchIndex, searchTerm, searchCategory]
  )

  const addRecentSearch = useCallback((item) => {
    if (!item?.path) return

    setRecentSearches((prev) => {
      const next = [
        {
          title: item.title,
          path: item.path,
          subtitle: item.subtitle,
        },
        ...prev.filter((entry) => entry.path !== item.path),
      ].slice(0, MAX_RECENT)

      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(RECENT_KEY)
    setRecentSearches([])
  }, [])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setSearchCategory('all')
  }, [])

  return (
    <SearchContext.Provider
      value={{
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
      }}
    >
      {children}
    </SearchContext.Provider>
  )
}

export const useSearch = () => {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}

export default SearchProvider
