/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiEye } from 'react-icons/fi'
import axios from 'axios'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Pagination from '@/components/shared/Pagination'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { getCompanyId } from '../../utils/auth'
import { LOCAL_API_BASE } from '../../api/localApi'

const LOCAL_API = LOCAL_API_BASE
const PER_PAGE = 20

const formatDate = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const LightAmcList = ({ region = 'bihar' }) => {
    const navigate = useNavigate()
    const stateName = region === 'bihar' ? 'Bihar' : 'Uttar Pradesh'
    const addPath = region === 'bihar' ? '/bihar/ssl-amc/light-amc' : '/uttarpradesh/ssl-amc/light-amc'
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    const fetchRows = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await axios.get(`${LOCAL_API}/dle/light-amc/get`, {
                params: { company_id: getCompanyId(), state: stateName },
            })
            setRows(res?.data?.data || [])
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load AMC records.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRows()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey, stateName])

    const paged = useMemo(() => {
        const start = (currentPage - 1) * PER_PAGE
        return rows.slice(start, start + PER_PAGE)
    }, [rows, currentPage])

    if (isRemoved) return null

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="row">
                    <div className="col-lg-12">
                        <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
                            <CardHeader title="AMC" refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                            <div className="card-body custom-card-action p-0">
                                <div className="d-flex justify-content-end p-3 pb-0">
                                    <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(addPath)}>
                                        Do AMC
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>S.No</th>
                                                <th>AMC Date</th>
                                                <th>Next AMC</th>
                                                <th>Light</th>
                                                <th>Location</th>
                                                <th>Beneficiary</th>
                                                <th>Working</th>
                                                <th>Quarter</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading && (
                                                <tr><td colSpan={9} className="text-center py-4 text-muted">Loading AMC records...</td></tr>
                                            )}
                                            {!loading && error && (
                                                <tr><td colSpan={9} className="text-center py-4 text-danger">{error}</td></tr>
                                            )}
                                            {!loading && !error && rows.length === 0 && (
                                                <tr><td colSpan={9} className="text-center py-4 text-muted">No AMC records yet.</td></tr>
                                            )}
                                            {!loading && !error && paged.map((row, index) => (
                                                <tr key={row.id}>
                                                    <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
                                                    <td>{formatDate(row.amc_date)}</td>
                                                    <td>{formatDate(row.next_amc_date)}</td>
                                                    <td>
                                                        <div className="fw-semibold">{row.unique_id || row.ssl_id}</div>
                                                        <div className="fs-11 text-muted">Pole {row.pole_no || '-'}</div>
                                                    </td>
                                                    <td className="fs-12 text-muted">{[row.district, row.block, row.panchayat].filter(Boolean).join(' / ') || '-'}</td>
                                                    <td>
                                                        <div>{row.beneficiary_name}</div>
                                                        <div className="fs-11 text-muted">{row.beneficiary_contact}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${row.light_working === 'Yes' ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'}`}>
                                                            {row.light_working === 'Yes' ? 'Working' : 'Not working'}
                                                        </span>
                                                    </td>
                                                    <td>{row.quarter_no} / 20</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-light"
                                                            onClick={() => navigate(
                                                                `${region === 'bihar' ? '/bihar/ssl-amc/view-light-amc-details' : '/uttarpradesh/ssl-amc/view-light-amc-details'}?id=${row.id}`,
                                                                { state: { row } }
                                                            )}
                                                        >
                                                            <FiEye size={12} /> View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <CardLoader refreshKey={refreshKey} />
                            </div>
                            {rows.length > PER_PAGE && (
                                <div className="card-footer">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(rows.length / PER_PAGE)}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default LightAmcList
