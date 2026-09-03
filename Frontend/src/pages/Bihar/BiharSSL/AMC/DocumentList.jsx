import React, { useState, useEffect, useMemo } from 'react'
import { FiEye, FiFileText, FiMapPin } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import getIcon from '@/utils/getIcon'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'

import { getCompanyId } from '../../../../utils/auth'
import localApi from '../../../../api/localApi'

import { useSearch } from '../../../../contentApi/searchProvider'

const PER_PAGE = 20

const formatMonthYear = (monthYear) => {
    if (!monthYear) return null
    const [year, month] = monthYear.split('-')
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

const formatPeriodRange = (start, end) => {
    const s = formatMonthYear(start)
    const e = formatMonthYear(end)
    if (!s && !e) return '-'
    if (s && e && start === end) return s
    if (s && e) return `${s} - ${e}`
    return s || e
}

const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// API now nests documents inside each AMC period: row.amc[].document[]
const getAmcList = (row) => (Array.isArray(row?.amc) ? row.amc : [])

const countDocuments = (row) => {
    let count = 0
    getAmcList(row).forEach((amcEntry) => {
        const docs = Array.isArray(amcEntry.document) ? amcEntry.document : []
        docs.forEach((d) => {
            if (d.amc_document) count += 1
            if (d.invoice_document) count += 1
        })
    })
    return count
}

const getPeriods = (row) => {
    // Each amc period already carries its own start/end month-year, no need to dig into documents
    return getAmcList(row)
        .map((a) => ({ start: a.start_month_year, end: a.end_month_year }))
        .sort((a, b) => (b.start || '').localeCompare(a.start || ''))
}

const getLightTotals = (row) => {
    return getAmcList(row).reduce(
        (acc, a) => {
            acc.total += Number(a.total_lights) || 0
            acc.completed += Number(a.completed_lights) || 0
            acc.pending += Number(a.pending_lights) || 0
            return acc
        },
        { total: 0, completed: 0, pending: 0 }
    )
}

const DocumentList = () => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions()
    const [amcData, setAmcData] = useState([])
    const { searchTerm } = useSearch()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const navigate = useNavigate()
    const [summary, setSummary] = useState({
        total_district: 0,
        total_block: 0,
        total_panchayat: 0,
        total_lights: 0,
    })

 const fetchAmcDocuments = async () => {
    setLoading(true)
    setError('')

    const companyId = getCompanyId()

    if (!companyId) {
        setError('Company information missing. Please login again.')
        setLoading(false)
        return
    }

    try {
        const response = await localApi.get('/klkdle/bihar/ssl-amc/get')
        const res = response.data

        if (res?.success) {
            setAmcData(res.data || [])

            // Agar backend summary bhej raha hai
            setSummary(res.summary || {
                total_district: 0,
                total_block: 0,
                total_panchayat: 0,
                total_lights: 0,
            })

            setCurrentPage(1)
        } else {
            setError(res?.message || 'Failed to load AMC documents.')
        }
    } catch (err) {
        console.error('Error fetching AMC documents:', err)
        setError('Something went wrong while fetching data.')
    } finally {
        setLoading(false)
    }
}

    useEffect(() => {
        fetchAmcDocuments()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return amcData
        const term = searchTerm.toLowerCase()
        return amcData.filter((row) =>
            row.panchayat?.toLowerCase().includes(term) ||
            row.district?.toLowerCase().includes(term) ||
            row.block?.toLowerCase().includes(term)
        )
    }, [amcData, searchTerm])

    const statisticsData = [
        {
            color: "primary",
            icon: "feather-globe",
            title: "Total Districts",
            value: summary.total_district,
        },
        {
            color: "success",
            icon: "feather-grid",
            title: "Total Blocks",
            value: summary.total_block,
        },
        {
            color: "warning",
            icon: "feather-map-pin",
            title: "Total Panchayats",
            value: summary.total_panchayat,
        },
        {
            color: "danger",
            icon: "feather-sun",
            title: "Total Lights",
            value: summary.total_lights,
        },
    ]

    if (isRemoved) {
        return null
    }

    const totalPages = Math.ceil(filteredData.length / PER_PAGE) || 1
    const paginatedData = filteredData.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE
    )

    const handleViewDetails = (row) => {
        navigate(`/bihar/ssl-amc/view-document-details?id=${row.id}`, { state: { row } })
    }

    return (
        <>
            <PageHeader />
            <div className='main-content'>
                <div className="row">
                    {statisticsData.map(({ color, icon, title, value }, index) => (
                        <div key={index} className="col-xxl-3 col-md-6">
                            <div className={`card text-${color} border-${color} border-dashed`}>
                                <div className="card-body">
                                    <div className="d-flex align-items-center">

                                        {/* Icon */}
                                        <div className={`avatar-text bg-soft-${color} text-${color} border-0 me-3`}>
                                            {getIcon(icon)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-grow-1">
                                            <span className="fs-13 fw-semibold text-muted d-block">
                                                {title}
                                            </span>
                                            <h5 className={`mb-0 fw-bold text-${color}`}>
                                                {value}
                                            </h5>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="col-12">
                    <div className={`card stretch stretch-full ${isExpanded ? "card-expand" : ""} ${refreshKey ? "card-loading" : ""}`}>
                        <CardHeader title={"AMC documentation"} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                        <div className="card-body custom-card-action p-0">
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead>
                                        <tr className="border-b">
                                            <th scope="row">Panchayat</th>
                                            <th>Location</th>
                                            <th>Period(s)</th>
                                            <th>Lights</th>
                                            <th>Documents</th>
                                            <th className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr><td colSpan={6} className="text-center py-4 text-muted">Loading AMC documents...</td></tr>
                                        )}

                                        {!loading && error && (
                                            <tr><td colSpan={6} className="text-center py-4 text-danger">{error}</td></tr>
                                        )}

                                        {!loading && !error && amcData.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-4 text-muted">No AMC documents found.</td></tr>
                                        )}

                                        {!loading && !error && amcData.length > 0 && filteredData.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-4 text-muted">No results found for &quot;{searchTerm}&quot;.</td></tr>
                                        )}

                                        {!loading && !error && paginatedData.map((row) => (
                                            <DocumentRow
                                                key={row.id}
                                                row={row}
                                                onViewDetails={() => handleViewDetails(row)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {!loading && !error && filteredData.length > 0 && (
                                <div className="d-flex justify-content-between align-items-center px-3 py-3 flex-wrap gap-2">
                                    <span className="fs-12 text-muted">
                                        Showing {((currentPage - 1) * PER_PAGE) + 1}-
                                        {Math.min(currentPage * PER_PAGE, filteredData.length)} of {filteredData.length}
                                    </span>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                        <CardLoader refreshKey={refreshKey} />
                    </div>
                </div>
            </div>
        </>
    )
}

export default DocumentList

const DocumentRow = ({ row, onViewDetails }) => {
    const { panchayat, district, block, created_at } = row
    const documentsCount = countDocuments(row)
    const periods = getPeriods(row)
    const lights = getLightTotals(row)

    const MAX_PERIOD_BADGES = 2
    const visiblePeriods = periods.slice(0, MAX_PERIOD_BADGES)
    const extraPeriodsCount = periods.length - visiblePeriods.length

    return (
        <tr className="chat-single-item">
            <td style={{ minWidth: "230px" }}>
                <div className="d-flex align-items-center gap-3">
                    <div className={`avatar-text avatar-md bg-gray-200 icon flex-shrink-0`}>
                        {React.cloneElement(getIcon("feather-file-text"), { size: 15 })}
                    </div>
                    <div>
                        <a href="#" className="d-block fs-13 fw-bold text-truncate-1-line">{panchayat || '-'}</a>
                        <span className="fs-12 d-block fw-normal text-muted text-truncate-1-line">{formatDate(created_at)}</span>
                    </div>
                </div>
            </td>

            <td style={{ minWidth: "170px" }}>
                <div className="hstack gap-2 text-muted">
                    <FiMapPin size={13} className="flex-shrink-0" />
                    <div className="fs-12 lh-sm">
                        <div className="text-dark fw-medium">{district} / {block}</div>
                        <div>{panchayat}</div>
                    </div>
                </div>
            </td>

            <td style={{ minWidth: "150px" }}>
                {periods.length === 0 ? (
                    <span className="text-muted">-</span>
                ) : (
                    <div className="d-flex flex-wrap gap-1">
                        {visiblePeriods.map((p, i) => (
                            <span key={i} className="badge bg-soft-primary text-primary">
                                {formatPeriodRange(p.start, p.end)}
                            </span>
                        ))}
                        {extraPeriodsCount > 0 && (
                            <span
                                className="badge bg-soft-secondary text-secondary"
                                title={periods.slice(MAX_PERIOD_BADGES).map((p) => formatPeriodRange(p.start, p.end)).join(', ')}
                            >
                                +{extraPeriodsCount} more
                            </span>
                        )}
                    </div>
                )}
            </td>

            <td style={{ minWidth: "150px" }}>
                <div className="fs-12">
                    <div className="text-dark fw-semibold">{lights.completed} done</div>
                    <div className="text-danger">{lights.pending} pending</div>
                    <div className="text-muted fs-11">{lights.total} total lights</div>
                </div>
            </td>

            <td>
                <div className="d-flex align-items-center gap-2">
                    <div className="avatar-text avatar-sm bg-soft-success text-success icon">
                        <FiFileText size={13} />
                    </div>
                    <div className="fs-12">
                        <div className="fw-semibold text-dark">{documentsCount} Files</div>
                        <div className="text-muted">Docs Uploaded</div>
                    </div>
                </div>
            </td>

            <td className="text-end">
                <div className="hstack gap-2 justify-content-end">
                    <button
                        type="button"
                        className="avatar-text avatar-md bg-soft-primary"
                        onClick={onViewDetails}
                        title="View details"
                        disabled={documentsCount === 0}
                    >
                        <FiEye size={13} />
                    </button>
                </div>
            </td>
        </tr>
    )
}

export { DocumentRow }