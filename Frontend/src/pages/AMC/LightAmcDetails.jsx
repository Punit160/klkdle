/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiCalendar, FiImage, FiLoader, FiMapPin, FiUser, FiZap } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { getCompanyId } from '../../utils/auth'
import localApi, { LOCAL_API_BASE } from '../../api/localApi'
import { app } from '../../api/routes'

const LOCAL_API = LOCAL_API_BASE

const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fileUrl = (path) => {
    if (!path) return ''
    if (/^https?:\/\//i.test(path)) return path
    return `${LOCAL_API}${path.startsWith('/') ? path : `/${path}`}`
}

const DetailItem = ({ label, value }) => (
    <div className="h-100 px-3 py-2 rounded-3" style={{ background: '#f7f8fb', border: '1px solid #eef0f5' }}>
        <div className="fs-11 text-muted mb-1">{label}</div>
        <div className="fs-13 fw-semibold text-dark text-break">{value || '—'}</div>
    </div>
)

const DetailGroup = ({ title, items }) => (
    <div className="border rounded-3 overflow-hidden mb-3">
        <div className="px-3 py-2 bg-light border-bottom">
            <span className="fs-12 fw-semibold text-dark">{title}</span>
        </div>
        <div className="p-2">
            <div className="row g-2">
                {items.map((item) => (
                    <div key={item.label} className="col-lg-3 col-md-6">
                        <DetailItem label={item.label} value={item.value} />
                    </div>
                ))}
            </div>
        </div>
    </div>
)

const SectionHeading = ({ icon, title, subtitle }) => (
    <div className="d-flex align-items-center gap-3 mb-3">
        <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
            {icon}
        </div>
        <div>
            <h6 className="fw-bold text-dark mb-0">{title}</h6>
            {subtitle && <p className="fs-12 text-muted mb-0">{subtitle}</p>}
        </div>
    </div>
)

const PhotoCard = ({ label, src }) => {
    if (!src) {
        return (
            <div className="border rounded-3 p-4 text-center text-muted fs-12 bg-light">
                {label}: not uploaded
            </div>
        )
    }

    return (
        <a href={src} target="_blank" rel="noreferrer" className="d-block border rounded-3 overflow-hidden text-decoration-none">
            <div className="px-3 py-2 bg-light border-bottom fs-12 text-dark fw-semibold">{label}</div>
            <img src={src} alt={label} className="w-100" style={{ maxHeight: 320, objectFit: 'cover' }} />
        </a>
    )
}

const LightAmcDetails = ({ region = 'bihar' }) => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const listPath = region === 'bihar' ? '/bihar/ssl-amc/view-light-amc' : '/uttarpradesh/ssl-amc/view-light-amc'
    const recordId = searchParams.get('id')

    const [row, setRow] = useState(location.state?.row || null)
    const [loading, setLoading] = useState(!location.state?.row)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchRow = async () => {
            if (!recordId) {
                setError('AMC record id is missing.')
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')
            try {
                const res = await localApi.get(app.lightAmc.view(recordId), {
                    params: { company_id: getCompanyId() },
                })
                const data = res?.data?.data
                if (!data) {
                    setError(res?.data?.message || 'AMC record not found.')
                    setRow(null)
                    return
                }
                setRow(data)
            } catch (err) {
                setError(err?.response?.data?.message || 'Failed to load AMC details.')
            } finally {
                setLoading(false)
            }
        }

        fetchRow()
    }, [recordId])

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <div className="card mb-0">
                    <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between gap-3 mb-4 flex-wrap">
                            <SectionHeading
                                icon={<FiZap size={16} />}
                                title="AMC Details"
                                subtitle={row?.unique_id || row?.ssl_id ? `Light ${row.unique_id || row.ssl_id}` : 'Full AMC record'}
                            />
                            <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(listPath)}>
                                <FiArrowLeft className="me-1" size={14} /> Back to AMC
                            </button>
                        </div>

                        {loading && (
                            <div className="d-flex align-items-center gap-2 text-muted py-4">
                                <FiLoader className="spin" size={16} /> Loading AMC details...
                            </div>
                        )}

                        {!loading && error && (
                            <div className="alert alert-danger d-flex align-items-center gap-2">
                                <FiAlertCircle /> {error}
                            </div>
                        )}

                        {!loading && !error && row && (
                            <>
                                <SectionHeading icon={<FiCalendar size={16} />} title="AMC Schedule" />
                                <DetailGroup
                                    title="Dates"
                                    items={[
                                        { label: 'AMC Date', value: formatDate(row.amc_date) },
                                        { label: 'Next AMC Date', value: formatDate(row.next_amc_date) },
                                        { label: 'Period Start', value: formatDate(row.period_start) },
                                        { label: 'Period End', value: formatDate(row.period_end) },
                                        { label: 'Quarter', value: `${row.quarter_no || '—'} / 20` },
                                        { label: 'Created On', value: formatDate(row.created_at) },
                                    ]}
                                />

                                <SectionHeading icon={<FiMapPin size={16} />} title="Location" />
                                <DetailGroup
                                    title="Site location"
                                    items={[
                                        { label: 'State', value: row.state },
                                        { label: 'Volume', value: row.volume },
                                        { label: 'District', value: row.district },
                                        { label: 'Block', value: row.block },
                                        { label: 'Panchayat', value: row.panchayat },
                                        { label: 'Ward No', value: row.ward_no },
                                        { label: 'AMC Latitude', value: row.latitude },
                                        { label: 'AMC Longitude', value: row.longitude },
                                    ]}
                                />

                                <SectionHeading icon={<FiZap size={16} />} title="Light" />
                                <DetailGroup
                                    title="Light details"
                                    items={[
                                        { label: 'Unique ID', value: row.unique_id },
                                        { label: 'Pole No', value: row.pole_no },
                                        { label: 'SSL ID', value: row.ssl_id },
                                    ]}
                                />

                                <SectionHeading icon={<FiUser size={16} />} title="Beneficiary" />
                                <DetailGroup
                                    title="Beneficiary details"
                                    items={[
                                        { label: 'Name', value: row.beneficiary_name },
                                        { label: 'Contact Number', value: row.beneficiary_contact },
                                    ]}
                                />

                                <SectionHeading icon={<FiAlertCircle size={16} />} title="Light Status" />
                                <DetailGroup
                                    title="Working status"
                                    items={[
                                        { label: 'Light Working', value: row.light_working === 'Yes' ? 'Working' : 'Not working' },
                                        { label: 'Complaint Raised', value: Number(row.complaint_raised) === 1 ? 'Yes' : 'No' },
                                        { label: 'Complaint Ref', value: row.complaint_ref },
                                        { label: 'Remarks', value: row.remarks },
                                    ]}
                                />

                                <SectionHeading icon={<FiImage size={16} />} title="AMC Photos" subtitle="Click a photo to open it" />
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <PhotoCard label="Photo 1" src={fileUrl(row.image_1)} />
                                    </div>
                                    <div className="col-md-6">
                                        <PhotoCard label="Photo 2" src={fileUrl(row.image_2)} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export default LightAmcDetails
