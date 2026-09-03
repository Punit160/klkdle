/* eslint-disable react/prop-types */
import React, { useState, useEffect, useMemo } from 'react'
import { FiEye, FiMapPin, FiPhone } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import getIcon from '@/utils/getIcon'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'

import externalApi from '../../../../api/externalApi'
import { external, pages } from '../../../../api/routes'
import { getCompanyId, getUser } from '../../../../utils/auth'

import { useSearch } from '../../../../contentApi/searchProvider'

const PER_PAGE = 20

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    return fallback
}

const formatDate = (isoString) => {
    if (!isoString) return '-'
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Pulls out attachment URL(s) from a complaint row, regardless of which
// field name the backend actually uses. Handles both a single string
// and an array of files.
const getAttachments = (row) => {
    const raw =
        row.complaint_document ??
        row.document ??
        row.attachment ??
        row.attachment_url ??
        row.file ??
        null

    if (!raw) return []
    if (Array.isArray(raw)) return raw.filter(Boolean)
    return [raw]
}

const ViewComplaint = () => {
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions()
    const [complaintData, setComplaintData] = useState([])
    const { searchTerm } = useSearch()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const navigate = useNavigate()

    const fetchComplaints = async () => {
        setLoading(true)
        setError('')

        const companyId = getCompanyId()
        const user = getUser()
        const userId = user?.id

        if (!companyId) {
            setError('Company information missing. Please login again.')
            setLoading(false)
            return
        }

        if (!userId) {
            setError('User information missing. Please login again.')
            setLoading(false)
            return
        }

        try {
            const res = await externalApi.get(external.ssl.complaintView('bihar'), {
                params: {
                    company_id: companyId,
                    user_id: userId,
                },
            })

            if (res?.data?.success) {
                const responseData = res?.data?.data

                // Handle different API response structures safely
                let list = []

                if (Array.isArray(responseData)) {
                    list = responseData
                } else if (Array.isArray(responseData?.data)) {
                    list = responseData.data
                } else if (Array.isArray(responseData?.complaints)) {
                    list = responseData.complaints
                } else if (Array.isArray(res?.data?.complaints)) {
                    list = res.data.complaints
                }

                setComplaintData(list)
                setCurrentPage(1)
            } else {
                setError(res?.data?.message || 'Failed to load complaints.')
            }
        } catch (err) {
            console.error('Error fetching complaints:', err)
            setError(getErrorMessage(err, 'Something went wrong while fetching complaints.'))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchComplaints()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm])

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return complaintData
        const term = searchTerm.toLowerCase()
        return complaintData.filter((row) =>
            row.panchyat?.toLowerCase().includes(term) ||
            row.district?.toLowerCase().includes(term) ||
            row.block?.toLowerCase().includes(term) ||
            row.pole_no?.toLowerCase?.().includes(term) ||
            row.beneficiary_name?.toLowerCase?.().includes(term) ||
            row.contact_no?.toLowerCase?.().includes(term) ||
            row.complaint_issue?.toLowerCase().includes(term) ||
            String(row.complaint_id || '').toLowerCase().includes(term)
        )
    }, [complaintData, searchTerm])

    // Derived stats straight from the fields we actually get back
    const statisticsData = useMemo(() => {
        const districts = new Set()
        const blocks = new Set()
        const panchayats = new Set()

        complaintData.forEach((row) => {
            if (row.district) districts.add(row.district)
            if (row.block) blocks.add(row.block)
            if (row.panchyat) panchayats.add(row.panchyat)
        })

        return [
            { color: "primary", icon: "feather-clipboard", title: "Total Complaints", value: complaintData.length },
            { color: "success", icon: "feather-globe", title: "Districts", value: districts.size },
            { color: "warning", icon: "feather-grid", title: "Blocks", value: blocks.size },
            { color: "danger", icon: "feather-map-pin", title: "Panchayats", value: panchayats.size },
        ]
    }, [complaintData])

    if (isRemoved) {
        return null
    }

    const totalPages = Math.ceil(filteredData.length / PER_PAGE) || 1
    const paginatedData = filteredData.slice(
        (currentPage - 1) * PER_PAGE,
        currentPage * PER_PAGE
    )

    const handleViewDetails = (row) => {
        navigate(`${pages.bihar.complaints}?id=${row.complaint_id}`, { state: { row } })
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
                        <CardHeader title={"Complaint Submissions"} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                        <div className="card-body custom-card-action p-0">
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead>
                                        <tr className="border-b">
                                            <th scope="row">Complaint</th>
                                            <th>Location</th>
                                            <th>Ward No</th>
                                            <th>Pole No</th>
                                            <th>Beneficiary</th>
                                            <th>Issue</th>
                                            <th>Complaint</th>
                                            <th>Attachment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr><td colSpan={8} className="text-center py-4 text-muted">Loading complaints...</td></tr>
                                        )}

                                        {!loading && error && (
                                            <tr><td colSpan={8} className="text-center py-4 text-danger">{error}</td></tr>
                                        )}

                                        {!loading && !error && complaintData.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-4 text-muted">No complaints found.</td></tr>
                                        )}

                                        {!loading && !error && complaintData.length > 0 && filteredData.length === 0 && (
                                            <tr><td colSpan={8} className="text-center py-4 text-muted">No results found for &quot;{searchTerm}&quot;.</td></tr>
                                        )}

                                        {!loading && !error && paginatedData.map((row) => (
                                            <ComplaintRow
                                                key={row.complaint_id}
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

export default ViewComplaint

const ComplaintRow = ({ row }) => {
    const {
        state,
        district,
        block,
        panchyat,
        ward_no,
        pole_no,
        beneficiary_name,
        contact_no,
        complaint_issue,
        complaint,
        start_date,
    } = row

    const attachments = getAttachments(row)

    return (
        <tr className="chat-single-item">
            <td style={{ minWidth: "190px" }}>
                <div className="d-flex align-items-center gap-3">
                    <div className={`avatar-text avatar-md bg-gray-200 icon flex-shrink-0`}>
                        {React.cloneElement(getIcon("feather-alert-circle"), { size: 15 })}
                    </div>
                    <div>

                        <span className="fs-12 d-block fw-normal text-muted text-truncate-1-line">
                           {formatDate(start_date)}
                        </span>
                    </div>
                </div>
            </td>

            <td style={{ minWidth: "190px" }}>
                <div className="hstack gap-2 text-muted">
                    <FiMapPin size={13} className="flex-shrink-0" />
                    <div className="fs-12 lh-sm">
                        <div className="text-dark fw-medium">{district} / {block}</div>
                        <div>{panchyat} {state ? `(${state})` : ''}</div>
                    </div>
                </div>
            </td>

            <td style={{ minWidth: "90px" }}>
                <span className="fs-12 text-dark">{ward_no || '-'}</span>
            </td>

            <td style={{ minWidth: "100px" }}>
                <span className="badge bg-soft-secondary text-secondary">{pole_no || '-'}</span>
            </td>

            <td style={{ minWidth: "160px" }}>
                <div className="fs-12">
                    <div className="text-dark fw-medium">{beneficiary_name || '-'}</div>
                    {contact_no && contact_no !== 'NA' && (
                        <div className="hstack gap-1 text-muted">
                            <FiPhone size={11} />  {contact_no}
                        </div>
                    )}
                </div>
            </td>

            <td style={{ minWidth: "150px" }}>
                <span className="fs-12 text-dark">{complaint_issue || '-'}</span>
            </td>

            <td style={{ minWidth: "180px" }}>
                <span className="fs-12 text-muted text-truncate-1-line d-inline-block" style={{ maxWidth: '220px' }} title={complaint}>
                    {complaint || '-'}
                </span>
            </td>

            <td style={{ minWidth: "120px" }}>
                {attachments.length > 0 ? (
                    <div className="d-flex flex-column gap-1">
                        {attachments.map((url, i) => (
                            <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fs-12 d-inline-flex align-items-center gap-1 text-primary"
                            >
                                <FiEye size={12} /> {attachments.length > 1 ? `File ${i + 1}` : 'View'}
                            </a>
                        ))}
                    </div>
                ) : (
                    <span className="fs-12 text-muted">-</span>
                )}
            </td>
        </tr>
    )
}

export { ComplaintRow }