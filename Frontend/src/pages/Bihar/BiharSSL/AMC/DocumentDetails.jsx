/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiEyeOff, FiEye, FiFileText, FiEdit, FiCheck, FiX, FiLoader, FiCheckCircle, FiUploadCloud, FiMapPin, FiClock, FiLayers, FiPlus } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import localApi from '../../../../api/localApi'
import { app } from '../../../../api/routes'
import { getCompanyId } from '../../../../utils/auth'

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    return fallback
}

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

const getFileName = (path) => (path ? path.split('/').pop() : null)

const statusBadge = (status, label) => (
    <span className={`badge ${status === 1 ? 'bg-soft-success text-success' : 'bg-soft-danger text-danger'} rounded-pill`}>
        {label} {status === 1 ? 'Active' : 'Inactive'}
    </span>
)

const validationBadge = (status) => {
    const map = {
        pending: 'bg-soft-warning text-warning',
        approved: 'bg-soft-success text-success',
        rejected: 'bg-soft-danger text-danger',
    }
    const cls = map[status] || 'bg-soft-secondary text-secondary'
    return <span className={`badge ${cls} rounded-pill text-capitalize`}>{status || 'pending'}</span>
}

// Colors used for the left accent border + progress bar of a period card
const getPeriodAccent = (pct) => {
    if (pct >= 100) return { border: '#1cbb8c', bar: '#1cbb8c', bg: 'rgba(28,187,140,0.08)' }
    if (pct > 0) return { border: '#f7b924', bar: '#f7b924', bg: 'rgba(247,185,36,0.08)' }
    return { border: '#ff5c75', bar: '#ff5c75', bg: 'rgba(255,92,117,0.08)' }
}

const parsePoleNos = (pole_no) => {
    if (Array.isArray(pole_no)) {
        return pole_no
    }

    if (typeof pole_no === 'string' && pole_no.trim()) {
        try {
            const parsed = JSON.parse(pole_no)

            return Array.isArray(parsed)
                ? parsed
                : []
        } catch {
            return []
        }
    }

    return []
}

const parseSslIds = (ssl_id) => {
    if (Array.isArray(ssl_id)) return ssl_id
    if (typeof ssl_id === 'string' && ssl_id.trim()) {
        try {
            const parsed = JSON.parse(ssl_id)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }
    return []
}

const InlineFilePicker = ({ file, onChange, existingName }) => {
    const inputRef = React.useRef(null)
    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                className="d-none"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => onChange(e.target.files?.[0] || null)}
            />
            {file ? (
                <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-soft-success text-success text-truncate" style={{ maxWidth: '140px' }} title={file.name}>
                        {file.name}
                    </span>
                    <button type="button" className="btn btn-sm btn-light p-1" onClick={() => onChange(null)} title="Remove">
                        <FiX size={12} />
                    </button>
                </div>
            ) : (
                <div className="d-flex flex-column gap-1">
                    {existingName ? (
                        <span className="fs-11 text-muted text-truncate" style={{ maxWidth: '150px' }} title={existingName}>
                            Current: {existingName}
                        </span>
                    ) : (
                        <span className="fs-11 text-muted">No file uploaded yet</span>
                    )}
                    <button type="button" className="btn btn-sm btn-light d-inline-flex align-items-center gap-1" onClick={() => inputRef.current?.click()}>
                        <FiUploadCloud size={12} /> {existingName ? 'Replace' : 'Upload'}
                    </button>
                </div>
            )}
        </div>
    )
}

// Small reusable progress bar
const ProgressBar = ({ pct, color = '#435084', height = 6 }) => (
    <div className="w-100 rounded-pill overflow-hidden" style={{ height, background: '#eef0f5' }}>
        <div
            className="h-100 rounded-pill"
            style={{
                width: `${Math.min(Math.max(pct, 0), 100)}%`,
                background: color,
                transition: 'width .4s ease',
            }}
        />
    </div>
)

// ---- Header stat card (Total / Completed / Pending) ----
const HeaderStat = ({ icon, label, value, color, pct }) => (
    <div className="d-flex align-items-center gap-2 px-3 py-2 rounded-3 bg-white border" style={{ minWidth: '150px' }}>
        <div
            className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{ width: 34, height: 34, background: `${color}1a`, color }}
        >
            {icon}
        </div>
        <div className="flex-grow-1">
            <div className="fs-11 text-muted lh-1 mb-1">{label}</div>
            <div className="fs-15 fw-bold text-dark lh-1">{value}</div>
            {typeof pct === 'number' && (
                <div className="mt-2">
                    <ProgressBar pct={pct} color={color} height={4} />
                </div>
            )}
        </div>
    </div>
)

