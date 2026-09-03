import { useSearch } from "../../../contentApi/searchProvider"
// import getIcon from "@/utils/getIcon"

const Search = () => {
    const { searchTerm, setSearchTerm } = useSearch()

    return (
        <div className="input-group">
            {/* <div className="input-group-text ">{getIcon("feather-search")}</div> */}
            <input
                type="text"
                className="form-control  responsive-search rounded-pill"
                placeholder="Search here..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    )
}

export default Search