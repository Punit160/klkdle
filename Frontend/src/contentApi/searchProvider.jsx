/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
// contentApi/searchProvider.jsx
import { createContext, useContext, useState } from "react"

const SearchContext = createContext()

const SearchProvider = ({ children }) => {
    const [searchTerm, setSearchTerm] = useState("")

    return (
        <SearchContext.Provider value={{ searchTerm, setSearchTerm }}>
            {children}
        </SearchContext.Provider>
    )
}

export const useSearch = () => {
    const context = useContext(SearchContext)
    if (!context) {
        throw new Error("useSearch must be used within a SearchProvider")
    }
    return context
}

export default SearchProvider