const SslPoleCard = ({ title = 'SSL ID & Pole No', sslIds = [], poleNos = [], emptyText = 'No lights in this list.', tone = 'primary' }) => {
    const rowCount = Math.max(sslIds.length, poleNos.length)
    const [isOpen, setIsOpen] = useState(false)

    if (rowCount === 0) {
        return (
            <div className="border rounded-3 p-3 text-center text-muted fs-12 bg-light">
                {emptyText}
            </div>
        )
    }

    return (
        <div className="border rounded-3 overflow-hidden">
            <div
                className="d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light"
                role="button"
                onClick={() => setIsOpen((prev) => !prev)}
                style={{ cursor: "pointer", userSelect: "none" }}
            >
                {isOpen ? (
                    <FiEye size={14} className={`text-${tone}`} />
                ) : (
                    <FiEyeOff size={14} className="text-muted" />
                )}

                <span className="fs-12 fw-semibold text-dark">
                    {title}
                </span>

                <span className={`badge bg-soft-${tone} text-${tone} ms-auto rounded-pill`}>
                    {rowCount} light{rowCount !== 1 ? 's' : ''}
                </span>

                <span className="badge bg-soft-secondary text-secondary rounded-pill d-inline-flex align-items-center gap-1">
                    {isOpen ? "Hide" : "Show"}
                    {isOpen ? <FiEye size={12} /> : <FiEyeOff size={12} />}
                </span>
            </div>
            {isOpen && (
                <div
                    className="p-2"
                    style={{
                        maxHeight: "220px",
                        overflowY: "auto",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(230px, 2fr))",
                        gap: "10px",
                    }}
                >
                    {Array.from({ length: rowCount }).map((_, i) => (
                        <div
                            key={i}
                            className="d-flex align-items-center justify-content-between gap-2 px-2 py-1 rounded-2"
                            style={{ background: '#f7f8fb', border: '1px solid #eef0f5' }}
                        >
                            <span className="fs-11 text-muted text-truncate" title={`SSL ID ${sslIds[i] ?? '-'}`}>
                                {sslIds[i] ?? '-'}
                            </span>
                            {poleNos[i] !== undefined ? (
                                <span className="badge bg-soft-secondary text-secondary fs-10">{poleNos[i]}</span>
                            ) : (
                                <span className="fs-10 text-muted">-</span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ---- Single document sub-entry inside a period (a period can have more than one document) ----
const DocumentEntryCard = ({ entry, isEditing, onStartEdit, onCancelEdit, onSave, editRemarks, setEditRemarks, editAmcFile, setEditAmcFile, editInvoiceFile, setEditInvoiceFile, isSaving, onAddComplaint }) => {
    const amcUrl = entry.amc_document_url
    const invoiceUrl = entry.invoice_document_url
    const sslIds = parseSslIds(entry.ssl_id)
    const poleNos = parsePoleNos(entry.pole_no)

    return (
        <div className="rounded-3 p-3 mb-2" style={{ border: '1px dashed #dde1ea', background: '#fbfcfe' }}>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="fs-12 fw-semibold text-dark">Document #{entry.id}</span>
                    {validationBadge(entry.validation_status)}
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-sm btn-warning d-inline-flex align-items-center gap-1"
                        onClick={() => onAddComplaint(entry, sslIds, poleNos)}
                        title="Register a complaint for a site from this document"
                    >
                        <FiPlus size={12} /> Add Complaint
                    </button>
                    {isEditing ? (
                        <>
                            <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" onClick={() => onSave(entry)} disabled={isSaving}>
                                {isSaving ? <FiLoader className="spin" size={12} /> : <FiCheck size={12} />} Save
                            </button>
                            <button type="button" className="btn btn-sm btn-light" onClick={onCancelEdit} disabled={isSaving}>Cancel</button>
                        </>
                    ) : (
                        <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" onClick={() => onStartEdit(entry)}>
                            <FiEdit size={12} /> Edit
                        </button>
                    )}
                </div>
            </div>

            <div className="row g-3 mb-3">
                <div className="col-md-4">
                    <label className="fs-11 text-muted d-block mb-1">AMC Document</label>
                    {isEditing ? (
                        <InlineFilePicker file={editAmcFile} onChange={setEditAmcFile} existingName={getFileName(entry.amc_document)} />
                    ) : entry.amc_document ? (
                        <div className="d-flex align-items-center gap-2">
                            <FiFileText size={13} className="text-muted flex-shrink-0" />
                            <span className="fs-12 text-truncate" style={{ maxWidth: '110px' }} title={getFileName(entry.amc_document)}>
                                {getFileName(entry.amc_document)}
                            </span>
                            <a href={amcUrl} target="_blank" rel="noopener noreferrer" title="View" className="text-muted">
                                <FiEye size={13} />
                            </a>
                        </div>
                    ) : (
                        <span className="text-muted">-</span>
                    )}
                    <div className="mt-1">{statusBadge(entry.amc_doc_status, 'AMC')}</div>
                </div>

                <div className="col-md-4">
                    <label className="fs-11 text-muted d-block mb-1">Invoice Document</label>
                    {isEditing ? (
                        <InlineFilePicker file={editInvoiceFile} onChange={setEditInvoiceFile} existingName={getFileName(entry.invoice_document)} />
                    ) : entry.invoice_document ? (
                        <div className="d-flex align-items-center gap-2">
                            <FiFileText size={13} className="text-muted flex-shrink-0" />
                            <span className="fs-12 text-truncate" style={{ maxWidth: '110px' }} title={getFileName(entry.invoice_document)}>
                                {getFileName(entry.invoice_document)}
                            </span>
                            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" title="View" className="text-muted">
                                <FiEye size={13} />
                            </a>
                        </div>
                    ) : (
                        <span className="text-muted">-</span>
                    )}
                    {entry.invoice_document && <div className="mt-1">{statusBadge(entry.invoice_status, 'Invoice')}</div>}
                </div>

                <div className="col-md-4">
                    <label className="fs-11 text-muted d-block mb-1">Remarks</label>
                    {isEditing ? (
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editRemarks}
                            onChange={(e) => setEditRemarks(e.target.value)}
                            placeholder="Optional remarks"
                        />
                    ) : (
                        <span className="fs-12 text-muted">{entry.remarks || '-'}</span>
                    )}
                </div>
            </div>

            <SslPoleCard sslIds={sslIds} poleNos={poleNos} title="Lights in this document" />
        </div>
    )
}

const DocumentDetails = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const id = searchParams.get('id')

    const [row, setRow] = useState(location.state?.row || null)
    const [loading, setLoading] = useState(!location.state?.row)
    const [error, setError] = useState('')

    // amcPeriods = row.amc, each period holds its own document[] array
    const [amcPeriods, setAmcPeriods] = useState(Array.isArray(row?.amc) ? row.amc : [])
    const [editingId, setEditingId] = useState(null) // id of the document sub-entry being edited
    const [editRemarks, setEditRemarks] = useState('')
    const [editAmcFile, setEditAmcFile] = useState(null)
    const [editInvoiceFile, setEditInvoiceFile] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [rowError, setRowError] = useState('')
    const [rowSuccess, setRowSuccess] = useState('')

    useEffect(() => {
        if (row || !id) return

        const companyId = getCompanyId()
        if (!companyId) {
            setError('Company information missing. Please login again.')
            setLoading(false)
            return
        }

        const fetchRow = async () => {
            setLoading(true)
            setError('')
            try {
                // Same app route family as DocumentList — list then pick this record.
                const res = await localApi.get(app.ssl.get('bihar'))
                if (res.data?.success) {
                    const list = res.data.data || []
                    const found = list.find((r) => String(r.id) === String(id)) || list[0]
                    if (found) {
                        setRow(found)
                    } else {
                        setError('Record not found.')
                    }
                } else {
                    setError(res.data?.message || 'Failed to load details.')
                }
            } catch (err) {
                console.error('Error fetching AMC details:', err)
                setError(getErrorMessage(err, 'Something went wrong while fetching details.'))
            } finally {
                setLoading(false)
            }
        }
        fetchRow()
    }, [id, row])

    useEffect(() => {
        setAmcPeriods(Array.isArray(row?.amc) ? row.amc : [])
    }, [row])

    const sortedPeriods = [...amcPeriods].sort((a, b) => {
        const aKey = a.start_month_year || ''
        const bKey = b.start_month_year || ''
        if (aKey !== bKey) return bKey.localeCompare(aKey)
        return (b.amc_no || 0) - (a.amc_no || 0)
    })

    // Header totals come straight from each period's light counts
    const headerAgg = amcPeriods.reduce(
        (acc, p) => {
            acc.total += Number(p.total_lights) || 0
            acc.completed += Number(p.completed_lights) || 0
            acc.pending += Number(p.pending_lights) || 0
            return acc
        },
        { total: 0, completed: 0, pending: 0 }
    )
    const headerPct = headerAgg.total > 0 ? (headerAgg.completed / headerAgg.total) * 100 : 0

    const startEdit = (entry) => {
        setEditingId(entry.id)
        setEditRemarks(entry.remarks || '')
        setEditAmcFile(null)
        setEditInvoiceFile(null)
        setRowError('')
        setRowSuccess('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditAmcFile(null)
        setEditInvoiceFile(null)
        setRowError('')
    }

    // Navigate to the Complaint form, carrying the SSL ID + Pole No pairs for
    // this document's sites so the complaint form's "Pole No" dropdown can be
    // populated (the value stays ssl_id, only the label shown is pole_no).
    const goToComplaint = (entry, sslIds, poleNos) => {
        const sites = sslIds.map((sslId, i) => ({
            ssl_id: sslId,
            pole_no: poleNos[i] ?? '',
            unique_id: '',
        }))

        navigate('/bihar/ssl-amc/complaint', {
            state: {
                sites,
                district: row?.district,
                block: row?.block,
                panchayat: row?.panchayat,
                state: row?.state,
                volume: Array.isArray(entry.volume) ? entry.volume[0] : (entry.volume || row?.state),
                bihar_ssl_amc_id: entry.bihar_ssl_amc_id || row?.id,
                document_id: entry.id,
            },
        })
    }

    const saveEdit = async (entry) => {
        const companyId = getCompanyId()
        if (!companyId) {
            setRowError('Company information missing. Please login again.')
            return
        }

        setIsSaving(true)
        setRowError('')
        setRowSuccess('')
        try {
            const formData = new FormData()
            formData.append('id', entry.id)
            formData.append('company_id', companyId)
            formData.append('bihar_ssl_amc_id', entry.bihar_ssl_amc_id || row.id)
            formData.append('district', row.district)
            formData.append('block', row.block)
            formData.append('panchayat', row.panchayat)
            formData.append('start_month_year', entry.start_month_year)
            formData.append('end_month_year', entry.end_month_year)
            formData.append('remarks', editRemarks)
            if (editAmcFile) formData.append('amc_document', editAmcFile)
            if (editInvoiceFile) formData.append('invoice_document', editInvoiceFile)

            // App Node API — AMC document update
            const res = await localApi.post(app.ssl.update('bihar'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            const updatedDoc = res?.data?.data?.document || res?.data?.data || null

            // entry lives inside amcPeriods[*].document[] - update it in place
            setAmcPeriods((prevPeriods) =>
                prevPeriods.map((period) => {
                    if (!Array.isArray(period.document)) return period
                    const hasEntry = period.document.some((d) => d.id === entry.id)
                    if (!hasEntry) return period
                    return {
                        ...period,
                        document: period.document.map((d) =>
                            d.id === entry.id ? { ...d, ...(updatedDoc || {}), remarks: editRemarks } : d
                        ),
                    }
                })
            )

            setRowSuccess(res?.data?.message || 'Document updated successfully.')
            setEditingId(null)
        } catch (err) {
            console.error('Document update failed:', err)
            setRowError(getErrorMessage(err, 'Failed to update this document. Please try again.'))
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) {
        return (
            <>
                <PageHeader />
                <div className="main-content">
                    <div className="text-center py-5 text-muted">Loading details...</div>
                </div>
            </>
        )
    }

    if (error || !row) {
        return (
            <>
                <PageHeader />
                <div className="main-content">
                    <div className="text-center py-5">
                        <p className="text-danger mb-3">{error || 'No record found.'}</p>
                        <button type="button" className="btn btn-light" onClick={() => navigate('/bihar/ssl-amc/view-document')}>
                            <FiArrowLeft size={20} className="me-1" /> Back to list
                        </button>
                    </div>
                </div>
            </>
        )
    }

    const { panchayat, district, block, created_at } = row

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="card stretch stretch-full border-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

                    {/* ---------------- Header ---------------- */}
                    <div className="card-header bg-white border-bottom-0 pb-0">
                        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 pb-3">
                            <div className="d-flex align-items-center gap-3">
                                <button type="button" className="btn btn-sm btn-light rounded" onClick={() => navigate(-1)}>
                                    <FiArrowLeft size={20} />
                                </button>
                                <div>
                                    <h5 className="mb-1 fw-bold text-dark">{panchayat}</h5>
                                    <div className="d-flex align-items-center flex-wrap gap-3 fs-12 text-muted">
                                        <span className="d-inline-flex align-items-center gap-1">
                                            <FiMapPin size={12} /> {district} / {block}
                                        </span>
                                        <span className="d-inline-flex align-items-center gap-1">
                                            <FiClock size={12} /> {formatDate(created_at)}
                                        </span>
                                        <span className="d-inline-flex align-items-center gap-1">
                                            <FiLayers size={12} /> {sortedPeriods.length} period{sortedPeriods.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-4">
                                <HeaderStat
                                    icon={<FiLayers size={16} />}
                                    label="Total Lights"
                                    value={headerAgg.total}
                                    color="#3454d1"
                                    pct={100}
                                />
                                <HeaderStat
                                    icon={<FiCheckCircle size={16} />}
                                    label="Done"
                                    value={headerAgg.completed}
                                    color="#1cbb8c"
                                    pct={headerPct}
                                />
                                <HeaderStat
                                    icon={<FiClock size={16} />}
                                    label="Pending"
                                    value={headerAgg.pending}
                                    color="#ff5c75"
                                    pct={100 - headerPct}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card-body pt-3">
                        {rowSuccess && (
                            <div className="alert alert-success d-flex align-items-center gap-2 py-2 fs-12" role="alert">
                                <FiCheckCircle size={14} /> {rowSuccess}
                            </div>
                        )}
                        {rowError && (
                            <div className="alert alert-danger mb-3 py-2 fs-12">{rowError}</div>
                        )}

                        {sortedPeriods.length === 0 ? (
                            <p className="text-muted mb-0">No AMC periods found for this panchayat.</p>
                        ) : (
                            sortedPeriods.map((period) => {
                                const docs = Array.isArray(period.document) ? period.document : []
                                const total = Number(period.total_lights) || 0
                                const completed = Number(period.completed_lights) || 0
                                const pending = Number(period.pending_lights) || 0
                                const pct = total > 0 ? (completed / total) * 100 : 0
                                const accent = getPeriodAccent(pct)
                                const periodKey = `${period.start_month_year}__${period.end_month_year}__${period.amc_no}`

                                return (
                                    <div
                                        key={periodKey}
                                        className="rounded-3 p-3 mb-3"
                                        style={{
                                            border: '1px solid #eef0f5',
                                            borderLeft: `4px solid ${accent.border}`,
                                            background: '#fff',
                                        }}
                                    >
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="fw-semibold fs-13 text-dark">
                                                    {period.period || formatPeriodRange(period.start_month_year, period.end_month_year)}
                                                </span>
                                                <span className="badge bg-soft-secondary text-secondary">AMC #{period.amc_no}</span>
                                                <span className="badge bg-soft-primary text-primary">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>

                                        {/* Progress bar for this period */}
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <div className="flex-grow-1">
                                                <ProgressBar pct={pct} color={accent.bar} />
                                            </div>
                                            <span className="fs-11 text-muted flex-shrink-0">
                                                {completed} done &middot; {pending} pending &middot; {total} total
                                            </span>
                                        </div>

                                        <div className="row g-2 mb-3">
                                            <div className="col-md-6">
                                                <SslPoleCard
                                                    title="AMC documentation done"
                                                    sslIds={period.done_ssl_id || []}
                                                    poleNos={period.done_pole_no || []}
                                                    emptyText="No lights documented for this quarter yet."
                                                    tone="success"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <SslPoleCard
                                                    title="Pending lights"
                                                    sslIds={period.pending_ssl_id || []}
                                                    poleNos={period.pending_pole_no || []}
                                                    emptyText="No pending lights for this quarter."
                                                    tone="danger"
                                                />
                                            </div>
                                        </div>

                                        {docs.length === 0 ? (
                                            <div className="border rounded-3 p-3 text-center text-muted fs-12 bg-light">
                                                No documents uploaded for this period yet.
                                            </div>
                                        ) : (
                                            docs.map((entry) => (
                                                <DocumentEntryCard
                                                    key={entry.id}
                                                    entry={entry}
                                                    isEditing={editingId === entry.id}
                                                    onStartEdit={startEdit}
                                                    onCancelEdit={cancelEdit}
                                                    onSave={saveEdit}
                                                    onAddComplaint={goToComplaint}
                                                    editRemarks={editRemarks}
                                                    setEditRemarks={setEditRemarks}
                                                    editAmcFile={editAmcFile}
                                                    setEditAmcFile={setEditAmcFile}
                                                    editInvoiceFile={editInvoiceFile}
                                                    setEditInvoiceFile={setEditInvoiceFile}
                                                    isSaving={isSaving}
                                                />
                                            ))
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default DocumentDetails