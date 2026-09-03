/* eslint-disable react/prop-types */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiX, FiUploadCloud, FiMapPin, FiCalendar, FiPaperclip, FiCheckCircle, FiLoader, FiList } from 'react-icons/fi'
import SelectDropdown from '@/components/shared/SelectDropdown'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import externalApi from '../../../../api/externalApi'
import localApi from '../../../../api/localApi'
import { app, external, pages } from '../../../../api/routes'
import { getCompanyId, getUser } from '../../../../utils/auth'

const addMonthsToInput = (monthValue, monthsToAdd) => {
    if (!monthValue) return ''
    const [year, month] = monthValue.split('-').map(Number)
    if (!year || !month) return ''
    const date = new Date(year, month - 1 + monthsToAdd, 1)
    const nextYear = date.getFullYear()
    const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
    return `${nextYear}-${nextMonth}`
}

const toOptions = (arr) =>
    (arr || [])
        .filter((item) => item !== null && item !== undefined && item !== '')
        .map((item) => ({ value: item, label: item }))
        
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
    const inputRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleFiles = (fileList) => {
        const files = Array.from(fileList || [])
        if (files.length) onFiles(files)
    }

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                handleFiles(e.dataTransfer.files)
            }}
            className="d-flex flex-column align-items-center justify-content-center text-center rounded-3 p-3"
            style={{
                border: `2px dashed ${isDragging ? 'var(--bs-primary, #3454d1)' : '#d7dbe4'}`,
                background: isDragging ? 'rgba(52,84,209,0.05)' : '#fafbfc',
                cursor: 'pointer',
                transition: 'all .15s ease-in-out',
                minHeight: '110px',
            }}
        >
            <input
                ref={inputRef}
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
        </div>
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
            <FiX size={13} />
        </button>
    </span>
)

