import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FiAlertCircle,
    FiCalendar,
    FiCheckCircle,
    FiLoader,
    FiMapPin,
    FiPaperclip,
    FiSend,
    FiUser,
    FiZap,
} from 'react-icons/fi'
import SelectDropdown from '@/components/shared/SelectDropdown'
import CameraCapture from '@/components/shared/CameraCapture'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import externalApi from '../../api/externalApi'
import localApi from '../../api/localApi'
import { app, external, pages } from '../../api/routes'
import { getCompanyId, getUser } from '../../utils/auth'
import {
    areCoordinatesNear,
    captureCurrentLocation,
    getBiharAmcCoordinateError,
} from '../../utils/geolocation'
import { fetchAutoSslVolume } from '../../utils/sslVolume'
import { getSslAmcConfig, withRegionVolume } from '../../utils/sslAmcConfig'
import { buildLightSelectLabel, buildSiteDeviceGroups } from '../../utils/sslSiteDetails'
import {
    AMC_LIGHT_COOLDOWN_DAYS,
    filterLightsDueForAmc,
} from '../../utils/lightAmcCooldown'
import {
  filterExternalListByUser,
  mapDistinctFieldOptions,
  matchesDleAmcUser,
} from '../../utils/externalApiUser'
import '../../styles/camera-capture.css'

const COMPLAINT_ISSUE_OPTIONS = [
    'Light Not Working',
    'Pole Damaged',
    'Battery Fault',
    'SIM / Connectivity Issue',
    'Module Fault',
    'Other',
].map((item) => ({ value: item, label: item }))

const toOptions = (arr) =>
    (arr || [])
        .filter((item) => item !== null && item !== undefined && item !== '')
        .map((item) => ({ value: item, label: item }))

const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
    const data = err?.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    if (err?.message === 'Network Error') return 'Network error. Please check your internet connection.'
    return fallback
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const addMonthsISO = (value, months) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    date.setMonth(date.getMonth() + months)
    return date.toISOString().slice(0, 10)
}

const formatDisplayDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const unwrapDetails = (payload) => {
    if (!payload || typeof payload !== 'object') return null
    if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        return unwrapDetails(payload.data)
    }
    if (payload.site && typeof payload.site === 'object') return payload.site
    if (payload.details && typeof payload.details === 'object') return payload.details
    return payload
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

