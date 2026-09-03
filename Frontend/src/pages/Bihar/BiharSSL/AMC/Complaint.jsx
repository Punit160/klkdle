/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    FiUploadCloud,
    FiMapPin,
    FiCalendar,
    FiPaperclip,
    FiCheckCircle,
    FiLoader,
    FiAlertCircle,
    FiSend,
    FiZap,
} from 'react-icons/fi'
import SelectDropdown from '@/components/shared/SelectDropdown'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import axiosInstance from '../../../../api/axiosInstance'
import { getCompanyId, getUser } from '../../../../utils/auth'

const toOptions = (arr) => arr.map((item) => ({ value: item, label: item }))

const COMPLAINT_SOURCE_OPTIONS = toOptions(['Phone Call', 'Email', 'Portal', 'Walk-in', 'Field Visit'])
const COMPLAINT_ISSUE_OPTIONS = toOptions([
    'Light Not Working',
    'Pole Damaged',
    'Battery Fault',
    'SIM / Connectivity Issue',
    'Module Fault',
    'Other',
])

const getErrorMessage = (err, fallback = "Something went wrong. Please try again.") => {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    if (Array.isArray(data?.errors) && data.errors.length) {
        const first = data.errors[0]
        if (typeof first === 'string') return first
    }
    if (data?.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0]
        const firstVal = data.errors[firstKey]
        if (Array.isArray(firstVal) && firstVal.length) return firstVal[0]
        if (typeof firstVal === 'string') return firstVal
    }
    if (err?.message === 'Network Error') return "Network error. Please check your internet connection."
    if (err?.code === 'ECONNABORTED') return "Request timed out. Please try again."
    return fallback
}

const SectionHeading = ({ icon, title, subtitle }) => (
    <div className="d-flex align-items-center gap-3 mb-4">
        <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
            {icon}
        </div>
        <div>
            <h6 className="fw-bold text-dark mb-0">{title}</h6>
            {subtitle && <p className="fs-12 text-muted mb-0">{subtitle}</p>}
        </div>
    </div>
)

const Dropzone = ({ multiple = false, accept, onFiles, label, hint }) => {
    const [isDragging, setIsDragging] = useState(false)
    const inputId = 'complaint-file-input'

    const handleFiles = (fileList) => {
        const files = Array.from(fileList || [])
        if (files.length) onFiles(files)
    }

    return (
        <label
            htmlFor={inputId}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFiles(e.dataTransfer.files)
            }}
            className="d-flex flex-column align-items-center justify-content-center text-center rounded-3 p-3 mb-0"
            style={{
                border: `2px dashed ${isDragging ? 'var(--bs-primary, #3454d1)' : '#d7dbe4'}`,
                background: isDragging ? 'rgba(52,84,209,0.05)' : '#fafbfc',
                cursor: 'pointer',
                transition: 'all .15s ease-in-out',
                minHeight: '110px',
            }}
        >
            <input
                id={inputId}
                type="file"
                className="d-none"
                multiple={multiple}
                accept={accept}
                onChange={(e) => { handleFiles(e.target.files); e.target.value = "" }}
            />
            <div className="avatar-text avatar-md bg-soft-primary text-primary icon mb-2">
                <FiUploadCloud size={16} />
            </div>
            <div className="fs-12 fw-semibold text-dark mb-1">{label}</div>
            <div className="fs-11 text-muted">{hint}</div>
        </label>
    )
}

const FileBadge = ({ file, onRemove }) => (
    <span className="badge bg-soft-success text-success d-inline-flex align-items-center gap-2 py-2 px-3 rounded-pill fw-normal">
        <FiCheckCircle size={12} />
        <span className="fs-12 text-truncate" style={{ maxWidth: '160px' }} title={file.name}>
            {file.name}
        </span>
        <span className="fs-11 opacity-75">{(file.size / 1024).toFixed(0)}KB</span>
        <button
            type="button"
            onClick={onRemove}
            className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center text-success"
            style={{ lineHeight: 0 }}
        >
            &times;
        </button>
    </span>
)

