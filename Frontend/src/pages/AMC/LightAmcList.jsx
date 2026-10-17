 
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiDownload, FiEye, FiUpload } from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Pagination from '@/components/shared/Pagination'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { getCompanyId } from '../../utils/auth'
import { userIsAdmin } from '../../utils/userRoles'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getSslAmcConfig } from '../../utils/sslAmcConfig'
import '../../styles/AMC/amc-table-filters.css'

const PER_PAGE = 20

const formatDate = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const LightAmcList = ({ region = 'bihar' }) => {
    const navigate = useNavigate()
    const amcConfig = getSslAmcConfig(region)
    const stateName = amcConfig.stateName
    const addPath = amcConfig.pages.lightAmc
    const detailsPath = amcConfig.pages.lightAmcDetails
    const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions()
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [searchParams, setSearchParams] = useSearchParams()
    const [importing, setImporting] = useState(false)
    const [importMessage, setImportMessage] = useState('')
    const [importError, setImportError] = useState('')
    const fileInputRef = useRef(null)
    const isAdmin = userIsAdmin()
    const workingFilter = searchParams.get('working') || ''
    const districtFilter = (searchParams.get('district') || '').trim()

    const applyFilters = (patch) => {
        const working = Object.prototype.hasOwnProperty.call(patch, 'working') ? patch.working : workingFilter
        const district = Object.prototype.hasOwnProperty.call(patch, 'district') ? patch.district : districtFilter
        const next = new URLSearchParams(searchParams)
        if (working) next.set('working', working)
        else next.delete('working')
        if (district) next.set('district', district)
        else next.delete('district')
        setSearchParams(next, { replace: true })
    }

    const fetchRows = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await localApi.get(app.lightAmc.get, {
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

    const stats = useMemo(() => ({
        total: rows.length,
        working: rows.filter((row) => row.light_working === 'Yes').length,
        notWorking: rows.filter((row) => row.light_working !== 'Yes').length,
    }), [rows])

    const districtOptions = useMemo(
        () => [...new Set(rows.map((row) => String(row.district || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [rows]
    )

    const visibleRows = useMemo(() => rows.filter((row) => {
        if (workingFilter === 'Yes' && row.light_working !== 'Yes') return false
        if (workingFilter === 'No' && row.light_working === 'Yes') return false
        if (districtFilter && String(row.district || '').trim().toLowerCase() !== districtFilter.toLowerCase()) return false
        return true
    }), [rows, workingFilter, districtFilter])

    useEffect(() => {
        setCurrentPage(1)
    }, [workingFilter, districtFilter])

    const paged = useMemo(() => {
        const start = (currentPage - 1) * PER_PAGE
        return visibleRows.slice(start, start + PER_PAGE)
    }, [visibleRows, currentPage])

    const downloadTemplate = async () => {
        setImportError('')
        setImportMessage('')
        try {
            const res = await localApi.get(app.lightAmc.importTemplate, {
                params: { state: stateName, region },
                responseType: 'blob',
            })
            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = region === 'up' ? 'up-amc-import.xlsx' : 'bihar-amc-import.xlsx'
            link.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            setImportError(err?.response?.data?.message || 'Failed to download the Excel template.')
        }
    }

    const importExcel = async (event) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImporting(true)
        setImportError('')
        setImportMessage('')
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await localApi.post(app.lightAmc.import, formData, {
                params: { state: stateName, region },
            })
            const failed = res?.data?.data?.failed || []
            const detail = failed.length
                ? ` ${failed.slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(' ')}`
                : ''
            setImportMessage(`${res?.data?.message || 'Import finished.'}${detail}`)
            await fetchRows()
        } catch (err) {
            setImportError(err?.response?.data?.message || 'Failed to import the Excel file.')
        } finally {
            setImporting(false)
        }
    }

    if (isRemoved) return null

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="row">
                    <div className="col-lg-12">
                        <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
                            <CardHeader title={`${amcConfig.moduleTitle} — Field AMC`} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />
                            <div className="card-body custom-card-action p-0">
                                <div className="amc-stat-grid">
                                    <button
                                        type="button"
                                        className={`amc-stat-card${!workingFilter && !districtFilter ? ' is-active' : ''}`}
                                        onClick={() => applyFilters({ working: '', district: '' })}
                                    >
                                        <div className="amc-stat-value">{stats.total}</div>
                                        <div className="amc-stat-label">All visits</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`amc-stat-card${workingFilter === 'Yes' ? ' is-active' : ''}`}
                                        onClick={() => applyFilters({ working: workingFilter === 'Yes' ? '' : 'Yes' })}
                                    >
                                        <div className="amc-stat-value text-success">{stats.working}</div>
                                        <div className="amc-stat-label">Working</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`amc-stat-card${workingFilter === 'No' ? ' is-active' : ''}`}
                                        onClick={() => applyFilters({ working: workingFilter === 'No' ? '' : 'No' })}
                                    >
                                        <div className="amc-stat-value text-danger">{stats.notWorking}</div>
                                        <div className="amc-stat-label">Not working</div>
                                    </button>
                                </div>
                                <div className="amc-toolbar">
                                    <select
                                        value={workingFilter}
                                        onChange={(event) => applyFilters({ working: event.target.value })}
                                        aria-label="Filter by working status"
                                    >
                                        <option value="">All visits</option>
                                        <option value="Yes">Working</option>
                                        <option value="No">Not working</option>
                                    </select>
                                    <select
                                        value={districtFilter}
                                        onChange={(event) => applyFilters({ district: event.target.value })}
                                        aria-label="Filter by district"
                                    >
                                        <option value="">All districts</option>
                                        {districtOptions.map((district) => (
                                            <option key={district} value={district}>{district}</option>
                                        ))}
                                    </select>
                                    <button type="button" className="btn btn-sm btn-light" onClick={() => applyFilters({ working: '', district: '' })}>
                                        Reset
                                    </button>
                                </div>
                                <div className="d-flex justify-content-end align-items-center gap-2 p-3 pb-0 flex-wrap">
                                    {isAdmin && (
                                        <>
                                            <button type="button" className="btn btn-sm btn-light" onClick={downloadTemplate}>
                                                <FiDownload size={12} className="me-1" /> Excel template
                                            </button>
                                            <button type="button" className="btn btn-sm btn-light" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                                                <FiUpload size={12} className="me-1" /> {importing ? 'Importing...' : 'Import Excel'}
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                                hidden
                                                onChange={importExcel}
                                            />
                                        </>
                                    )}
                                    <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(addPath)}>
                                        Do AMC
                                    </button>
                                </div>
                                {(importMessage || importError) && (
                                    <div className={`alert ${importError ? 'alert-danger' : 'alert-success'} mx-3 mt-3 mb-0 py-2 fs-13`}>
                                        {importError || importMessage}
                                    </div>
                                )}
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
                                            {!loading && !error && rows.length > 0 && visibleRows.length === 0 && (
                                                <tr><td colSpan={9} className="text-center py-4 text-muted">No records match these filters.</td></tr>
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
                                                                `${detailsPath}?id=${row.id}`,
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
                            {visibleRows.length > PER_PAGE && (
                                <div className="card-footer">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(visibleRows.length / PER_PAGE)}
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
