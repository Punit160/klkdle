import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs'
import { Link } from 'react-router-dom'


const generatePageItems = (currentPage, totalPages, siblingCount) => {
    const totalPageNumbersToShow = siblingCount * 2 + 5 // first + last + current + 2*siblings + 2 dots

    if (totalPages <= totalPageNumbersToShow) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1

    const firstPageIndex = 1
    const lastPageIndex = totalPages

    if (!shouldShowLeftDots && shouldShowRightDots) {
        const leftItemCount = 3 + 2 * siblingCount
        const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
        return [...leftRange, 'dot-right', lastPageIndex]
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
        const rightItemCount = 3 + 2 * siblingCount
        const rightRange = Array.from(
            { length: rightItemCount },
            (_, i) => totalPages - rightItemCount + i + 1
        )
        return [firstPageIndex, 'dot-left', ...rightRange]
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
        const middleRange = Array.from(
            { length: rightSiblingIndex - leftSiblingIndex + 1 },
            (_, i) => leftSiblingIndex + i
        )
        return [firstPageIndex, 'dot-left', ...middleRange, 'dot-right', lastPageIndex]
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1)
}

const Pagination = ({ currentPage, totalPages, onPageChange, siblingCount = 1 }) => {
    const pageItems = useMemo(
        () => generatePageItems(currentPage, totalPages, siblingCount),
        [currentPage, totalPages, siblingCount]
    )

    if (!totalPages || totalPages <= 1) return null

    const handleClick = (e, page) => {
        e.preventDefault()
        if (page === currentPage) return
        onPageChange(page)
    }

    const goPrev = (e) => {
        e.preventDefault()
        if (currentPage > 1) onPageChange(currentPage - 1)
    }

    const goNext = (e) => {
        e.preventDefault()
        if (currentPage < totalPages) onPageChange(currentPage + 1)
    }

    return (
        <ul className="list-unstyled d-flex align-items-center gap-2 mb-0 pagination-common-style">
            <li>
                <Link
                    to="#"
                    onClick={goPrev}
                    className={currentPage === 1 ? 'disabled' : ''}
                    aria-disabled={currentPage === 1}
                >
                    <BsArrowLeft size={16} />
                </Link>
            </li>

            {pageItems.map((item, index) =>
                item === 'dot-left' || item === 'dot-right' ? (
                    <li key={`${item}-${index}`}>
                        <span className="pagination-dot">
                            <BsDot size={16} />
                        </span>
                    </li>
                ) : (
                    <li key={item}>
                        <Link
                            to="#"
                            className={item === currentPage ? 'active' : ''}
                            onClick={(e) => handleClick(e, item)}
                        >
                            {item}
                        </Link>
                    </li>
                )
            )}

            <li>
                <Link
                    to="#"
                    onClick={goNext}
                    className={currentPage === totalPages ? 'disabled' : ''}
                    aria-disabled={currentPage === totalPages}
                >
                    <BsArrowRight size={16} />
                </Link>
            </li>
        </ul>
    )
}

Pagination.propTypes = {
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    siblingCount: PropTypes.number,
}

export default Pagination