const poleSelectLabel = (site) => {
    const poleNo = site?.pole_no ? String(site.pole_no).trim() : ''
    const uniqueId = site?.unique_id ? String(site.unique_id).trim() : ''

    if (uniqueId && poleNo) return `${uniqueId} (${poleNo})`
    if (uniqueId) return uniqueId
    if (poleNo) return poleNo
    return site?.ssl_id ? `SSL ID ${site.ssl_id}` : ''
}

const toPoleOption = (site) => ({
    value: site.ssl_id,
    label: poleSelectLabel(site),
    pole_no: site.pole_no || '',
    unique_id: site.unique_id || '',
})

const displayValue = (value) => {
    if (value == null || String(value).trim() === '') return '—'
    return value
}

const DetailItem = ({ label, value }) => (
    <div
        className="h-100 px-3 py-2 rounded-3"
        style={{ background: '#f7f8fb', border: '1px solid #eef0f5' }}
    >
        <div className="fs-11 text-muted mb-1">{label}</div>
        <div className="fs-13 fw-semibold text-dark text-break">{displayValue(value)}</div>
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

const todayISO = () => new Date().toISOString().slice(0, 10)

const formatMaybeDate = (value) => {
    if (!value) return value
    const date = new Date(value)
    if (isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const Complaint = ({ isModal = false, onSuccess = null, onCancel = null }) => {
    const navigate = useNavigate()
    const location = useLocation()

    // Sites passed in from the AMC Document Details page: [{ ssl_id, pole_no, unique_id }]
    const incomingSites = Array.isArray(location.state?.sites) ? location.state.sites : []
    const [poleOptions, setPoleOptions] = useState(() => incomingSites.map(toPoleOption))

    // ---- Pole No (value = ssl_id) selection ----
    const [selectedPole, setSelectedPole] = useState(null)
    const [isDetailsLoading, setIsDetailsLoading] = useState(false)
    const [detailsError, setDetailsError] = useState("")
    const [siteDetails, setSiteDetails] = useState(null)

    // ---- Complaint meta (user entered) ----
    const [complaintDate, setComplaintDate] = useState(todayISO())
    const [complaintSource, setComplaintSource] = useState(null)
    const [complaintIssue, setComplaintIssue] = useState(null)
    const [complaintText, setComplaintText] = useState("")
    const [sendSms, setSendSms] = useState('Yes')

    // ---- Upload ----
    const [attachments, setAttachments] = useState([])
    const addAttachments = (files) => setAttachments((prev) => [...prev, ...files])
    const removeAttachment = (index) => setAttachments((prev) => prev.filter((_, i) => i !== index))

    // ---- Submit / Cancel ----
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")

    // Enrich Pole No options with unique_id from klkerp site details (one list call).
    useEffect(() => {
        if (!incomingSites.length) return

        const district = location.state?.district
        const block = location.state?.block
        const panchayat = location.state?.panchayat
        const volume = Array.isArray(location.state?.volume)
            ? location.state.volume[0]
            : (location.state?.volume || location.state?.state)

        if (!district || !block || !panchayat || !volume) return

        let cancelled = false

        const enrichPoleOptions = async () => {
            try {
                const res = await axiosInstance.get('/dle/bihar/ssl-amc/details', {
                    params: { district, block, panchayat, volume },
                })
                const list = Array.isArray(res?.data?.data) ? res.data.data : []
                if (cancelled || !list.length) return

                const bySslId = new Map(
                    list.map((item) => [String(item.id ?? item.ssl_id ?? ''), item])
                )

                setPoleOptions(
                    incomingSites.map((site) => {
                        const match = bySslId.get(String(site.ssl_id)) || {}
                        return toPoleOption({
                            ssl_id: site.ssl_id,
                            pole_no: match.pole_no || site.pole_no || '',
                            unique_id: match.unique_id || match.uniqueId || site.unique_id || '',
                        })
                    })
                )
            } catch (err) {
                console.error('Failed to load unique IDs for pole options:', err)
            }
        }

        enrichPoleOptions()
        return () => { cancelled = true }
    }, [location.state])

    // ---- Fetch full site details as soon as a Pole No (ssl_id) is picked ----
    useEffect(() => {
        if (!selectedPole) {
            setSiteDetails(null)
            setDetailsError("")
            return
        }

        const fetchSiteDetails = async () => {
            setIsDetailsLoading(true)
            setDetailsError("")
            try {
                const res = await axiosInstance.get('/dle/bihar/ssl-amc/complaint/details', {
                    params: { ssl_id: selectedPole.value },
                })
                const data = res?.data?.data || res?.data || null
                setSiteDetails(data)

                const uniqueId = data?.unique_id || data?.uniqueId
                const poleNo = data?.pole_no || selectedPole.pole_no
                if (uniqueId || poleNo) {
                    const next = toPoleOption({
                        ssl_id: selectedPole.value,
                        pole_no: poleNo,
                        unique_id: uniqueId || selectedPole.unique_id,
                    })
                    setPoleOptions((prev) =>
                        prev.map((opt) => (String(opt.value) === String(next.value) ? next : opt))
                    )
                    setSelectedPole((prev) =>
                        prev && String(prev.value) === String(next.value) ? { ...prev, ...next } : prev
                    )
                }
            } catch (err) {
                console.error('Failed to fetch site details:', err)
                setSiteDetails(null)
                setDetailsError(getErrorMessage(err, "Failed to load site details for this pole. Please try again."))
            } finally {
                setIsDetailsLoading(false)
            }
        }
        fetchSiteDetails()
    }, [selectedPole?.value])

    const handleSubmit = async (e) => {
        e.preventDefault()

        setSubmitError("")
        setSubmitSuccess(false)
        setSuccessMessage("")

        const companyId = getCompanyId()
        const user = getUser()
        const userId = user?.id

        if (!companyId) {
            setSubmitError("Company information missing. Please login again.")
            return
        }

        if (!userId) {
            setSubmitError("User information missing. Please login again.")
            return
        }

        if (
            !selectedPole ||
            !siteDetails ||
            !complaintDate ||
            !complaintSource ||
            !complaintIssue ||
            !complaintText
        ) {
            setSubmitError("Please select a Pole No and fill all required fields before submitting.")
            return
        }

        const formData = new FormData()

        attachments.forEach((file) => {
            formData.append("complaint_document", file)
        })

        // Site identifiers
        formData.append("ssl_id", selectedPole.value)

        // Auto-fetched site & device details (from /complaint/details)
        formData.append("district", siteDetails.district || "")
        formData.append("block", siteDetails.block || "")
        formData.append("panchyat", siteDetails.panchyat || "")
        formData.append("ward_no", siteDetails.ward_no || "")
        formData.append("pole_no", siteDetails.pole_no || selectedPole.pole_no || "")
        formData.append("light_no", siteDetails.light_no || "")
        formData.append("beneficiary_name", siteDetails.beneficiary_name || "")
        formData.append("contact_no", siteDetails.contact_no || "")
        formData.append("latitude", siteDetails.latitude || "")
        formData.append("longitude", siteDetails.longitude || "")
        formData.append("along_with_pole", siteDetails.along_with_pole || "")
        formData.append("luminary_no", siteDetails.luminary_no || "")
        formData.append("sim_no", siteDetails.sim_no || "")
        formData.append("battery_serial_no", siteDetails.battery_serial_no || "")
        formData.append("module_no", siteDetails.module_no || "")
        formData.append("date_of_installation", siteDetails.date_of_installation || "")

        // Complaint fields entered by the user
        formData.append("complaint_date", complaintDate)
        formData.append("complaint_source", complaintSource.value)
        formData.append("complaint_issue", complaintIssue.value)
        formData.append("complaint", complaintText)
        formData.append("send_sms", sendSms)
        formData.append("user_id", userId)

        setIsSubmitting(true)

        try {
            const res = await axiosInstance.post(
                '/dle/bihar/ssl-amc/complaint/store',
                formData,
                {
                    params: { company_id: companyId },
                    headers: { 'Content-Type': 'multipart/form-data' },
                }
            )

            const responseData = res?.data?.data || null
            const responseMessage = res?.data?.message || "Complaint registered successfully."

            setSubmitSuccess(true)
            setSuccessMessage(responseMessage)

            if (isModal && onSuccess) {
                setTimeout(() => onSuccess(responseData), 900)
            } else {
                setTimeout(() => navigate("/bihar/ssl-amc/view-complaint"), 1200)
            }
        } catch (err) {
            console.error("Complaint submit failed:", err)
            setSubmitError(
                getErrorMessage(err, "Something went wrong while submitting the complaint. Please try again.")
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        setSelectedPole(null)
        setSiteDetails(null)
        setDetailsError("")
        setComplaintDate(todayISO())
        setComplaintSource(null)
        setComplaintIssue(null)
        setComplaintText("")
        setSendSms('Yes')
        setAttachments([])
        setSubmitError("")
        setSubmitSuccess(false)
        setSuccessMessage("")
        if (isModal && onCancel) onCancel()
    }

    const formBody = (
        <div className="card mb-0">
            <div className="card-body">

                {submitSuccess && (
                    <div className="alert alert-success d-flex align-items-center gap-2" role="alert">
                        <FiCheckCircle /> {successMessage}
                    </div>
                )}
                {submitError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                        <FiAlertCircle /> {submitError}
                    </div>
                )}

                {/* ---------------- Site Selection ---------------- */}
                <SectionHeading
                    icon={<FiMapPin size={16} />}
                    title="Site Selection"
                    subtitle="Pick the Pole No to fetch its site details automatically"
                />
                <div className="row mb-2">
                    <div className="col-lg-4 col-md-6">
                        <label className="form-label">Pole No <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={poleOptions}
                            defaultSelect={
                                poleOptions.length === 0
                                    ? "No sites available"
                                    : isDetailsLoading
                                        ? "Loading details..."
                                        : "Select Pole No"
                            }
                            selectedOption={selectedPole}
                            onSelectOption={setSelectedPole}
                        />
                        {poleOptions.length === 0 && (
                            <div className="fs-11 text-muted mt-1">
                                Open this form from a site&apos;s &quot;Add Complaint&quot; button to load its Pole No list.
                            </div>
                        )}
                    </div>
                </div>

                {isDetailsLoading && (
                    <div className="d-flex align-items-center gap-2 text-muted fs-13 mb-2">
                        <FiLoader className="spin" size={14} />
                        Fetching site details...
                    </div>
                )}
                {!isDetailsLoading && detailsError && (
                    <div className="alert alert-warning fs-13 py-2 mb-2">{detailsError}</div>
                )}

                {!isDetailsLoading && !detailsError && siteDetails && (
                    <>
                        <hr className="border-dashed" />

                        <SectionHeading
                            icon={<FiZap size={16} />}
                            title="Site & Device Details"
                            subtitle="Auto-fetched for the selected pole — read only"
                        />
                        <DetailGroup
                            title="Location"
                            items={[
                                { label: 'District', value: siteDetails.district },
                                { label: 'Block', value: siteDetails.block },
                                { label: 'Panchayat', value: siteDetails.panchyat },
                                { label: 'Ward No', value: siteDetails.ward_no },
                            ]}
                        />
                        <DetailGroup
                            title="Beneficiary"
                            items={[
                                { label: 'Beneficiary Name', value: siteDetails.beneficiary_name },
                                { label: 'Contact No.', value: siteDetails.contact_no },
                                { label: 'Latitude', value: siteDetails.latitude },
                                { label: 'Longitude', value: siteDetails.longitude },
                            ]}
                        />
                        <DetailGroup
                            title="Device"
                            items={[
                                { label: 'Light No', value: siteDetails.light_no },
                                { label: 'Along With Pole', value: siteDetails.along_with_pole },
                                { label: 'Luminary No.', value: siteDetails.luminary_no },
                                { label: 'SIM No.', value: siteDetails.sim_no },
                                { label: 'Battery Serial No.', value: siteDetails.battery_serial_no },
                                { label: 'Module No.', value: siteDetails.module_no },
                                { label: 'Date of Installation', value: formatMaybeDate(siteDetails.date_of_installation) },
                            ]}
                        />
                    </>
                )}

                <hr className="border-dashed" />

                {/* ---------------- Complaint Details ---------------- */}
                <SectionHeading
                    icon={<FiCalendar size={16} />}
                    title="Complaint Details"
                    subtitle="Date, source, issue type and complaint description"
                />
                <div className="row g-3">
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Complaint Date <span className="text-danger">*</span></label>
                        <input
                            type="date"
                            className="form-control"
                            value={complaintDate}
                            onChange={(e) => setComplaintDate(e.target.value)}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Complaint Source <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={COMPLAINT_SOURCE_OPTIONS}
                            defaultSelect="Select"
                            selectedOption={complaintSource}
                            onSelectOption={setComplaintSource}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Complaint Issue <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={COMPLAINT_ISSUE_OPTIONS}
                            defaultSelect="Select"
                            selectedOption={complaintIssue}
                            onSelectOption={setComplaintIssue}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label d-block">Send SMS</label>
                        <div className="d-flex align-items-center gap-4 pt-2">
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="sendSms"
                                    id="sendSmsYes"
                                    checked={sendSms === 'Yes'}
                                    onChange={() => setSendSms('Yes')}
                                />
                                <label className="form-check-label" htmlFor="sendSmsYes">Yes</label>
                            </div>
                            <div className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="sendSms"
                                    id="sendSmsNo"
                                    checked={sendSms === 'No'}
                                    onChange={() => setSendSms('No')}
                                />
                                <label className="form-check-label" htmlFor="sendSmsNo">No</label>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-12">
                        <label className="form-label">Complaint <span className="text-danger">*</span></label>
                        <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Describe the complaint"
                            value={complaintText}
                            onChange={(e) => setComplaintText(e.target.value)}
                        />
                    </div>
                </div>

                <hr className="border-dashed" />

                {/* ---------------- Upload ---------------- */}
                <SectionHeading
                    icon={<FiPaperclip />}
                    title="Upload Document"
                    subtitle="Attach photo or supporting document for this complaint (optional)"
                />
                <div className="row mb-2">
                    <div className="col-lg-6">
                        <Dropzone
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onFiles={addAttachments}
                            label="Click to upload or drag & drop"
                            hint="PDF, JPG or PNG — multiple files allowed"
                        />
                        {attachments.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                {attachments.map((file, index) => (
                                    <FileBadge
                                        key={`${file.name}-${index}`}
                                        file={file}
                                        onRemove={() => removeAttachment(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ---------------- Submit / Cancel ---------------- */}
                <div className="d-flex justify-content-end gap-2 mb-0 pt-4 border-top">
                    <button type="button" className="btn btn-light mt-4" onClick={handleCancel} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                        {isSubmitting ? <FiLoader className="spin" size={14} /> : <FiSend size={14} />}
                        {isSubmitting ? "Submitting..." : "Submit Complaint"}
                    </button>
                </div>

            </div>
        </div>
    )

    if (isModal) {
        return <form onSubmit={handleSubmit}>{formBody}</form>
    }

    return (
        <>
            <PageHeader />
            <div className="main-content">
                <form onSubmit={handleSubmit}>{formBody}</form>
            </div>
        </>
    )
}

export default Complaint