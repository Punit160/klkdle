 
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiDownload, FiEye, FiUpload } from 'react-icons/fi'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Pagination from '@/components/shared/Pagination'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { getCompanyId, getToken, getUser } from '../../utils/auth'
import { APP_API_BASE, joinUrl } from '../../api/config'
import { userIsAdmin } from '../../utils/userRoles'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getSslAmcConfig } from '../../utils/sslAmcConfig'
import { rowsForAmcRegion } from '../../utils/lightAmcRows'
import '../../styles/AMC/amc-table-filters.css'

const PER_PAGE = 20
const IMPORT_ROW_LIMIT = 10000

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
    const [summary, setSummary] = useState({ total: 0, working: 0, notWorking: 0, districts: [] })
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [searchParams, setSearchParams] = useSearchParams()
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState(null)
    const [importMessage, setImportMessage] = useState('')
    const [importError, setImportError] = useState('')
    const [importOpen, setImportOpen] = useState(false)
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
        setCurrentPage(1)
        setSearchParams(next, { replace: true })
    }

    const fetchRows = async () => {
        setLoading(true)
        setError('')
        try {
            const res = await localApi.get(app.lightAmc.get, {
                params: {
                    company_id: getCompanyId(),
                    state: stateName,
                    region,
                    page: currentPage,
                    limit: PER_PAGE,
                    working: workingFilter,
                    district: districtFilter,
                },
            })
            const meta = res?.data?.meta || {}
            setRows(rowsForAmcRegion(region, res?.data?.data, meta.region))
            setSummary({
                total: Number(meta.summary?.total) || 0,
                working: Number(meta.summary?.working) || 0,
                notWorking: Number(meta.summary?.notWorking) || 0,
                districts: Array.isArray(meta.summary?.districts) ? meta.summary.districts : [],
            })
            setTotalPages(Number(meta.total_pages) || 0)
        } catch (err) {
            setRows([])
            setError(err?.response?.data?.message || 'Failed to load AMC records.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRows()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey, stateName, region, currentPage, workingFilter, districtFilter])

    const stats = summary
    const districtOptions = summary.districts

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
            link.download = region === 'offgrid'
                ? 'up-offgrid-amc-import.xlsx'
                : region === 'ongrid'
                    ? 'up-ongrid-amc-import.xlsx'
                    : region === 'powerpack'
                ? 'up-powerpack-amc-import.xlsx'
                : region === 'kusumc'
                    ? 'up-kusumc-amc-import.xlsx'
                    : region === 'up'
                        ? 'up-amc-import.xlsx'
                        : 'bihar-amc-import.xlsx'
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
        setImportProgress({ done: 0, total: 0, percent: 0 })
        setImportError('')
        setImportMessage('')
        try {
            const formData = new FormData()
            formData.append('file', file)
            const params = new URLSearchParams({
                state: stateName,
                region,
                company_id: getCompanyId() || '',
                user_id: String(getUser()?.id || ''),
            })
            const response = await fetch(joinUrl(APP_API_BASE, `${app.lightAmc.import}?${params}`), {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken() || ''}` },
                body: formData,
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.message || 'Failed to import the Excel file.')
            }
            const reader = response.body?.getReader()
            if (!reader) throw new Error('Failed to import the Excel file.')
            const decoder = new TextDecoder()
            let buffer = ''
            let finalEvent = null
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                lines.forEach((line) => {
                    const text = line.trim()
                    if (!text) return
                    const event = JSON.parse(text)
                    if (event.type === 'progress') {
                        const total = Number(event.total) || 0
                        const doneCount = Number(event.done) || 0
                        setImportProgress({
                            done: doneCount,
                            total,
                            percent: total ? Math.min(100, Math.round((doneCount / total) * 100)) : 0,
                        })
                    }
                    if (event.type === 'error') {
                        throw new Error(event.message || 'Failed to import the Excel file.')
                    }
                    if (event.type === 'done') finalEvent = event
                })
            }
            const failed = finalEvent?.errors || []
            const detail = failed.length
                ? ` ${failed.map((item) => `Row ${item.row}: ${item.message}`).join(' ')}`
                : ''
            setImportMessage(`${finalEvent?.message || 'Import finished.'}${detail}`)
            setImportProgress((current) => current ? { ...current, percent: 100, done: current.total || current.done } : current)
            await fetchRows()
        } catch (err) {
            setImportError(err?.message || 'Failed to import the Excel file.')
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
                                            <button type="button" className="btn btn-sm btn-light" onClick={() => setImportOpen(true)} disabled={importing}>
                                                <FiUpload size={12} className="me-1" /> {importing ? `Uploading ${importProgress?.percent || 0}%` : 'Import Excel'}
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
                                {importing && (
                                    <div className="mx-3 mt-3">
                                        <div className="d-flex justify-content-between fs-13 mb-1">
                                            <span>
                                                {importProgress?.total
                                                    ? `Uploaded ${importProgress.done} of ${importProgress.total}`
                                                    : 'Reading the Excel file...'}
                                            </span>
                                            <span>{importProgress?.percent || 0}%</span>
                                        </div>
                                        <div className="progress" style={{ height: 8 }}>
                                            <div
                                                className="progress-bar"
                                                role="progressbar"
                                                style={{ width: `${importProgress?.percent || 0}%` }}
                                                aria-valuenow={importProgress?.percent || 0}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                            />
                                        </div>
                                    </div>
                                )}
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
                                                <th>{region === 'offgrid' ? 'Off grid' : region === 'ongrid' ? 'On grid' : region === 'powerpack' ? 'Power pack' : region === 'kusumc' ? 'Pump' : 'Light'}</th>
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
                                            {!loading && !error && rows.map((row, index) => (
                                                <tr key={row.id}>
                                                    <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
                                                    <td>{formatDate(row.amc_date)}</td>
                                                    <td>{formatDate(row.next_amc_date)}</td>
                                                    <td>
                                                        <div className="fw-semibold">
                                                            {region === 'offgrid'
                                                                ? (row.offgrid_id || row.ssl_id)
                                                                : region === 'ongrid'
                                                                    ? (row.ongrid_id || row.ssl_id)
                                                                    : region === 'powerpack'
                                                                ? (row.powerpack_id || row.ssl_id)
                                                                : region === 'kusumc'
                                                                    ? (row.pump_id || row.ssl_id)
                                                                    : (row.unique_id || row.ssl_id)}
                                                        </div>
                                                        <div className="fs-11 text-muted">
                                                            {region === 'offgrid' || region === 'ongrid'
                                                                ? (row.installed_place || row.scheme_name || '-')
                                                                : region === 'powerpack'
                                                                ? (row.scheme_name || row.capacity || '-')
                                                                : region === 'kusumc'
                                                                    ? (row.work_order_no || row.capacity || '-')
                                                                    : `Pole ${row.pole_no || '-'}`}
                                                        </div>
                                                    </td>
                                                    <td className="fs-12 text-muted">{[row.district, row.block, row.panchayat || row.village].filter(Boolean).join(' / ') || '-'}</td>
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
                            {totalPages > 1 && (
                                <div className="card-footer">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {importOpen && (
                <>
                    <div className="modal-backdrop fade show" style={{ zIndex: 100000 }} />
                    <div
                        className="modal fade show d-block"
                        style={{ zIndex: 100001 }}
                        tabIndex={-1}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="amc-excel-import-title"
                    >
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title" id="amc-excel-import-title">Import Excel</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={() => setImportOpen(false)}
                                    />
                                </div>
                                <div className="modal-body">
                                    <p className="fs-13 mb-2">
                                        You can upload up to <strong>{IMPORT_ROW_LIMIT.toLocaleString('en-IN')}</strong> visits in one Excel file.
                                    </p>
                                    <p className="fs-13 text-muted mb-0">
                                        Download the template, fill the visit rows, then choose that file to import. Put the visit number in <strong>quarter_no</strong> (1 to 20). Leave that cell blank and the next quarter is filled in.
                                    </p>
                                    {(importMessage || importError) && (
                                        <div className={`alert ${importError ? 'alert-danger' : 'alert-success'} mt-3 mb-0 py-2 fs-13`}>
                                            {importError || importMessage}
                                        </div>
                                    )}
                                    {importing && (
                                        <div className="mt-3">
                                            <div className="d-flex justify-content-between fs-13 mb-1">
                                                <span>
                                                    {importProgress?.total
                                                        ? `Uploaded ${importProgress.done} of ${importProgress.total}`
                                                        : 'Reading the Excel file...'}
                                                </span>
                                                <span>{importProgress?.percent || 0}%</span>
                                            </div>
                                            <div className="progress" style={{ height: 8 }}>
                                                <div
                                                    className="progress-bar"
                                                    role="progressbar"
                                                    style={{ width: `${importProgress?.percent || 0}%` }}
                                                    aria-valuenow={importProgress?.percent || 0}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-light" onClick={() => setImportOpen(false)}>
                                        Close
                                    </button>
                                    <button type="button" className="btn btn-light" onClick={downloadTemplate} disabled={importing}>
                                        <FiDownload size={14} className="me-1" /> Excel template
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={importing}
                                    >
                                        <FiUpload size={14} className="me-1" /> {importing ? `Uploading ${importProgress?.percent || 0}%` : 'Choose Excel file'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    )
}

export default LightAmcList