// ---- Badge that shows a single site returned by /bihar/ssl-amc/details ----
const formatAmcDate = (value) => {
    if (!value) return '—'
    if (/^\d{4}-\d{2}$/.test(value)) {
        const [year, month] = value.split('-')
        return new Date(Number(year), Number(month) - 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' })
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SiteBadge = ({ site, onRemove }) => {
    const status = (site.site_status || "").toLowerCase()
    const statusClass =
        status === 'completed'
            ? 'bg-soft-success text-success'
            : status === 'pending'
                ? 'bg-soft-warning text-warning'
                : status === 'rejected'
                    ? 'bg-soft-danger text-danger'
                    : 'bg-soft-secondary text-secondary'

    return (
        <div className="position-relative bg-white border rounded-3 px-3 py-2" style={{ minWidth: '150px' }}>
            <button
                type="button"
                onClick={onRemove}
                title="Remove"
                className="d-flex align-items-center justify-content-center position-absolute bg-white text-danger border p-0"
                style={{
                    top: '-9px',
                    right: '-9px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    lineHeight: 0,
                }}
            >
                <FiX size={12} />
            </button>
            <div className="fs-11 text-muted mb-1">ID: {site.unique_id}</div>
            <div className="d-flex align-items-center justify-content-between gap-2">
                <span className="fs-12 fw-semibold text-dark">Pole {site.pole_no}</span>
                <span className={`badge ${statusClass} rounded-pill fs-10 text-capitalize`}>
                    {site.site_status}
                </span>
            </div>
        </div>
    )
}

const DoneSiteCard = ({ site }) => (
    <div
        className="rounded-3 px-3 py-2"
        style={{ minWidth: '150px', background: 'rgba(28,187,140,0.08)', border: '1px solid rgba(28,187,140,0.35)' }}
    >
        <div className="fs-11 text-muted mb-1">ID: {site.unique_id || site.id}</div>
        <div className="fs-12 fw-semibold text-dark mb-1">Pole {site.pole_no || '—'}</div>
        <span className="badge bg-soft-success text-success rounded-pill fs-10">AMC done</span>
        <div className="fs-11 text-success mt-1">{formatAmcDate(site.amcDate)}</div>
    </div>
)

const UploadForm = ({ isModal = false, onSuccess = null, onCancel = null }) => {
    const navigate = useNavigate()

    const [selectedVolume, setSelectedVolume] = useState(null)
    const [volumeOptions, setVolumeOptions] = useState([])
    const [isVolumeLoading, setIsVolumeLoading] = useState(false)

    const [selectedDistrict, setSelectedDistrict] = useState(null)
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [selectedPanchayat, setSelectedPanchayat] = useState(null)

    const [districtOptions, setDistrictOptions] = useState([])
    const [blockOptions, setBlockOptions] = useState([])
    const [panchayatOptions, setPanchayatOptions] = useState([])

    const [isDistrictLoading, setIsDistrictLoading] = useState(false)
    const [isBlockLoading, setIsBlockLoading] = useState(false)
    const [isPanchayatLoading, setIsPanchayatLoading] = useState(false)

    // ---- AMC Period (start / end month-year range) ----
    const [startMonth, setStartMonth] = useState("")
    const [endMonth, setEndMonth] = useState("")

    // ---- Site details (fetched from /bihar/ssl-amc/details) ----
    const [siteDetails, setSiteDetails] = useState([])
    const [selectedSiteIds, setSelectedSiteIds] = useState([])
    const [siteSummary, setSiteSummary] = useState(null)
    const [isSitesLoading, setIsSitesLoading] = useState(false)
    const [sitesError, setSitesError] = useState("")
    const [quarterNote, setQuarterNote] = useState("")

    // ---- Document upload ----
    const [documents, setDocuments] = useState([])
    const addDocuments = (files) => setDocuments((prev) => [...prev, ...files])
    const removeDocument = (index) => setDocuments((prev) => prev.filter((_, i) => i !== index))

    // ---- Invoice upload ----
    const [invoice, setInvoice] = useState(null)
    const addInvoice = (files) => setInvoice(files[0])
    const removeInvoice = () => setInvoice(null)

    const [remarks, setRemarks] = useState('')

    // ---- Submit / Cancel ----
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState("")

    // ---- Fetch volumes on mount (drives the header select box) ----
    useEffect(() => {
        const fetchVolumes = async () => {
            setIsVolumeLoading(true)
            try {
                const res = await externalApi.get(external.ssl.volume('bihar'))
                const list = res?.data?.data || []
                setVolumeOptions(toOptions(list.map((item) => item.volume)))
            } catch (err) {
                console.error('Failed to fetch volumes:', err)
                setVolumeOptions([])
            } finally {
                setIsVolumeLoading(false)
            }
        }
        fetchVolumes()
    }, [])

    // ---- Fetch districts whenever volume changes ----
    useEffect(() => {
        if (!selectedVolume) {
            setDistrictOptions([])
            return
        }
        const fetchDistricts = async () => {
            setIsDistrictLoading(true)
            try {
                const res = await externalApi.get(external.ssl.district('bihar'), {
                    params: { volume: selectedVolume.value },
                })
                const list = res?.data?.data || []
                setDistrictOptions(toOptions(list.map((item) => item.district)))
            } catch (err) {
                console.error('Failed to fetch districts:', err)
                setDistrictOptions([])
                setSubmitError(getErrorMessage(err, "Failed to load districts. Please refresh and try again."))
            } finally {
                setIsDistrictLoading(false)
            }
        }
        fetchDistricts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVolume])

    // ---- Fetch blocks whenever district changes ----
    useEffect(() => {
        if (!selectedDistrict || !selectedVolume) {
            setBlockOptions([])
            return
        }
        const fetchBlocks = async () => {
            setIsBlockLoading(true)
            try {
                const res = await externalApi.get(external.ssl.blocks('bihar'), {
                    params: { district: selectedDistrict.value, volume: selectedVolume.value },
                })
                const list = res?.data?.data || []
                setBlockOptions(toOptions(list.map((item) => item.block)))
            } catch (err) {
                console.error('Failed to fetch blocks:', err)
                setBlockOptions([])
                setSubmitError(getErrorMessage(err, "Failed to load blocks. Please try again."))
            } finally {
                setIsBlockLoading(false)
            }
        }
        fetchBlocks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDistrict, selectedVolume])

    // ---- Fetch panchayats whenever district + block change ----
    useEffect(() => {
        if (!selectedDistrict || !selectedBlock || !selectedVolume) {
            setPanchayatOptions([])
            return
        }
        const fetchPanchayats = async () => {
            setIsPanchayatLoading(true)
            try {
                const res = await externalApi.get(external.ssl.panchayat('bihar'), {
                    params: { district: selectedDistrict.value, block: selectedBlock.value, volume: selectedVolume.value },
                })
                const list = res?.data?.data || []
                setPanchayatOptions(toOptions(list.map((item) => item.panchyat)))
            } catch (err) {
                console.error('Failed to fetch panchayats:', err)
                setPanchayatOptions([])
                setSubmitError(getErrorMessage(err, "Failed to load panchayats. Please try again."))
            } finally {
                setIsPanchayatLoading(false)
            }
        }
        fetchPanchayats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDistrict, selectedBlock, selectedVolume])

    // ---- Fetch site details whenever district + block + panchayat + start/end month change ----
  // ---- Fetch site details as soon as district + block + panchayat + volume are selected ----
// (start/end month ab optional filter hain, wait nahi karte)
useEffect(() => {
    if (!selectedDistrict || !selectedBlock || !selectedPanchayat || !selectedVolume || !startMonth || !endMonth) {
        setSiteDetails([])
        setSelectedSiteIds([])
        setSiteSummary(null)
        setSitesError("")
        setQuarterNote("")
        return
    }

    let cancelled = false

    const fetchSiteDetails = async () => {
        setIsSitesLoading(true)
        setSitesError("")
        setSiteDetails([])
        setSelectedSiteIds([])
        setQuarterNote("")
        try {
            const params = {
                district: selectedDistrict.value,
                block: selectedBlock.value,
                panchayat: selectedPanchayat.value,
                volume: selectedVolume.value,
                start_month_year: startMonth,
                end_month_year: endMonth,
            }

            const res = await externalApi.get(external.ssl.details('bihar'), {
                params,
            })

            if (cancelled) return

            const list = res?.data?.data || []
            let annotated = list.map((item) => ({ ...item, amcDone: false, amcDate: '' }))
            let selectableIds = annotated.map((item) => item.id)
            let note = ""

            try {
                const statusRes = await localApi.get(app.lightAmc.periodStatus, {
                    params: {
                        company_id: getCompanyId(),
                        district: selectedDistrict.value,
                        block: selectedBlock.value,
                        panchayat: selectedPanchayat.value,
                        start_month_year: startMonth,
                        end_month_year: endMonth,
                    },
                })
                const doneLights = Array.isArray(statusRes?.data?.data) ? statusRes.data.data : []
                const doneByKey = new Map()
                const isPoleLike = (value) => /^\d{1,3}$/.test(String(value || '').trim())

                doneLights.forEach((item) => {
                    const record = {
                        ssl_id: String(item.ssl_id || ''),
                        pole_no: item.pole_no || '',
                        unique_id: item.unique_id || item.ssl_id || '',
                        amc_date: item.amc_date || '',
                    }
                    if (item.ssl_id) doneByKey.set(String(item.ssl_id), record)
                    if (item.unique_id && String(item.unique_id) !== String(item.pole_no) && !isPoleLike(item.unique_id)) {
                        doneByKey.set(String(item.unique_id), record)
                    }
                })

                const byId = new Map(
                    list.map((item) => [String(item.id), { ...item, amcDone: false, amcDate: '' }])
                )

                byId.forEach((site, id) => {
                    const keys = [site.id, site.ssl_id, site.unique_id].filter(Boolean).map(String)
                    const done = keys.map((key) => doneByKey.get(key)).find(Boolean)
                    if (done) {
                        byId.set(id, { ...site, amcDone: true, amcDate: done.amc_date })
                    }
                })

                doneLights.forEach((item) => {
                    if (!item.ssl_id) return
                    const already = [...byId.values()].some((site) =>
                        String(site.id) === String(item.ssl_id) ||
                        String(site.ssl_id) === String(item.ssl_id) ||
                        (item.unique_id && String(site.unique_id) === String(item.unique_id) && !/^\d{1,3}$/.test(String(item.unique_id)))
                    )
                    if (!already) {
                        byId.set(String(item.ssl_id), {
                            id: item.ssl_id,
                            unique_id: item.unique_id || item.ssl_id,
                            pole_no: item.pole_no,
                            site_status: 'completed',
                            amcDone: true,
                            amcDate: item.amc_date,
                        })
                    }
                })

                annotated = [...byId.values()]
                selectableIds = annotated.filter((item) => !item.amcDone).map((item) => item.id)
                const doneCount = annotated.filter((item) => item.amcDone).length
                note = doneCount
                    ? `${doneCount} light${doneCount === 1 ? '' : 's'} already have Light AMC in this period.`
                    : ''
            } catch (statusErr) {
                console.error('Failed to fetch Light AMC status:', statusErr)
            }

            if (cancelled) return

            setSiteDetails(annotated)
            setSelectedSiteIds(selectableIds)
            setSiteSummary(res?.data?.summary || null)
            setQuarterNote(note)
        } catch (err) {
            if (cancelled) return
            console.error('Failed to fetch site details:', err)
            setSiteDetails([])
            setSelectedSiteIds([])
            setSiteSummary(null)
            setQuarterNote("")
            setSitesError(getErrorMessage(err, "Failed to load site details. Please try again."))
        } finally {
            if (!cancelled) setIsSitesLoading(false)
        }
    }
    fetchSiteDetails()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedDistrict, selectedBlock, selectedPanchayat, selectedVolume, startMonth, endMonth])

    const handleDistrictSelect = (option) => {
        setSelectedDistrict(option)
        setSelectedBlock(null)
        setSelectedPanchayat(null)
    }

    const handleBlockSelect = (option) => {
        setSelectedBlock(option)
        setSelectedPanchayat(null)
    }

    const handlePanchayatSelect = (option) => setSelectedPanchayat(option)

    const handleVolumeSelect = (option) => {
        setSelectedVolume(option)
        setSelectedDistrict(null)
        setSelectedBlock(null)
        setSelectedPanchayat(null)
    }

    // Remove a single site badge (keeps the raw list, just drops it from the selected ids)
    const removeSite = (id) => setSelectedSiteIds((prev) => prev.filter((sid) => sid !== id))

    // Only the sites that are still selected (i.e. not removed) get shown / submitted
    const pendingSites = siteDetails.filter((site) => !site.amcDone)
    const doneSites = siteDetails.filter((site) => site.amcDone)
    const selectedSites = pendingSites.filter((site) => selectedSiteIds.includes(site.id))
    const removedCount = pendingSites.length - selectedSites.length
    const visibleSites = [...doneSites, ...selectedSites]

    const handleSubmit = async (e) => {
    e.preventDefault()

    setSubmitError("")
    setSubmitSuccess(false)
    setSuccessMessage("")

    const companyId = getCompanyId()
    const user = getUser()
    const userId = user?.id

    if (!companyId) {
        setSubmitError(
            "Company information missing. Please login again."
        )
        return
    }

    if (!userId) {
        setSubmitError(
            "User information missing. Please login again."
        )
        return
    }

    if (
        !selectedVolume ||
        !selectedDistrict ||
        !selectedBlock ||
        !selectedPanchayat ||
        !startMonth ||
        !endMonth ||
        documents.length === 0
    ) {
        setSubmitError(
            "Please fill all required fields and upload at least one AMC document."
        )
        return
    }

    if (selectedSiteIds.length === 0) {
        setSubmitError(
            "Please select at least one site before submitting."
        )
        return
    }

    // ==========================================
    // FORM DATA
    // ==========================================

    const formData = new FormData()

    // AMC documents
    documents.forEach((file) => {
        formData.append(
            "amc_document",
            file
        )
    })

    // Invoice
    if (invoice) {
        formData.append(
            "invoice_document",
            invoice
        )
    }

    // Basic fields
    formData.append(
        "district",
        selectedDistrict.value
    )

    formData.append(
        "block",
        selectedBlock.value
    )

    formData.append(
        "panchayat",
        selectedPanchayat.value
    )

    formData.append(
        "start_month_year",
        startMonth
    )

    formData.append(
        "end_month_year",
        endMonth
    )

    formData.append(
        "volume",
        selectedVolume.value
    )

    formData.append(
        "company_id",
        companyId
    )

    formData.append(
        "user_id",
        userId
    )

    formData.append(
        "remarks",
        remarks.trim()
    )


    // ==========================================
    // SSL ID + POLE NO
    // ==========================================

    const selectedSitesForSubmit =
        pendingSites.filter((site) =>
            selectedSiteIds.includes(site.id)
        )


    selectedSitesForSubmit.forEach((site) => {

        // SSL ID
        formData.append(
            "ssl_id[]",
            site.id
        )

        // Pole No
        formData.append(
            "pole_no[]",
            site.pole_no || ""
        )
    })

    const removedSites = pendingSites.filter((site) => !selectedSiteIds.includes(site.id))
    removedSites.forEach((site) => {
        formData.append("pending_ssl_id[]", site.id)
        formData.append("pending_pole_no[]", site.pole_no || "")
    })


    // ==========================================
    // DEBUG
    // ==========================================

    console.log(
        "Selected Sites:",
        selectedSites
    )

    console.log(
        "SSL IDs:",
        selectedSites.map(
            (site) => site.id
        )
    )

    console.log(
        "Pole Nos:",
        selectedSites.map(
            (site) => site.pole_no
        )
    )


    // Check actual FormData
    for (const [key, value] of formData.entries()) {
        console.log(
            "FORM DATA:",
            key,
            value
        )
    }


    // ==========================================
    // SUBMIT
    // ==========================================

    setIsSubmitting(true)

    try {

        const res = await localApi.post(
            app.ssl.store('bihar'),
            formData,
            {
                headers: {
                    "Content-Type": undefined,
                },
            }
        )

        const responseData =
            res?.data?.data || null

        const responseMessage =
            res?.data?.message ||
            "AMC document uploaded successfully."


        setSubmitSuccess(true)

        setSuccessMessage(
            responseMessage
        )


        if (isModal && onSuccess) {

            setTimeout(
                () =>
                    onSuccess(
                        responseData
                    ),
                900
            )

        } else {

            setTimeout(
                () =>
                    navigate(pages.bihar.amcList),
                1200
            )
        }

    } catch (err) {

        console.error(
            "AMC submit failed:",
            err
        )

        setSubmitError(
            getErrorMessage(
                err,
                "Something went wrong while submitting the AMC document. Please try again."
            )
        )

    } finally {

        setIsSubmitting(false)
    }
}

    const handleCancel = () => {
        setSelectedDistrict(null)
        setSelectedBlock(null)
        setSelectedPanchayat(null)
        setStartMonth("")
        setEndMonth("")
        setDocuments([])
        setInvoice(null)
        setRemarks("")
        setSiteDetails([])
        setSelectedSiteIds([])
        setSiteSummary(null)
        setSitesError("")
        setQuarterNote("")
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
                    <div className="alert alert-danger" role="alert">
                        {submitError}
                    </div>
                )}

                {/* ---------------- Location Details ---------------- */}
                <SectionHeading
                    icon={<FiMapPin size={16} />}
                    title="Location Details"
                    subtitle="Select the volume, district, block and panchayat"
                />
                <div className="row">
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Volume <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={volumeOptions}
                            defaultSelect={isVolumeLoading ? "Loading volumes..." : "Select Volume"}
                            selectedOption={selectedVolume}
                            onSelectOption={handleVolumeSelect}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">District <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={districtOptions}
                            defaultSelect={
                                !selectedVolume
                                    ? "Select Volume First"
                                    : isDistrictLoading
                                        ? "Loading districts..."
                                        : "Select District"
                            }
                            selectedOption={selectedDistrict}
                            onSelectOption={handleDistrictSelect}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Block <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={blockOptions}
                            defaultSelect={
                                !selectedDistrict
                                    ? "Select District First"
                                    : isBlockLoading
                                        ? "Loading blocks..."
                                        : "Select Block"
                            }
                            selectedOption={selectedBlock}
                            onSelectOption={handleBlockSelect}
                        />
                    </div>
                    <div className="col-lg-3 col-md-6">
                        <label className="form-label">Panchayat <span className="text-danger">*</span></label>
                        <SelectDropdown
                            options={panchayatOptions}
                            defaultSelect={
                                !selectedBlock
                                    ? "Select Block First"
                                    : isPanchayatLoading
                                        ? "Loading panchayats..."
                                        : "Select Panchayat"
                            }
                            selectedOption={selectedPanchayat}
                            onSelectOption={handlePanchayatSelect}
                        />
                    </div>
                </div>

                <hr className="border-dashed" />

                {/* ---------------- AMC Period ---------------- */}
                <SectionHeading
                    icon={<FiCalendar size={16} />}
                    title="AMC Period"
                    subtitle="Select the quarter first, then site details will load"
                />
                <div className="row g-3">
                    <div className="col-lg-4 col-md-6">
                        <label className="form-label">
                            Start Month / Year <span className="text-danger">*</span>
                        </label>
                        <input
                            type="month"
                            className="form-control"
                            value={startMonth}
                            onChange={(e) => {
                                const value = e.target.value
                                setStartMonth(value)
                                setEndMonth(value ? addMonthsToInput(value, 3) : '')
                            }}
                        />
                    </div>
                    <div className="col-lg-4 col-md-6">
                        <label className="form-label">
                            End Month / Year <span className="text-danger">*</span>
                        </label>
                        <input
                            type="month"
                            className="form-control"
                            value={endMonth}
                            min={startMonth || undefined}
                            onChange={(e) => setEndMonth(e.target.value)}
                        />
                    </div>
                </div>

                <hr className="border-dashed" />

                <SectionHeading
                    icon={<FiList size={16} />}
                    title="Site Details"
                    subtitle="Lights refresh when the AMC period changes"
                />

                {!startMonth || !endMonth ? (
                    <div className="fs-13 text-muted mb-1">
                        Select AMC Period above to load site details.
                    </div>
                ) : (
                    <>
                        {isSitesLoading && (
                            <div className="d-flex align-items-center gap-2 text-muted fs-13 mb-2">
                                <FiLoader className="spin" size={14} />
                                Loading site details...
                            </div>
                        )}

                        {!isSitesLoading && sitesError && (
                            <div className="alert alert-warning fs-13 py-2 mb-2">
                                {sitesError}
                            </div>
                        )}

                        {!isSitesLoading && !sitesError && quarterNote && (
                            <div className="alert alert-info fs-13 py-2 mb-2">
                                {quarterNote}
                            </div>
                        )}

                        {!isSitesLoading && !sitesError && siteDetails.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mb-3">
                                <span className="badge bg-soft-primary text-primary rounded-pill px-3 py-2">
                                    {siteDetails.length} light{siteDetails.length === 1 ? '' : 's'}
                                </span>
                                <span className="badge bg-soft-success text-success rounded-pill px-3 py-2">
                                    {doneSites.length} AMC done
                                </span>
                                <span className="badge bg-soft-success text-success rounded-pill px-3 py-2">
                                    {selectedSites.length} selected
                                </span>
                                <span className="badge bg-soft-danger text-danger rounded-pill px-3 py-2">
                                    {removedCount} removed
                                </span>
                            </div>
                        )}

                        {!isSitesLoading && !sitesError && visibleSites.length > 0 && (
                            <div
                                className="border rounded-3 p-3 mb-1"
                                style={{ maxHeight: '260px', overflowY: 'auto' }}
                            >
                                <div className="d-flex flex-wrap gap-3">
                                    {visibleSites.map((site) => (
                                        site.amcDone ? (
                                            <DoneSiteCard key={site.id} site={site} />
                                        ) : (
                                            <SiteBadge
                                                key={site.id}
                                                site={site}
                                                onRemove={() => removeSite(site.id)}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isSitesLoading &&
                            !sitesError &&
                            pendingSites.length > 0 &&
                            selectedSites.length === 0 && (
                                <div className="fs-13 text-muted mb-1">
                                    All pending sites removed. Change the AMC period to reload sites.
                                </div>
                            )}

                        {!isSitesLoading &&
                            !sitesError &&
                            siteDetails.length === 0 && (
                                <div className="fs-13 text-muted mb-1">
                                    No sites for this location & period.
                                </div>
                            )}
                    </>
                )}

                <hr className="border-dashed" />

                {/* ---------------- Documents ---------------- */}
                <SectionHeading
                    icon={<FiPaperclip />}
                    title="Upload Documents"
                    subtitle="AMC documents are required, invoice is optional"
                />
                <div className="row mb-2">
                    <div className="col-lg-6">
                        <label className="form-label">
                            AMC Documents <span className="text-danger">*</span>
                        </label>
                        <Dropzone
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onFiles={addDocuments}
                            label="Click to upload or drag & drop"
                            hint="PDF, JPG or PNG — multiple files allowed"
                        />
                        {documents.length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                {documents.map((file, index) => (
                                    <FileBadge
                                        key={`${file.name}-${index}`}
                                        file={file}
                                        onRemove={() => removeDocument(index)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="col-lg-6">
                        <label className="form-label">Invoice <span className="fs-12 text-muted fw-normal">(Optional)</span></label>
                        <Dropzone
                            accept=".pdf,.jpg,.jpeg,.png"
                            onFiles={addInvoice}
                            label="Click to upload or drag & drop"
                            hint="PDF, JPG or PNG — single file"
                        />
                        {invoice && (
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                <FileBadge file={invoice} onRemove={removeInvoice} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="row mt-3">
                    <div className="col-lg-12">
                        <label className="form-label">Remarks <span className="fs-12 text-muted fw-normal">(Optional)</span></label>
                        <textarea
                            className="form-control"
                            rows={3}
                            maxLength={255}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add remarks for this AMC documentation"
                        />
                        <div className="fs-11 text-muted mt-1">{remarks.length}/255</div>
                    </div>
                </div>

                {/* ---------------- Submit / Cancel ---------------- */}
                <div className="d-flex justify-content-end gap-2 mb-0 pt-4 border-top">
                    <button type="button" className="btn btn-light mt-4" onClick={handleCancel} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                        {isSubmitting && <FiLoader className="spin" size={14} />}
                        {isSubmitting ? "Submitting..." : "Submit"}
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

export default UploadForm