const LightAmcForm = ({ region = 'bihar' }) => {
    const navigate = useNavigate()
    const amcConfig = getSslAmcConfig(region)
    const locationConfig = amcConfig.location
    const sslState = amcConfig.sslState
    const viewPath = amcConfig.pages.lightAmcList
    const stateName = amcConfig.stateName

    const [autoVolume, setAutoVolume] = useState(null)
    const [isVolumeResolving, setIsVolumeResolving] = useState(amcConfig.requiresVolume)

    const [selectedDistrict, setSelectedDistrict] = useState(null)
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [selectedPanchayat, setSelectedPanchayat] = useState(null)
    const [districtOptions, setDistrictOptions] = useState([])
    const [blockOptions, setBlockOptions] = useState([])
    const [panchayatOptions, setPanchayatOptions] = useState([])
    const [isDistrictLoading, setIsDistrictLoading] = useState(false)
    const [isBlockLoading, setIsBlockLoading] = useState(false)
    const [isPanchayatLoading, setIsPanchayatLoading] = useState(false)

    const [siteDetails, setSiteDetails] = useState([])
    const [isSitesLoading, setIsSitesLoading] = useState(false)
    const [sitesError, setSitesError] = useState('')
    const [lightsCooldownNote, setLightsCooldownNote] = useState('')
    const [selectedLight, setSelectedLight] = useState(null)
    const [lightInfo, setLightInfo] = useState(null)
    const [isLightLoading, setIsLightLoading] = useState(false)
    const [detailsError, setDetailsError] = useState('')

    const [amcDate, setAmcDate] = useState('')
    const [nextAmcDate, setNextAmcDate] = useState('')
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')
    const [quarterNo, setQuarterNo] = useState(1)
    const [scheduleNote, setScheduleNote] = useState('')

    const [beneficiaryName, setBeneficiaryName] = useState('')
    const [beneficiaryContact, setBeneficiaryContact] = useState('')
    const [image1, setImage1] = useState(null)
    const [image2, setImage2] = useState(null)
    const [image1Coords, setImage1Coords] = useState(null)
    const [image2Coords, setImage2Coords] = useState(null)
    const [lightWorking, setLightWorking] = useState('Yes')
    const [complaintIssue, setComplaintIssue] = useState(null)
    const [complaintText, setComplaintText] = useState('')
    const [amcCoords, setAmcCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const lightOptions = siteDetails.map((site) => ({
        value: String(site.id ?? site.ssl_id ?? site.unique_id ?? ''),
        label: buildLightSelectLabel(region, site),
        site,
    }))

    useEffect(() => {
        if (!amcConfig.requiresVolume) return

        let cancelled = false

        const resolveVolume = async () => {
            setIsVolumeResolving(true)
            try {
                const volume = await fetchAutoSslVolume(amcConfig.sslState)
                if (cancelled) return
                if (!volume) {
                    setSubmitError('No volume assigned to your account. Please contact admin.')
                    setAutoVolume(null)
                    return
                }
                setAutoVolume(volume)
            } catch (err) {
                if (!cancelled) {
                    setAutoVolume(null)
                    setSubmitError(getErrorMessage(err, 'Failed to load location data.'))
                }
            } finally {
                if (!cancelled) setIsVolumeResolving(false)
            }
        }

        resolveVolume()
        return () => { cancelled = true }
    }, [amcConfig.requiresVolume, amcConfig.sslState])

    useEffect(() => {
        if (amcConfig.requiresVolume && !autoVolume) {
            if (!isVolumeResolving) setDistrictOptions([])
            return
        }

        const fetchDistricts = async () => {
            setIsDistrictLoading(true)
            try {
                const res = await externalApi.get(
                    external.ssl.district(sslState),
                    amcConfig.requiresVolume
                        ? { params: withRegionVolume({}, region, autoVolume) }
                        : undefined
                )
                const list = res?.data?.data || []
                setDistrictOptions(
                    mapDistinctFieldOptions(list, (item) => item.district)
                )
            } catch (err) {
                setDistrictOptions([])
                setSubmitError(getErrorMessage(err, 'Failed to load districts.'))
            } finally {
                setIsDistrictLoading(false)
            }
        }
        fetchDistricts()
    }, [amcConfig.requiresVolume, sslState, autoVolume, isVolumeResolving, region])

    useEffect(() => {
        if (!selectedDistrict || (amcConfig.requiresVolume && !autoVolume)) {
            setBlockOptions([])
            return
        }
        const fetchBlocks = async () => {
            setIsBlockLoading(true)
            try {
                const params = withRegionVolume(
                    { district: selectedDistrict.value },
                    region,
                    autoVolume
                )
                const res = await externalApi.get(external.ssl.blocks(sslState), { params })
                const list = res?.data?.data || []
                setBlockOptions(
                    mapDistinctFieldOptions(list, (item) => item.block)
                )
            } catch (err) {
                setBlockOptions([])
                setSubmitError(getErrorMessage(err, 'Failed to load blocks.'))
            } finally {
                setIsBlockLoading(false)
            }
        }
        fetchBlocks()
    }, [selectedDistrict, autoVolume, amcConfig.requiresVolume, sslState, region])

    useEffect(() => {
        if (!selectedDistrict || !selectedBlock || (amcConfig.requiresVolume && !autoVolume)) {
            setPanchayatOptions([])
            return
        }
        const fetchPanchayats = async () => {
            setIsPanchayatLoading(true)
            try {
                const params = withRegionVolume(
                    {
                        district: selectedDistrict.value,
                        block: selectedBlock.value,
                    },
                    region,
                    autoVolume
                )
                const res = await externalApi.get(external.ssl.panchayat(sslState), { params })
                const list = res?.data?.data || []
                setPanchayatOptions(
                    mapDistinctFieldOptions(list, locationConfig.extractListValue)
                )
            } catch (err) {
                setPanchayatOptions([])
                setSubmitError(getErrorMessage(err, `Failed to load ${locationConfig.label.toLowerCase()}s.`))
            } finally {
                setIsPanchayatLoading(false)
            }
        }
        fetchPanchayats()
    }, [selectedDistrict, selectedBlock, autoVolume, amcConfig.requiresVolume, sslState, region])

    useEffect(() => {
        if (
            !selectedDistrict ||
            !selectedBlock ||
            !selectedPanchayat ||
            (amcConfig.requiresVolume && !autoVolume)
        ) {
            setSiteDetails([])
            setSelectedLight(null)
            return
        }

        let cancelled = false

        const fetchSites = async () => {
            setIsSitesLoading(true)
            setSitesError('')
            setLightsCooldownNote('')
            setSiteDetails([])
            setSelectedLight(null)
            try {
                const params = withRegionVolume(
                    locationConfig.withLocalityParam(
                        {
                            district: selectedDistrict.value,
                            block: selectedBlock.value,
                        },
                        selectedPanchayat.value
                    ),
                    region,
                    autoVolume
                )
                const res = await externalApi.get(external.ssl.details(sslState), { params })
                if (cancelled) return

                const rawList = Array.isArray(res?.data?.data) ? res.data.data : []
                let list = region === 'bihar' ? filterExternalListByUser(rawList) : rawList

                try {
                    const recentRes = await localApi.get(app.lightAmc.recentDone, {
                        params: {
                            company_id: getCompanyId(),
                            state: stateName,
                            district: selectedDistrict.value,
                            block: selectedBlock.value,
                            panchayat: selectedPanchayat.value,
                            within_days: AMC_LIGHT_COOLDOWN_DAYS,
                        },
                    })
                    const doneLights = Array.isArray(recentRes?.data?.data) ? recentRes.data.data : []
                    const { dueList, skippedCount } = filterLightsDueForAmc(list, doneLights)
                    list = dueList

                    if (skippedCount > 0) {
                        setLightsCooldownNote(
                            `${skippedCount} light${skippedCount === 1 ? '' : 's'} already serviced in the last ${AMC_LIGHT_COOLDOWN_DAYS} days. Next AMC is due after 3 months.`
                        )
                    }
                } catch (recentErr) {
                    console.warn('Failed to fetch recent Light AMC records:', recentErr)
                }

                if (cancelled) return
                setSiteDetails(list)
            } catch (err) {
                if (!cancelled) {
                    setSiteDetails([])
                    setSitesError(getErrorMessage(err, 'Failed to load lights.'))
                }
            } finally {
                if (!cancelled) setIsSitesLoading(false)
            }
        }

        fetchSites()
        return () => { cancelled = true }
    }, [selectedDistrict, selectedBlock, selectedPanchayat, autoVolume, amcConfig.requiresVolume, sslState, region, stateName, locationConfig])

    useEffect(() => {
        if (!selectedLight) {
            setLightInfo(null)
            setDetailsError('')
            setAmcDate('')
            setNextAmcDate('')
            setPeriodStart('')
            setPeriodEnd('')
            setScheduleNote('')
            return
        }

        const loadLight = async () => {
            setIsLightLoading(true)
            setDetailsError('')
            setSubmitError('')
            try {
                let details = selectedLight.site ? { ...selectedLight.site } : null

                // Only Bihar has a separate external complaint details endpoint on ERP
                if (region === 'bihar') {
                    try {
                        const detailsRes = await externalApi.get(external.ssl.complaintDetails(sslState), {
                            params: { ssl_id: selectedLight.value },
                        })
                        const fetched = unwrapDetails(detailsRes?.data)
                        if (fetched && typeof fetched === 'object' && fetched.status !== false) {
                            details = { ...(details || {}), ...fetched }
                        }
                    } catch (detailErr) {
                        if (!details) throw detailErr
                    }
                }

                if (!details) {
                    throw new Error('No light details returned')
                }

                // Account assignment check is only applicable for Bihar
                if (region === 'bihar' && !matchesDleAmcUser(details)) {
                    throw new Error('This light is not assigned to your account.')
                }

                setLightInfo(details)
                setBeneficiaryName(
                    details.beneficiary_name ||
                    details.beneficiary ||
                    details.beneficiaryName ||
                    details.name ||
                    ''
                )
                setBeneficiaryContact(
                    details.contact_no ||
                    details.mobile ||
                    details.phone ||
                    details.mobile_no ||
                    details.contact ||
                    ''
                )

                try {
                    const lastRes = await localApi.get(app.lightAmc.last, {
                        params: { ssl_id: selectedLight.value, company_id: getCompanyId() },
                    })
                    const last = lastRes?.data?.data
                    const install = details.date_of_installation || details.installation_date || details.install_date
                    const start = last?.period_start || (install ? String(install).slice(0, 10) : todayISO())
                    const end = last?.period_end || addMonthsISO(start, 60)
                    const due = last?.amc_date ? addMonthsISO(last.amc_date, 3) : todayISO()

                    setPeriodStart(start)
                    setPeriodEnd(end)
                    setAmcDate(due)
                    setNextAmcDate(addMonthsISO(due, 3))

                    if (due > end) {
                        setScheduleNote('AMC period of 5 years has ended for this light.')
                    } else if (last?.amc_date) {
                        setScheduleNote(`Last AMC: ${formatDisplayDate(last.amc_date)}. Next due after 3 months.`)
                    } else {
                        setScheduleNote('First AMC for this light. Next visit will be after 3 months. Total period is 5 years.')
                    }
                } catch {
                    const install = details.date_of_installation || details.installation_date || details.install_date
                    const start = install ? String(install).slice(0, 10) : todayISO()
                    setPeriodStart(start)
                    setPeriodEnd(addMonthsISO(start, 60))
                    setAmcDate(todayISO())
                    setNextAmcDate(addMonthsISO(todayISO(), 3))
                    setScheduleNote('First AMC for this light. Next visit will be after 3 months. Total period is 5 years.')
                }
            } catch (err) {
                setLightInfo(null)
                setDetailsError(getErrorMessage(err, 'Failed to load site details for this light. Please try again.'))
            } finally {
                setIsLightLoading(false)
            }
        }

        loadLight()
    }, [selectedLight?.value, sslState, region])

    useEffect(() => {
        if (!selectedLight) {
            setAmcCoords(null)
            setImage1(null)
            setImage2(null)
            setImage1Coords(null)
            setImage2Coords(null)
            return
        }

        let cancelled = false
        setIsLocating(true)
        captureCurrentLocation()
            .then((coords) => {
                if (!cancelled) setAmcCoords(coords)
            })
            .catch(() => {
                if (!cancelled) setAmcCoords(null)
            })
            .finally(() => {
                if (!cancelled) setIsLocating(false)
            })

        return () => {
            cancelled = true
        }
    }, [selectedLight?.value])

    useEffect(() => {
        if (!amcDate || !periodStart) return
        const start = new Date(periodStart)
        const current = new Date(amcDate)
        const months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth())
        setQuarterNo(Math.min(20, Math.max(1, Math.floor(Math.max(0, months) / 3) + 1)))
        setNextAmcDate(addMonthsISO(amcDate, 3))
    }, [amcDate, periodStart])

    const handleDistrictSelect = (option) => {
        setSelectedDistrict(option)
        setSelectedBlock(null)
        setSelectedPanchayat(null)
        setSelectedLight(null)
    }

    const handleBlockSelect = (option) => {
        setSelectedBlock(option)
        setSelectedPanchayat(null)
        setSelectedLight(null)
    }

    const handlePanchayatSelect = (option) => {
        setSelectedPanchayat(option)
        setSelectedLight(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitError('')
        setSubmitSuccess(false)
        setSuccessMessage('')

        const companyId = getCompanyId()
        const user = getUser()
        if (!companyId || !user?.id) {
            setSubmitError('Please login again.')
            return
        }
        if (!selectedLight || !lightInfo || !amcDate || !beneficiaryName || !beneficiaryContact || !image1 || !image2) {
            setSubmitError('Select a light, fill beneficiary details, and capture 2 camera photos.')
            return
        }
        if (periodEnd && amcDate > periodEnd) {
            setSubmitError('AMC period of 5 years has ended for this light.')
            return
        }
        if (lightWorking === 'No' && (!complaintIssue || !complaintText.trim())) {
            setSubmitError('Light is not working. Please fill complaint issue and details.')
            return
        }

        setIsSubmitting(true)
        try {
            setIsLocating(true)
            const coords = await captureCurrentLocation()
            setAmcCoords(coords)

            if (region === 'bihar') {
                if (amcCoords && !areCoordinatesNear(amcCoords, coords)) {
                    setSubmitError(
                        'Lat long issue: current GPS differs from form GPS. Please recapture photos at the same location.'
                    )
                    return
                }

                const coordinateError = getBiharAmcCoordinateError(coords, [
                    image1Coords,
                    image2Coords,
                ])
                if (coordinateError) {
                    setSubmitError(coordinateError)
                    return
                }
            }

            let complaintRef = ''
            if (lightWorking === 'No' && region === 'bihar') {
                try {
                    const complaintData = new FormData()
                    complaintData.append('ssl_id', selectedLight.value)
                    complaintData.append('district', lightInfo?.district || selectedDistrict?.value || '')
                    complaintData.append('block', lightInfo?.block || selectedBlock?.value || '')
                    complaintData.append('panchyat', lightInfo?.panchyat || lightInfo?.panchayat || selectedPanchayat?.value || '')
                    complaintData.append('ward_no', lightInfo?.ward_no || '')
                    complaintData.append('pole_no', lightInfo?.pole_no || selectedLight.site?.pole_no || '')
                    complaintData.append('light_no', lightInfo?.light_no || '')
                    complaintData.append('beneficiary_name', beneficiaryName)
                    complaintData.append('contact_no', beneficiaryContact)
                    complaintData.append('latitude', lightInfo?.latitude || '')
                    complaintData.append('longitude', lightInfo?.longitude || '')
                    complaintData.append('along_with_pole', lightInfo?.along_with_pole || '')
                    complaintData.append('luminary_no', lightInfo?.luminary_no || '')
                    complaintData.append('sim_no', lightInfo?.sim_no || '')
                    complaintData.append('battery_serial_no', lightInfo?.battery_serial_no || '')
                    complaintData.append('module_no', lightInfo?.module_no || '')
                    complaintData.append('date_of_installation', lightInfo?.date_of_installation || '')
                    complaintData.append('complaint_date', amcDate)
                    complaintData.append('complaint_source', 'Field Visit')
                    complaintData.append('complaint_issue', complaintIssue.value)
                    complaintData.append('complaint', complaintText)
                    complaintData.append('send_sms', 'No')
                    complaintData.append('user_id', user.id)
                    complaintData.append('complaint_document', image1)
                    complaintData.append('complaint_document', image2)

                    const complaintRes = await externalApi.post(
                        external.ssl.complaintStore(sslState),
                        complaintData,
                        {
                            params: { company_id: companyId },
                            headers: { 'Content-Type': 'multipart/form-data' },
                        }
                    )
                    complaintRef =
                        complaintRes?.data?.data?.complaint_id ||
                        complaintRes?.data?.complaint_id ||
                        complaintRes?.data?.data?.id ||
                        ''
                } catch (complaintErr) {
                    console.warn('Failed to submit complaint to external ERP:', complaintErr)
                }
            }

            const formData = new FormData()
            formData.append('company_id', companyId)
            formData.append('user_id', user.id)
            formData.append('state', stateName)
            formData.append('district', selectedDistrict?.value || '')
            formData.append('block', selectedBlock?.value || '')
            formData.append('panchayat', selectedPanchayat?.value || '')
            formData.append('ward_no', lightInfo?.ward_no || '')
            if (amcConfig.requiresVolume && autoVolume) {
                formData.append('volume', autoVolume)
            }
            formData.append('ssl_id', selectedLight.value)
            formData.append('unique_id', lightInfo?.unique_id || selectedLight.site?.unique_id || '')
            formData.append('pole_no', lightInfo?.pole_no || selectedLight.site?.pole_no || '')
            formData.append('amc_date', amcDate)
            formData.append('beneficiary_name', beneficiaryName)
            formData.append('beneficiary_contact', beneficiaryContact)
            formData.append('light_working', lightWorking)
            formData.append('complaint_raised', lightWorking === 'No' ? '1' : '0')
            formData.append('complaint_ref', complaintRef)
            formData.append('date_of_installation', lightInfo?.date_of_installation || '')
            formData.append('image_1', image1)
            formData.append('image_2', image2)
            formData.append('latitude', coords.latitude)
            formData.append('longitude', coords.longitude)

            const res = await localApi.post(app.lightAmc.store, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            setSubmitSuccess(true)
            setSuccessMessage(res?.data?.message || 'Light AMC saved successfully.')
            setTimeout(() => navigate(viewPath), 1200)
        } catch (err) {
            setSubmitError(getErrorMessage(err, 'Failed to save AMC.'))
        } finally {
            setIsLocating(false)
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ overflow: 'visible' }}>
                <form onSubmit={handleSubmit}>
                    <div className="card mb-0" style={{ overflow: 'visible' }}>
                        <div className="card-body" style={{ overflow: 'visible' }}>
                            <SectionHeading
                                icon={<FiZap size={16} />}
                                title={`${amcConfig.moduleTitle} — Do Field AMC`}
                                subtitle={`${stateName}: find a light, complete this quarter’s AMC, and raise a complaint if it is not working`}
                            />

                            {submitSuccess && (
                                <div className="alert alert-success d-flex align-items-center gap-2">
                                    <FiCheckCircle /> {successMessage}
                                </div>
                            )}
                            {submitError && (
                                <div className="alert alert-danger d-flex align-items-center gap-2">
                                    <FiAlertCircle /> {submitError}
                                </div>
                            )}

                            <SectionHeading
                                icon={<FiMapPin size={16} />}
                                title="Find Light"
                                subtitle="Select location, then pick one light"
                            />
                            <div
                                className="border rounded-3 p-3 mb-4"
                                style={{ background: '#fbfcfe', overflow: 'visible', minHeight: 520 }}
                            >
                                <div className="row g-3">
                                    <div className="col-lg-6">
                                        <label className="form-label">District <span className="text-danger">*</span></label>
                                        <SelectDropdown
                                            options={districtOptions}
                                            defaultSelect={
                                                isVolumeResolving || isDistrictLoading
                                                    ? 'Loading...'
                                                    : 'Select District'
                                            }
                                            selectedOption={selectedDistrict}
                                            onSelectOption={handleDistrictSelect}
                                        />
                                    </div>
                                    <div className="col-lg-6">
                                        <label className="form-label">Block <span className="text-danger">*</span></label>
                                        <SelectDropdown
                                            options={blockOptions}
                                            defaultSelect={
                                                !selectedDistrict
                                                    ? 'Select District first'
                                                    : isBlockLoading
                                                        ? 'Loading...'
                                                        : 'Select Block'
                                            }
                                            selectedOption={selectedBlock}
                                            onSelectOption={handleBlockSelect}
                                        />
                                    </div>
                                    <div className="col-lg-6">
                                        <label className="form-label">{locationConfig.label} <span className="text-danger">*</span></label>
                                        <SelectDropdown
                                            options={panchayatOptions}
                                            defaultSelect={
                                                !selectedBlock
                                                    ? locationConfig.selectBlockFirstText
                                                    : isPanchayatLoading
                                                        ? locationConfig.loadingText
                                                        : locationConfig.selectText
                                            }
                                            selectedOption={selectedPanchayat}
                                            onSelectOption={handlePanchayatSelect}
                                        />
                                    </div>
                                    <div className="col-lg-6">
                                        <label className="form-label">Light <span className="text-danger">*</span></label>
                                        <SelectDropdown
                                            options={lightOptions}
                                            defaultSelect={
                                                !selectedPanchayat
                                                    ? locationConfig.selectLocalityFirstText
                                                    : isSitesLoading
                                                        ? 'Loading lights...'
                                                        : lightOptions.length
                                                            ? 'Select Light'
                                                            : lightsCooldownNote
                                                                ? 'No lights due for AMC yet'
                                                                : 'No lights found'
                                            }
                                            selectedOption={selectedLight}
                                            onSelectOption={setSelectedLight}
                                        />
                                    </div>
                                </div>

                                {(selectedDistrict || selectedPanchayat || selectedLight) && (
                                    <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
                                        {selectedDistrict && <span className="badge bg-soft-secondary text-secondary">{selectedDistrict.label}</span>}
                                        {selectedBlock && <span className="badge bg-soft-secondary text-secondary">{selectedBlock.label}</span>}
                                        {selectedPanchayat && <span className="badge bg-soft-secondary text-secondary">{selectedPanchayat.label}</span>}
                                        {selectedLight && <span className="badge bg-soft-success text-success">{selectedLight.label}</span>}
                                        {isSitesLoading && (
                                            <span className="fs-12 text-muted d-inline-flex align-items-center gap-1">
                                                <FiLoader className="spin" size={12} /> Loading lights
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {lightsCooldownNote && (
                                <div className="alert alert-info fs-13 py-2 mb-2">{lightsCooldownNote}</div>
                            )}
                            {sitesError && <div className="alert alert-warning fs-13 py-2">{sitesError}</div>}

                            {isLightLoading && (
                                <div className="d-flex align-items-center gap-2 text-muted fs-13 mb-3">
                                    <FiLoader className="spin" size={14} /> Fetching site details...
                                </div>
                            )}
                            {!isLightLoading && detailsError && (
                                <div className="alert alert-warning fs-13 py-2 mb-2">{detailsError}</div>
                            )}

                            {selectedLight && !isLightLoading && lightInfo && (
                                <>
                                    <hr className="border-dashed" />
                                    <SectionHeading
                                        icon={<FiZap size={16} />}
                                        title="Site & Device Details"
                                        subtitle={
                                            amcConfig.key === 'up'
                                                ? 'Columns shown from UP fetch response'
                                                : 'Fetched for the selected light'
                                        }
                                    />
                                    {buildSiteDeviceGroups(region, lightInfo, {
                                        isLocating,
                                        amcLatitude: amcCoords?.latitude,
                                        amcLongitude: amcCoords?.longitude,
                                    }).map((group) => (
                                        <DetailGroup
                                            key={group.title}
                                            title={group.title}
                                            items={group.items}
                                        />
                                    ))}

                                    <div className="row g-2 mb-3">
                                        <div className="col-lg-3 col-md-6"><DetailItem label="AMC Date" value={formatDisplayDate(amcDate)} /></div>
                                        <div className="col-lg-3 col-md-6"><DetailItem label="Next AMC (after 3 months)" value={formatDisplayDate(nextAmcDate)} /></div>
                                        <div className="col-lg-3 col-md-6"><DetailItem label="5 Year Period" value={`${formatDisplayDate(periodStart)} – ${formatDisplayDate(periodEnd)}`} /></div>
                                        <div className="col-lg-3 col-md-6"><DetailItem label="Quarter" value={`${quarterNo} / 20`} /></div>
                                    </div>
                                    {scheduleNote && <div className="alert alert-light border fs-12">{scheduleNote}</div>}

                                    <hr className="border-dashed" />
                                    <SectionHeading icon={<FiUser size={16} />} title="Beneficiary" subtitle="Confirm name and number for this AMC" />
                                    <div className="row g-3 mb-3">
                                        <div className="col-lg-4 col-md-6">
                                            <label className="form-label">Beneficiary Name <span className="text-danger">*</span></label>
                                            <input className="form-control" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} />
                                        </div>
                                        <div className="col-lg-4 col-md-6">
                                            <label className="form-label">Contact Number <span className="text-danger">*</span></label>
                                            <input className="form-control" value={beneficiaryContact} onChange={(e) => setBeneficiaryContact(e.target.value)} />
                                        </div>
                                    </div>

                                    <hr className="border-dashed" />
                                    <SectionHeading icon={<FiPaperclip size={16} />} title="Documentation" subtitle="Capture 2 photos from camera — latitude and longitude will be printed on each image" />
                                    <div className="row g-3 mb-3">
                                        <div className="col-lg-6">
                                            <CameraCapture
                                                label="Photo 1"
                                                hint="Open camera and capture"
                                                file={image1}
                                                onCapture={(file, coords) => {
                                                    setImage1(file)
                                                    setImage1Coords(coords)
                                                    if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                }}
                                                onClear={() => {
                                                    setImage1(null)
                                                    setImage1Coords(null)
                                                }}
                                            />
                                        </div>
                                        <div className="col-lg-6">
                                            <CameraCapture
                                                label="Photo 2"
                                                hint="Open camera and capture"
                                                file={image2}
                                                onCapture={(file, coords) => {
                                                    setImage2(file)
                                                    setImage2Coords(coords)
                                                    if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                }}
                                                onClear={() => {
                                                    setImage2(null)
                                                    setImage2Coords(null)
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <hr className="border-dashed" />
                                    <SectionHeading icon={<FiCalendar size={16} />} title="Light Status" subtitle="If not working, a complaint will be raised" />
                                    <div className="d-flex align-items-center gap-4 mb-3">
                                        <div className="form-check">
                                            <input className="form-check-input" type="radio" id="lightYes" checked={lightWorking === 'Yes'} onChange={() => setLightWorking('Yes')} />
                                            <label className="form-check-label" htmlFor="lightYes">Light is working</label>
                                        </div>
                                        <div className="form-check">
                                            <input className="form-check-input" type="radio" id="lightNo" checked={lightWorking === 'No'} onChange={() => setLightWorking('No')} />
                                            <label className="form-check-label" htmlFor="lightNo">Light is not working</label>
                                        </div>
                                    </div>

                                    {lightWorking === 'No' && (
                                        <div className="row g-3 mb-3">
                                            <div className="col-lg-4">
                                                <label className="form-label">Complaint Issue <span className="text-danger">*</span></label>
                                                <SelectDropdown
                                                    options={COMPLAINT_ISSUE_OPTIONS}
                                                    defaultSelect="Select"
                                                    selectedOption={complaintIssue}
                                                    onSelectOption={setComplaintIssue}
                                                />
                                            </div>
                                            <div className="col-lg-8">
                                                <label className="form-label">Complaint <span className="text-danger">*</span></label>
                                                <textarea className="form-control" rows={3} value={complaintText} onChange={(e) => setComplaintText(e.target.value)} placeholder="Describe the issue" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="d-flex justify-content-end gap-2 pt-4 border-top">
                                <button type="button" className="btn btn-light mt-4" onClick={() => navigate(viewPath)} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting ? <FiLoader className="spin" size={14} /> : <FiSend size={14} />}
                                    {isSubmitting ? 'Saving...' : 'Submit AMC'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}

export default LightAmcForm