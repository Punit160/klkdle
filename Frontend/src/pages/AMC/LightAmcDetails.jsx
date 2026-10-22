 
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiCalendar, FiEdit2, FiHelpCircle, FiImage, FiLoader, FiMapPin, FiTool, FiUser, FiZap } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import { getCompanyId } from '../../utils/auth'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getSslAmcConfig } from '../../utils/sslAmcConfig'
import { resolveUploadUrl } from '../../utils/uploadUrl'
import { userIsAdmin } from '../../utils/userRoles'

const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fileUrl = (path) => resolveUploadUrl(path)

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

const parseVisitAnswers = (value) => {
    if (!value) return null
    if (typeof value === 'object') return value
    try {
        const parsed = JSON.parse(value)
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

const QuestionAnswer = ({ number, en, hi, value }) => (
    <div className="col-lg-6 col-12">
        <div className="border rounded-3 p-3 h-100 bg-white">
            <div className="fs-13 fw-semibold text-dark">{number}. {en}</div>
            <div className="fs-12 text-muted mt-1">{hi}</div>
            <div className="fs-13 fw-semibold text-primary mt-2">{value || '—'}</div>
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
    const amcConfig = getSslAmcConfig(region)
    const stateName = amcConfig.stateName
    const listPath = amcConfig.pages.lightAmcList
    const formPath = amcConfig.pages.lightAmc
    const recordId = searchParams.get('id')

    const [row, setRow] = useState(location.state?.row || null)
    const [loading, setLoading] = useState(!location.state?.row)
    const [error, setError] = useState('')
    const isAdmin = userIsAdmin()
    const upStyle = region === 'up' || region === 'kusumc' || region === 'powerpack' || region === 'offgrid' || region === 'ongrid'

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
                    params: { company_id: getCompanyId(), state: stateName, region },
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
    }, [recordId, stateName, region])

    const answers = parseVisitAnswers(row?.visit_answers)
    const lightIsFunctional = answers?.plant_status === 'Functional'

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
                            <div className="d-flex gap-2">
                                {isAdmin && row && (
                                    <button type="button" className="btn btn-sm btn-primary" onClick={() => navigate(`${formPath}?id=${recordId}`)}>
                                        <FiEdit2 className="me-1" size={14} /> Edit
                                    </button>
                                )}
                                <button type="button" className="btn btn-sm btn-light" onClick={() => navigate(listPath)}>
                                    <FiArrowLeft className="me-1" size={14} /> Back to AMC
                                </button>
                            </div>
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
                                        ...(upStyle
                                            ? [{ label: 'Visit Time', value: row.amc_time }]
                                            : []),
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
                                        ...(amcConfig.requiresVolume
                                            ? [{ label: 'Volume', value: row.volume }]
                                            : []),
                                        { label: 'District', value: row.district },
                                        { label: 'Block', value: row.block },
                                        {
                                            label: amcConfig.location.localityLabel,
                                            value: row.panchayat || row.village,
                                        },
                                        ...(region === 'kusumc' || region === 'powerpack' || region === 'offgrid' || region === 'ongrid'
                                            ? []
                                            : [{ label: 'Ward No', value: row.ward_no }]),
                                        { label: 'AMC Latitude', value: row.latitude },
                                        { label: 'AMC Longitude', value: row.longitude },
                                    ]}
                                />

                                <SectionHeading icon={<FiZap size={16} />} title={region === 'offgrid' ? 'Off grid' : region === 'ongrid' ? 'On grid' : region === 'powerpack' ? 'Power pack' : region === 'kusumc' ? 'Pump' : 'Light'} />
                                <DetailGroup
                                    title={region === 'offgrid' ? 'Off grid details' : region === 'ongrid' ? 'On grid details' : region === 'powerpack' ? 'Power pack details' : region === 'kusumc' ? 'Pump details' : 'Light details'}
                                    items={region === 'offgrid' || region === 'ongrid'
                                        ? [
                                            { label: region === 'offgrid' ? 'Off grid ID' : 'On grid ID', value: row.offgrid_id || row.ongrid_id || row.ssl_id },
                                            { label: 'Installed place', value: row.installed_place },
                                            { label: 'Scheme name', value: row.scheme_name },
                                            { label: 'Order no', value: row.order_no },
                                            { label: 'Work order no', value: row.work_order_no },
                                            { label: 'Capacity', value: row.capacity },
                                            { label: 'UID', value: row.uid },
                                            { label: 'UID date', value: row.uid_date },
                                            { label: 'Financial Year', value: row.fy_year },
                                        ]
                                        : region === 'powerpack'
                                        ? [
                                            { label: 'Power pack ID', value: row.powerpack_id || row.ssl_id },
                                            { label: 'Scheme name', value: row.scheme_name },
                                            { label: 'Order no', value: row.order_no },
                                            { label: 'Work order no', value: row.work_order_no },
                                            { label: 'Capacity', value: row.capacity },
                                            { label: 'UID', value: row.uid },
                                            { label: 'UID date', value: row.uid_date },
                                            { label: 'Financial Year', value: row.fy_year },
                                        ]
                                        : region === 'kusumc'
                                        ? [
                                            { label: 'Pump ID', value: row.pump_id || row.ssl_id },
                                            { label: 'Work order no', value: row.work_order_no },
                                            { label: 'Capacity', value: row.capacity },
                                            { label: 'UID', value: row.uid },
                                            { label: 'Financial Year', value: row.fy_year },
                                        ]
                                        : [
                                            { label: 'Unique ID', value: row.unique_id },
                                            { label: 'Pole No', value: row.pole_no },
                                            { label: 'SSL ID', value: row.ssl_id },
                                            ...(region === 'up'
                                                ? [
                                                    { label: 'UID', value: row.uid },
                                                    { label: 'Financial Year', value: row.fy_year },
                                                ]
                                                : []),
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

                                {upStyle ? (
                                    <>
                                        <SectionHeading
                                            icon={<FiHelpCircle size={16} />}
                                            title="Questions to Ask Beneficiary"
                                            subtitle="लाभार्थी से पूछे जाने वाले प्रश्न"
                                        />
                                        <div className="row g-3 mb-4">
                                            <QuestionAnswer
                                                number="1"
                                                en="Is the light currently Functional / Non-Functional / Stolen / Missing from designated place?"
                                                hi="क्या लाइट वर्तमान में कार्यरत / अकार्यरत / चोरी हो गई / निर्धारित स्थान से गायब है?"
                                                value={answers?.plant_status}
                                            />
                                            {lightIsFunctional ? (
                                                <>
                                                    <QuestionAnswer
                                                        number="2"
                                                        en="How long has the light been operating satisfactorily and continuously?"
                                                        hi="लाइट कितने समय से संतोषजनक और निरंतर चल रही है?"
                                                        value={[answers?.functional_duration_value, answers?.functional_duration_unit].filter(Boolean).join(' ')}
                                                    />
                                                    <QuestionAnswer
                                                        number="3"
                                                        en="How many hours of backup are being obtained from the light?"
                                                        hi="लाइट से प्रतिदिन कितने घंटे का बैकअप मिल रहा है?"
                                                        value={answers?.backup_hours_per_day}
                                                    />
                                                    <QuestionAnswer
                                                        number="4"
                                                        en="How many times has the light become non-functional after installation?"
                                                        hi="स्थापना के बाद लाइट कितनी बार अकार्यरत हुई?"
                                                        value={answers?.breakdown_count}
                                                    />
                                                    <QuestionAnswer
                                                        number="4.1"
                                                        en="Was petroleum jelly applied to the battery terminals?"
                                                        hi="क्या बैटरी टर्मिनल पर पेट्रोलियम जेली लगाई गई?"
                                                        value={answers?.battery_petroleum_jelly_applied}
                                                    />
                                                    <QuestionAnswer
                                                        number="5"
                                                        en="When was the light previously repaired?"
                                                        hi="लाइट की पिछली मरम्मत कब हुई थी?"
                                                        value={answers?.last_repair_date ? formatDate(answers.last_repair_date) : ''}
                                                    />
                                                </>
                                            ) : null}
                                        </div>
                                        {lightIsFunctional ? (
                                            <>
                                                <SectionHeading
                                                    icon={<FiTool size={16} />}
                                                    title="Service Details Performed by Firm Representative"
                                                    subtitle="फर्म प्रतिनिधि द्वारा किया गया सर्विस विवरण"
                                                />
                                                <div className="row g-3 mb-4">
                                                    <QuestionAnswer
                                                        number="1"
                                                        en="Was cleaning of the solar panel(s) carried out?"
                                                        hi="क्या सोलर पैनल की सफाई की गई?"
                                                        value={answers?.panel_cleaning_done}
                                                    />
                                                    <QuestionAnswer
                                                        number="2"
                                                        en="Battery bank condition"
                                                        hi="बैटरी बैंक की स्थिति"
                                                        value={answers?.battery_bank_condition}
                                                    />
                                                    <QuestionAnswer
                                                        number="3"
                                                        en="Were the battery terminals cleaned?"
                                                        hi="क्या बैटरी टर्मिनल साफ किए गए?"
                                                        value={answers?.battery_terminal_cleaned}
                                                    />
                                                    <QuestionAnswer
                                                        number="4"
                                                        en="Were all luminaires cleaned and wires properly arranged?"
                                                        hi="क्या सभी ल्यूमिनेयर साफ किए गए और तार ठीक से व्यवस्थित किए गए?"
                                                        value={answers?.luminaires_cleaned_wiring}
                                                    />
                                                    <QuestionAnswer
                                                        number="5"
                                                        en="Was the light wiring checked and loose/exposed wires properly fixed?"
                                                        hi="क्या लाइट की वायरिंग जाँची गई और ढीले / खुले तार ठीक किए गए?"
                                                        value={answers?.wiring_checked_loose_wires}
                                                    />
                                                </div>
                                            </>
                                        ) : null}
                                    </>
                                ) : null}

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
                                    {upStyle ? (
                                        <div className="col-md-4">
                                            <PhotoCard label="Visit slip" src={fileUrl(row.image_3)} />
                                        </div>
                                    ) : null}
                                    <div className={upStyle ? 'col-md-4' : 'col-md-6'}>
                                        <PhotoCard label={upStyle ? 'Light Photo 1' : 'Photo 1'} src={fileUrl(row.image_1)} />
                                    </div>
                                    <div className={upStyle ? 'col-md-4' : 'col-md-6'}>
                                        <PhotoCard label={upStyle ? 'Light Photo 2' : 'Photo 2'} src={fileUrl(row.image_2)} />
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
