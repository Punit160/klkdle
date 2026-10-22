import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    FiAlertCircle,
    FiCalendar,
    FiCheckCircle,
    FiHelpCircle,
    FiLoader,
    FiMapPin,
    FiPaperclip,
    FiSend,
    FiTool,
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
import { userIsAdmin } from '../../utils/userRoles'
import {
    areCoordinatesNear,
    captureCurrentLocation,
    getBiharAmcCoordinateError,
} from '../../utils/geolocation'
import { fetchAutoSslVolume } from '../../utils/sslVolume'
import { getSslAmcConfig, withRegionVolume } from '../../utils/sslAmcConfig'
import {
    buildLightSelectLabel,
    buildSiteDeviceGroups,
    buildWardSelectOptions,
    getSiteWardNo,
} from '../../utils/sslSiteDetails'
import {
    loadBiharAmcLocationPrefs,
    pickLocationOption,
    saveBiharAmcLocationSnapshot,
} from '../../utils/biharAmcLocationPrefs'
import {
    AMC_LIGHT_COOLDOWN_DAYS,
    filterLightsDueForAmc,
} from '../../utils/lightAmcCooldown'
import { useBiharAmcLocationSelection } from '../../hooks/useBiharAmcLocationSelection'
import {
  filterExternalListByUser,
  mapDistinctFieldOptions,
  matchesDleAmcUser,
} from '../../utils/externalApiUser'
import { resolveUploadUrl } from '../../utils/uploadUrl'
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
    const status = err?.response?.status
    if (
        status === 429 ||
        (typeof data?.message === 'string' &&
            /too many attempts/i.test(data.message))
    ) {
        return 'ERP server rate limit reached. Wait 1–2 minutes, refresh the page, then try again.'
    }
    if (typeof data === 'string' && data.trim()) return data
    if (data?.message) return data.message
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    if (err?.message === 'Network Error') return 'Network error. Please check your internet connection.'
    return fallback
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const localTodayISO = () => {
    const date = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const nowTimeValue = () => {
    const date = new Date()
    const pad = (value) => String(value).padStart(2, '0')
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const isValidCoordinate = (latitude, longitude) => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

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

/** Same Indian financial year label the API stores, for example 2026-10-14 -> 2026-27. */
const financialYearLabel = (isoDate) => {
    const match = String(isoDate || '').match(/^(\d{4})-(\d{2})/)
    if (!match) return ''
    const year = Number(match[1])
    const month = Number(match[2])
    if (!year || !month) return ''
    const startYear = month >= 4 ? year : year - 1
    return `${startYear}-${String(startYear + 1).slice(-2)}`
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

const SourceChoice = ({ name, value, onChange, options }) => (
    <div className="d-flex flex-wrap gap-3 mb-2">
        {options.map((option) => (
            <div className="form-check mb-0" key={option.value}>
                <input
                    className="form-check-input"
                    type="radio"
                    name={name}
                    id={`${name}-${option.value}`}
                    checked={value === option.value}
                    onChange={() => onChange(option.value)}
                />
                <label className="form-check-label" htmlFor={`${name}-${option.value}`}>{option.label}</label>
            </div>
        ))}
    </div>
)

const AdminPhotoUpload = ({ label, labelHi, file, existingUrl, onFile, onClear }) => {
    const [objectUrl, setObjectUrl] = useState('')

    useEffect(() => {
        if (!file) {
            setObjectUrl('')
            return undefined
        }
        const url = URL.createObjectURL(file)
        setObjectUrl(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    const src = objectUrl || existingUrl || ''

    return (
        <div className="h-100">
            <div className="fs-13 fw-semibold text-dark">{label}</div>
            {labelHi ? <div className="fs-12 text-muted">{labelHi}</div> : null}
            {src ? (
                <div className="mt-2">
                    <img src={src} alt={label} className="w-100 rounded-3 border" style={{ maxHeight: 220, objectFit: 'cover' }} />
                    <button type="button" className="btn btn-sm btn-light mt-2" onClick={onClear}>Remove</button>
                </div>
            ) : null}
            <input
                type="file"
                accept="image/*"
                className="form-control mt-2"
                onChange={(event) => {
                    const next = event.target.files?.[0]
                    if (next) onFile(next)
                    event.target.value = ''
                }}
            />
        </div>
    )
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

const OPTION_HI = {
    Yes: 'हाँ',
    No: 'नहीं',
    'Not Applicable': 'लागू नहीं',
    Functional: 'कार्यरत',
    'Non-Functional': 'अकार्यरत',
    'Stolen / Missing from Designated Place': 'चोरी / निर्धारित स्थान से गायब',
    Months: 'महीने',
    Years: 'वर्ष',
    'Satisfactory (Full backup received)': 'संतोषजनक (पूरा बैकअप मिला)',
    Unsatisfactory: 'असंतोषजनक',
}

const QuestionText = ({ number, en, hi, required = false }) => (
    <label className="form-label fw-semibold text-dark fs-13 mb-2 d-block">
        <span>
            {number}. {en}
            {required ? <span className="text-danger"> *</span> : null}
        </span>
        {hi ? <span className="d-block fw-normal text-muted mt-1">{hi}</span> : null}
    </label>
)

const RadioQuestion = ({ number, question, questionHi, options, value, onChange }) => (
    <div className="col-lg-6 col-12">
        <div className="card border shadow-none mb-0 h-100">
            <div className="card-body p-3">
                <QuestionText number={number} en={question} hi={questionHi} />
                <div className="d-flex flex-wrap align-items-center gap-3">
                    {options.map((opt) => {
                        const group = `q-${number}-${question}`.replace(/[^a-zA-Z0-9]/g, '_')
                        const id = `${group}-${opt}`.replace(/[^a-zA-Z0-9]/g, '_')
                        return (
                            <div className="form-check" key={opt}>
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    id={id}
                                    name={group}
                                    checked={value === opt}
                                    onChange={() => onChange(opt)}
                                />
                                <label className="form-check-label fs-13 text-secondary" htmlFor={id} style={{ cursor: 'pointer' }}>
                                    {opt}
                                    {OPTION_HI[opt] ? <span className="d-block fs-12 text-muted">{OPTION_HI[opt]}</span> : null}
                                </label>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    </div>
)

const SectionHeading = ({ icon, title, titleHi, subtitle, subtitleHi }) => (
    <div className="d-flex align-items-center gap-3 mb-4">
        <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
            {icon}
        </div>
        <div>
            <h6 className="fw-bold text-dark mb-0">
                {title}
                {titleHi ? <span className="d-block fs-12 fw-normal text-muted mt-1">{titleHi}</span> : null}
            </h6>
            {subtitle && (
                <p className="fs-12 text-muted mb-0">
                    {subtitle}
                    {subtitleHi ? <span className="d-block">{subtitleHi}</span> : null}
                </p>
            )}
        </div>
    </div>
)

const LightAmcForm = ({ region = 'bihar' }) => {
    const navigate = useNavigate()
    const amcConfig = getSslAmcConfig(region)
    const locationConfig = amcConfig.location
    const sslState = amcConfig.sslState
    const viewPath = amcConfig.pages.lightAmcList
    const detailsPath = amcConfig.pages.lightAmcDetails
    const stateName = amcConfig.stateName
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('id') || ''
    const isEdit = Boolean(editId)
    const plantKind = region === 'powerpack' || region === 'offgrid' || region === 'ongrid'
    const upStyle = region === 'up' || region === 'kusumc' || plantKind
    const assetTitle = region === 'kusumc' ? 'Pump' : region === 'powerpack' ? 'Power Pack' : region === 'offgrid' ? 'Off Grid' : region === 'ongrid' ? 'On Grid' : 'Light'
    const assetNoun = assetTitle.toLowerCase()

    const [autoVolume, setAutoVolume] = useState(null)
    const [isVolumeResolving, setIsVolumeResolving] = useState(amcConfig.requiresVolume)

    const [districtOptions, setDistrictOptions] = useState([])
    const [blockOptions, setBlockOptions] = useState([])
    const [panchayatOptions, setPanchayatOptions] = useState([])

    const {
        selectedDistrict,
        selectedBlock,
        selectedPanchayat,
        handleDistrictSelect: applyDistrictSelect,
        handleBlockSelect: applyBlockSelect,
        handlePanchayatSelect: applyPanchayatSelect,
        rememberCurrentLocation,
    } = useBiharAmcLocationSelection({
        enabled: region === 'bihar',
        districtOptions,
        blockOptions,
        panchayatOptions,
    })
    const [isDistrictLoading, setIsDistrictLoading] = useState(false)
    const [isBlockLoading, setIsBlockLoading] = useState(false)
    const [isPanchayatLoading, setIsPanchayatLoading] = useState(false)

    const [allPanchayatSites, setAllPanchayatSites] = useState([])
    const [selectedWard, setSelectedWard] = useState(null)
    const wardRestoreDoneRef = useRef(false)
    const locationEditedRef = useRef(false)
    const lastSitesFetchKeyRef = useRef('')
    const lastSitesCountRef = useRef(0)
    const [isSitesLoading, setIsSitesLoading] = useState(false)
    const [sitesError, setSitesError] = useState('')
    const [lightsCooldownNote, setLightsCooldownNote] = useState('')
    const [selectedLight, setSelectedLight] = useState(null)

    const wardOptions = useMemo(
        () => buildWardSelectOptions(allPanchayatSites),
        [allPanchayatSites]
    )

    const wardsInData = wardOptions.length > 0

    const siteDetails = useMemo(() => {
        if (!allPanchayatSites.length) return []
        if (region !== 'bihar' || !wardsInData) return allPanchayatSites
        if (!selectedWard?.value) return []
        return allPanchayatSites.filter(
            (site) => getSiteWardNo(site) === selectedWard.value
        )
    }, [allPanchayatSites, selectedWard, wardsInData, region])
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
    const [formImage, setFormImage] = useState(null)
    const [keptPhotos, setKeptPhotos] = useState({ slip: '', photo1: '', photo2: '' })
    const [locationSource, setLocationSource] = useState('gps')
    const [dateTimeSource, setDateTimeSource] = useState('manual')
    const [photoSource, setPhotoSource] = useState('camera')
    const [uidInput, setUidInput] = useState('')
    const [remarks, setRemarks] = useState('')
    const [workOrderNo, setWorkOrderNo] = useState('')
    const [capacityInput, setCapacityInput] = useState('')
    const [schemeName, setSchemeName] = useState('')
    const [orderNo, setOrderNo] = useState('')
    const [uidDate, setUidDate] = useState('')
    const [installedPlace, setInstalledPlace] = useState('')
    const [image1Coords, setImage1Coords] = useState(null)
    const [image2Coords, setImage2Coords] = useState(null)
    const [plantStatus, setPlantStatus] = useState('')
    const [functionalDurationValue, setFunctionalDurationValue] = useState('')
    const [functionalDurationUnit, setFunctionalDurationUnit] = useState('Months')
    const [backupHoursPerDay, setBackupHoursPerDay] = useState('')
    const [breakdownCount, setBreakdownCount] = useState('')
    const [lastRepairDate, setLastRepairDate] = useState('')
    const [panelCleaningDone, setPanelCleaningDone] = useState('')
    const [batteryBankCondition, setBatteryBankCondition] = useState('')
    const [batteryTerminalCleaned, setBatteryTerminalCleaned] = useState('')
    const [batteryPetroleumJellyApplied, setBatteryPetroleumJellyApplied] = useState('')
    const [luminairesCleanedWiring, setLuminairesCleanedWiring] = useState('')
    const [wiringCheckedLooseWires, setWiringCheckedLooseWires] = useState('')
    const [lightWorking, setLightWorking] = useState('Yes')
    const [complaintIssue, setComplaintIssue] = useState(null)
    const [complaintText, setComplaintText] = useState('')
    const [amcCoords, setAmcCoords] = useState(null)
    const [latitudeInput, setLatitudeInput] = useState('')
    const [longitudeInput, setLongitudeInput] = useState('')
    const [amcTime, setAmcTime] = useState('')
    const [isLocating, setIsLocating] = useState(false)

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    const lightOptions = siteDetails.map((site) => ({
        value: String(
            region === 'kusumc'
                ? (site.pump_id ?? site.id ?? site.ssl_id ?? '')
                : region === 'powerpack'
                    ? (site.powerpack_id ?? site.id ?? site.ssl_id ?? '')
                    : region === 'offgrid'
                        ? (site.offgrid_id ?? site.id ?? site.ssl_id ?? '')
                        : region === 'ongrid'
                            ? (site.ongrid_id ?? site.id ?? site.ssl_id ?? '')
                            : (site.id ?? site.ssl_id ?? site.unique_id ?? '')
        ),
        label: buildLightSelectLabel(region, site),
        site,
    }))

    useEffect(() => {
        if (!amcConfig.requiresVolume) return

        let cancelled = false

        const resolveVolume = async () => {
            setIsVolumeResolving(true)
            try {
                if (!getCompanyId() || !getUser()?.id) {
                    setSubmitError('Session expired. Please log out and log in again.')
                    setAutoVolume(null)
                    return
                }

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
    }, [selectedDistrict, selectedBlock, autoVolume, amcConfig.requiresVolume, sslState, region, locationConfig.extractListValue, locationConfig.label])

    useEffect(() => {
        if (
            !selectedDistrict ||
            !selectedBlock ||
            !selectedPanchayat ||
            (amcConfig.requiresVolume && !autoVolume)
        ) {
            setAllPanchayatSites([])
            setSelectedWard(null)
            wardRestoreDoneRef.current = false
            setSelectedLight(null)
            lastSitesFetchKeyRef.current = ''
            lastSitesCountRef.current = 0
            return
        }

        let cancelled = false

        const fetchKey = [
            selectedDistrict.value,
            selectedBlock.value,
            selectedPanchayat.value,
            autoVolume || '',
        ].join('|')

        if (fetchKey === lastSitesFetchKeyRef.current && lastSitesCountRef.current > 0) {
            return () => {
                cancelled = true
            }
        }

        const fetchSites = async () => {
            setIsSitesLoading(true)
            setSitesError('')
            setLightsCooldownNote('')
            setAllPanchayatSites([])
            setSelectedWard(null)
            wardRestoreDoneRef.current = false
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
                            region,
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
                            `${skippedCount} ${assetNoun}${skippedCount === 1 ? '' : 's'} already serviced in the last ${AMC_LIGHT_COOLDOWN_DAYS} days. Next AMC is due after 3 months.`
                        )
                    }
                } catch (recentErr) {
                    console.warn('Failed to fetch recent Light AMC records:', recentErr)
                }

                if (cancelled) return
                setAllPanchayatSites(list)
                lastSitesFetchKeyRef.current = fetchKey
                lastSitesCountRef.current = list.length
            } catch (err) {
                if (!cancelled) {
                    setAllPanchayatSites([])
                    lastSitesCountRef.current = 0
                    setSitesError(getErrorMessage(err, `Failed to load ${assetNoun}s.`))
                }
            } finally {
                if (!cancelled) setIsSitesLoading(false)
            }
        }

        fetchSites()
        return () => { cancelled = true }
    }, [
        selectedDistrict,
        selectedBlock,
        selectedPanchayat,
        autoVolume,
        amcConfig.requiresVolume,
        sslState,
        region,
        stateName,
        locationConfig,
        assetNoun,
    ])

    useEffect(() => {
        if (region !== 'bihar' || selectedWard || wardRestoreDoneRef.current) return
        if (!wardOptions.length) {
            wardRestoreDoneRef.current = true
            return
        }

        const savedWard = loadBiharAmcLocationPrefs()?.ward
        const option = pickLocationOption(wardOptions, savedWard)
        if (option) {
            setSelectedWard(option)
        }
        wardRestoreDoneRef.current = true
    }, [region, wardOptions, selectedWard])

    useEffect(() => {
        if (editId) return
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
                if (region === 'kusumc' || plantKind) {
                    setWorkOrderNo(details.work_order_no || details.workOrderNo || '')
                    setCapacityInput(details.capacity || '')
                    setSchemeName(details.scheme_name || '')
                    setOrderNo(details.order_no || '')
                    setUidDate(details.uid_date || '')
                    setInstalledPlace(details.installed_place || '')
                }

                try {
                    const lastRes = await localApi.get(app.lightAmc.last, {
                        params: {
                            ssl_id: selectedLight.value,
                            company_id: getCompanyId(),
                            state: stateName,
                            region,
                        },
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
    }, [selectedLight, sslState, region, stateName, editId, plantKind])

    useEffect(() => {
        if (editId) return
        locationEditedRef.current = false
        setAmcCoords(null)
        setLatitudeInput('')
        setLongitudeInput('')
        setAmcTime(userIsAdmin() ? nowTimeValue() : '')
        setLocationSource('gps')
        setDateTimeSource('manual')
        setPhotoSource('camera')
        setImage1(null)
        setImage2(null)
        setFormImage(null)
        setImage1Coords(null)
        setImage2Coords(null)
        setPlantStatus('')
        setFunctionalDurationValue('')
        setFunctionalDurationUnit('Months')
        setBackupHoursPerDay('')
        setBreakdownCount('')
        setLastRepairDate('')
        setPanelCleaningDone('')
        setBatteryBankCondition('')
        setBatteryTerminalCleaned('')
        setBatteryPetroleumJellyApplied('')
        setLuminairesCleanedWiring('')
        setWiringCheckedLooseWires('')
        if (!selectedLight) {
            return
        }

        let cancelled = false
        setIsLocating(true)
        captureCurrentLocation()
            .then((coords) => {
                if (cancelled || locationEditedRef.current) return
                setAmcCoords(coords)
                if (upStyle && userIsAdmin()) {
                    setLatitudeInput(coords.latitude)
                    setLongitudeInput(coords.longitude)
                }
            })
            .catch(() => {
                if (!cancelled && !locationEditedRef.current) setAmcCoords(null)
            })
            .finally(() => {
                if (!cancelled) setIsLocating(false)
            })

        return () => {
            cancelled = true
        }
    }, [selectedLight, region, editId, upStyle])

    useEffect(() => {
        if (!editId) return undefined
        if (!userIsAdmin()) {
            setSubmitError('Only an admin can edit an AMC visit.')
            return undefined
        }

        let cancelled = false
        const loadVisit = async () => {
            setIsLightLoading(true)
            setDetailsError('')
            try {
                const res = await localApi.get(app.lightAmc.view(editId), {
                    params: { state: stateName, region },
                })
                const row = res?.data?.data
                if (cancelled) return
                if (!row) {
                    setDetailsError('AMC record not found.')
                    return
                }
                const answers = row.visit_answers && typeof row.visit_answers === 'object' ? row.visit_answers : {}
                locationEditedRef.current = true
                setLightInfo({
                    district: row.district,
                    block: row.block,
                    panchayat: row.panchayat || row.village,
                    village: row.village || row.panchayat,
                    ward_no: row.ward_no,
                    unique_id: row.unique_id,
                    uid: row.uid,
                    pole_no: row.pole_no,
                    ssl_id: row.ssl_id || row.pump_id,
                    pump_id: row.pump_id || row.ssl_id,
                    powerpack_id: row.powerpack_id || row.ssl_id,
                    work_order_no: row.work_order_no,
                    capacity: row.capacity,
                    scheme_name: row.scheme_name,
                    order_no: row.order_no,
                    uid_date: row.uid_date,
                    installed_place: row.installed_place,
                    offgrid_id: row.offgrid_id,
                    ongrid_id: row.ongrid_id,
                    beneficiary_name: row.beneficiary_name,
                    date_of_installation: row.date_of_installation,
                })
                setWorkOrderNo(row.work_order_no || '')
                setCapacityInput(row.capacity || '')
                setSchemeName(row.scheme_name || '')
                setOrderNo(row.order_no || '')
                setUidDate(row.uid_date || '')
                setInstalledPlace(row.installed_place || '')
                setSelectedLight({
                    value: String(row.ongrid_id || row.offgrid_id || row.powerpack_id || row.pump_id || row.ssl_id || ''),
                    label: row.ongrid_id || row.offgrid_id || row.powerpack_id || row.pump_id || row.unique_id || row.ssl_id || 'Saved visit',
                    site: row,
                })
                setBeneficiaryName(row.beneficiary_name || '')
                setBeneficiaryContact(row.beneficiary_contact || '')
                setAmcDate(row.amc_date || '')
                setNextAmcDate(row.next_amc_date || '')
                setPeriodStart(row.period_start || '')
                setPeriodEnd(row.period_end || '')
                setQuarterNo(Number(row.quarter_no) || 1)
                setAmcTime(row.amc_time || '')
                setLatitudeInput(row.latitude || '')
                setLongitudeInput(row.longitude || '')
                setAmcCoords(row.latitude && row.longitude ? { latitude: String(row.latitude), longitude: String(row.longitude) } : null)
                setUidInput(row.uid || '')
                setRemarks(row.remarks || '')
                setLightWorking(row.light_working === 'No' ? 'No' : 'Yes')
                setPlantStatus(answers.plant_status || '')
                setFunctionalDurationValue(answers.functional_duration_value || '')
                setFunctionalDurationUnit(answers.functional_duration_unit || 'Months')
                setBackupHoursPerDay(answers.backup_hours_per_day || '')
                setBreakdownCount(answers.breakdown_count || '')
                setLastRepairDate(answers.last_repair_date || '')
                setPanelCleaningDone(answers.panel_cleaning_done || '')
                setBatteryBankCondition(answers.battery_bank_condition || '')
                setBatteryTerminalCleaned(answers.battery_terminal_cleaned || '')
                setBatteryPetroleumJellyApplied(answers.battery_petroleum_jelly_applied || '')
                setLuminairesCleanedWiring(answers.luminaires_cleaned_wiring || '')
                setWiringCheckedLooseWires(answers.wiring_checked_loose_wires || '')
                setKeptPhotos({
                    slip: row.image_3 || '',
                    photo1: row.image_1 || '',
                    photo2: row.image_2 || '',
                })
                setLocationSource('manual')
                setDateTimeSource('manual')
                setPhotoSource('camera')
                setScheduleNote('Saved photos stay until you capture a replacement.')
            } catch (err) {
                if (!cancelled) setDetailsError(getErrorMessage(err, 'Failed to load this AMC visit.'))
            } finally {
                if (!cancelled) setIsLightLoading(false)
            }
        }

        loadVisit()
        return () => {
            cancelled = true
        }
    }, [editId, region, stateName])

    useEffect(() => {
        if (!amcDate || !periodStart) return
        const start = new Date(periodStart)
        const current = new Date(amcDate)
        const months = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth())
        setQuarterNo(Math.min(20, Math.max(1, Math.floor(Math.max(0, months) / 3) + 1)))
        setNextAmcDate(addMonthsISO(amcDate, 3))
    }, [amcDate, periodStart])

    const handleDistrictSelect = (option) => {
        applyDistrictSelect(option)
        setSelectedLight(null)
    }

    const handleBlockSelect = (option) => {
        applyBlockSelect(option)
        setSelectedLight(null)
    }

    const handlePanchayatSelect = (option) => {
        applyPanchayatSelect(option)
        setSelectedWard(null)
        wardRestoreDoneRef.current = false
        setSelectedLight(null)
        if (region === 'bihar') {
            saveBiharAmcLocationSnapshot({
                district: selectedDistrict,
                block: selectedBlock,
                panchayat: option,
                ward: '',
            })
        }
    }

    const handleWardSelect = (option) => {
        setSelectedWard(option)
        setSelectedLight(null)
        if (region === 'bihar') {
            saveBiharAmcLocationSnapshot({
                district: selectedDistrict,
                block: selectedBlock,
                panchayat: selectedPanchayat,
                ward: option,
            })
        }
    }

    const savedUid = isEdit
        ? uidInput.trim()
        : String(lightInfo?.uid || selectedLight?.site?.uid || '').trim()
    const savedFinancialYear = financialYearLabel(amcDate)
    const adminChoices = userIsAdmin()
    const photoPreview = (file, storedPath) => (!file && storedPath ? resolveUploadUrl(storedPath) : '')

    const applyAdminLatitude = (value) => {
        locationEditedRef.current = true
        setLatitudeInput(value)
        setAmcCoords((current) => ({
            latitude: value,
            longitude: current?.longitude || longitudeInput,
        }))
    }

    const applyAdminLongitude = (value) => {
        locationEditedRef.current = true
        setLongitudeInput(value)
        setAmcCoords((current) => ({
            latitude: current?.latitude || latitudeInput,
            longitude: value,
        }))
    }

    const chooseManualLocation = () => {
        locationEditedRef.current = true
        setLocationSource('manual')
    }

    const chooseGpsLocation = async () => {
        locationEditedRef.current = false
        setLocationSource('gps')
        setIsLocating(true)
        setSubmitError('')
        try {
            const coords = await captureCurrentLocation()
            if (locationEditedRef.current) return
            setAmcCoords(coords)
            setLatitudeInput(coords.latitude)
            setLongitudeInput(coords.longitude)
        } catch (err) {
            setSubmitError(getErrorMessage(err, 'Could not read GPS. You can enter latitude and longitude instead.'))
            locationEditedRef.current = true
            setLocationSource('manual')
        } finally {
            setIsLocating(false)
        }
    }

    const chooseCurrentDateTime = () => {
        setDateTimeSource('current')
        setAmcDate(localTodayISO())
        setAmcTime(nowTimeValue())
    }

    const chooseManualDateTime = (value) => {
        setDateTimeSource('manual')
        const [date, time] = String(value || '').split('T')
        if (date) setAmcDate(date)
        if (time) setAmcTime(time.slice(0, 5))
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
        if (!isEdit && region === 'bihar' && wardsInData && !selectedWard) {
            setSubmitError('Please select ward, then choose a light.')
            return
        }
        if (!selectedLight || !lightInfo || !amcDate || !beneficiaryName || !beneficiaryContact) {
            setSubmitError(`Select a ${assetNoun} and fill beneficiary details.`)
            return
        }
        if (upStyle && !plantStatus) {
            setSubmitError('Please select whether the light is functional.')
            return
        }
        const slipReady = Boolean(formImage || keptPhotos.slip)
        const photo1Ready = Boolean(image1 || keptPhotos.photo1)
        const photo2Ready = Boolean(image2 || keptPhotos.photo2)
        if (upStyle && (!slipReady || !photo1Ready || !photo2Ready)) {
            setSubmitError('Capture the visit slip and both light photos.')
            return
        }
        if (!upStyle && (!photo1Ready || !photo2Ready)) {
            setSubmitError('Capture 2 camera photos.')
            return
        }
        const visitDate = adminChoices && dateTimeSource === 'current' ? localTodayISO() : amcDate
        const visitTime = adminChoices && dateTimeSource === 'current' ? nowTimeValue() : (amcTime || nowTimeValue())
        if (adminChoices && dateTimeSource === 'manual' && (!amcDate || !amcTime)) {
            setSubmitError('Enter the visit date and time.')
            return
        }
        if (periodEnd && visitDate > periodEnd) {
            setSubmitError('AMC period of 5 years has ended for this light.')
            return
        }
        if (!isEdit && lightWorking === 'No' && (!complaintIssue || !complaintText.trim())) {
            setSubmitError('Light is not working. Please fill complaint issue and details.')
            return
        }

        setIsSubmitting(true)
        try {
            let coords
            if (adminChoices && locationSource === 'manual') {
                const latitude = latitudeInput.trim()
                const longitude = longitudeInput.trim()
                if (!isValidCoordinate(latitude, longitude)) {
                    setSubmitError('Enter a valid latitude and longitude, or choose Use GPS.')
                    return
                }
                coords = { latitude, longitude }
                setAmcCoords(coords)
            } else {
                setIsLocating(true)
                coords = await captureCurrentLocation()
                setAmcCoords(coords)
            }

            if (region === 'bihar' && !(adminChoices && (locationSource === 'manual' || photoSource === 'upload'))) {
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
            if (!isEdit && lightWorking === 'No' && region === 'bihar') {
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
            formData.append('district', selectedDistrict?.value || lightInfo?.district || '')
            formData.append('block', selectedBlock?.value || lightInfo?.block || '')
            formData.append('panchayat', selectedPanchayat?.value || lightInfo?.panchayat || lightInfo?.village || '')
            formData.append('village', selectedPanchayat?.value || lightInfo?.village || lightInfo?.panchayat || '')
            formData.append('ward_no', lightInfo?.ward_no || '')
            if (amcConfig.requiresVolume && autoVolume) {
                formData.append('volume', autoVolume)
            }
            formData.append('ssl_id', selectedLight.value)
            if (region === 'kusumc') {
                formData.append('pump_id', selectedLight.value)
                formData.append('work_order_no', workOrderNo)
                formData.append('capacity', capacityInput)
            }
            if (plantKind) {
                if (region === 'powerpack') formData.append('powerpack_id', selectedLight.value)
                if (region === 'offgrid') formData.append('offgrid_id', selectedLight.value)
                if (region === 'ongrid') formData.append('ongrid_id', selectedLight.value)
                formData.append('work_order_no', workOrderNo)
                formData.append('capacity', capacityInput)
                formData.append('scheme_name', schemeName)
                formData.append('order_no', orderNo)
                formData.append('uid_date', uidDate)
                formData.append('installed_place', installedPlace)
            }
            formData.append('unique_id', lightInfo?.unique_id || selectedLight.site?.unique_id || '')
            if (upStyle) {
                formData.append('uid', savedUid)
                formData.append('fy_year', savedFinancialYear)
                if (adminChoices) formData.append('amc_time', visitTime)
            }
            formData.append('pole_no', lightInfo?.pole_no || selectedLight.site?.pole_no || '')
            formData.append('amc_date', visitDate)
            formData.append('beneficiary_name', beneficiaryName)
            formData.append('beneficiary_contact', beneficiaryContact)
            formData.append('light_working', lightWorking)
            formData.append('complaint_raised', lightWorking === 'No' ? '1' : '0')
            formData.append('complaint_ref', complaintRef)
            formData.append('date_of_installation', lightInfo?.date_of_installation || '')
            formData.append('remarks', remarks)
            if (image1) formData.append('image_1', image1)
            if (image2) formData.append('image_2', image2)
            if (upStyle) {
                if (formImage) formData.append('image_3', formImage)
                const lightIsFunctional = plantStatus === 'Functional'
                formData.append('visit_answers', JSON.stringify({
                    plant_status: plantStatus,
                    functional_duration_value: lightIsFunctional ? functionalDurationValue : '',
                    functional_duration_unit: lightIsFunctional ? functionalDurationUnit : '',
                    backup_hours_per_day: lightIsFunctional ? backupHoursPerDay : '',
                    breakdown_count: lightIsFunctional ? breakdownCount : '',
                    last_repair_date: lightIsFunctional ? lastRepairDate : '',
                    panel_cleaning_done: lightIsFunctional ? panelCleaningDone : '',
                    battery_bank_condition: lightIsFunctional ? batteryBankCondition : '',
                    battery_terminal_cleaned: lightIsFunctional ? batteryTerminalCleaned : '',
                    battery_petroleum_jelly_applied: lightIsFunctional ? batteryPetroleumJellyApplied : '',
                    luminaires_cleaned_wiring: lightIsFunctional ? luminairesCleanedWiring : '',
                    wiring_checked_loose_wires: lightIsFunctional ? wiringCheckedLooseWires : '',
                }))
            }
            formData.append('latitude', coords.latitude)
            formData.append('longitude', coords.longitude)

            const request = isEdit
                ? localApi.patch(app.lightAmc.update(editId), formData, { params: { state: stateName, region } })
                : localApi.post(app.lightAmc.store, formData, { params: { state: stateName, region } })
            const res = await request

            setSubmitSuccess(true)
            setSuccessMessage(res?.data?.message || 'Light AMC saved successfully.')
            if (region === 'bihar') {
                rememberCurrentLocation()
                saveBiharAmcLocationSnapshot({
                    district: selectedDistrict,
                    block: selectedBlock,
                    panchayat: selectedPanchayat,
                    ward: selectedWard?.value || getSiteWardNo(lightInfo),
                })
            }
            setTimeout(() => navigate(isEdit ? `${detailsPath}?id=${editId}` : viewPath), 1200)
        } catch (err) {
            setSubmitError(getErrorMessage(err, 'Failed to save AMC.'))
        } finally {
            setIsLocating(false)
            setIsSubmitting(false)
        }
    }

    const photoControl = ({ label, labelHi, hint, file, storedPath, onFile, onClear, onCapture }) => (
        adminChoices && photoSource === 'upload' ? (
            <AdminPhotoUpload
                label={label}
                labelHi={labelHi}
                file={file}
                existingUrl={photoPreview(file, storedPath)}
                onFile={onFile}
                onClear={onClear}
            />
        ) : (
            <CameraCapture
                label={label}
                labelHi={labelHi}
                hint={hint}
                file={file}
                previewDataUrl={photoPreview(file, storedPath)}
                onCapture={onCapture}
                onClear={onClear}
            />
        )
    )

    return (
        <>
            <PageHeader />
            <div className="main-content" style={{ overflow: 'visible' }}>
                <form onSubmit={handleSubmit}>
                    <div className="card mb-0" style={{ overflow: 'visible' }}>
                        <div className="card-body" style={{ overflow: 'visible' }}>
                            <SectionHeading
                                icon={<FiZap size={16} />}
                                title={isEdit ? `${amcConfig.moduleTitle} — Edit AMC` : `${amcConfig.moduleTitle} — Do Field AMC`}
                                subtitle={isEdit
                                    ? `${stateName}: update this visit, including answers and photos`
                                    : `${stateName}: find a ${assetNoun}, complete this quarter’s AMC, and raise a complaint if it is not working`}
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

                            {isEdit && (
                                <div className="alert alert-light border fs-13">
                                    Editing {lightInfo?.unique_id || lightInfo?.pump_id || lightInfo?.ssl_id || 'this visit'}. Change any answer, location, date, or photo, then update.
                                </div>
                            )}
                            {!isEdit && (
                            <>
                            <SectionHeading
                                icon={<FiMapPin size={16} />}
                                title={region === 'bihar' || region === 'up' ? 'Find Light' : `Find ${assetTitle}`}
                                subtitle={
                                    region === 'bihar'
                                        ? 'Location is remembered; pick ward, then select one light in that ward'
                                        : `Select location, then pick one ${assetNoun}`
                                }
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
                                    {region === 'bihar' && (
                                        <div className="col-lg-6">
                                            <label className="form-label">
                                                Ward <span className="text-danger">*</span>
                                            </label>
                                            <SelectDropdown
                                                options={wardOptions}
                                                defaultSelect={
                                                    !selectedPanchayat
                                                        ? locationConfig.selectLocalityFirstText
                                                        : isSitesLoading
                                                            ? 'Loading wards...'
                                                            : wardOptions.length
                                                                ? 'Select Ward'
                                                                : 'No ward data in response'
                                                }
                                                selectedOption={selectedWard}
                                                onSelectOption={handleWardSelect}
                                            />
                                        </div>
                                    )}
                                    <div className="col-lg-6">
                                        <label className="form-label">{assetTitle} <span className="text-danger">*</span></label>
                                        <SelectDropdown
                                            options={lightOptions}
                                            defaultSelect={
                                                !selectedPanchayat
                                                    ? locationConfig.selectLocalityFirstText
                                                    : region === 'bihar' && wardsInData && !selectedWard
                                                        ? 'Select Ward First'
                                                    : isSitesLoading
                                                        ? `Loading ${assetNoun}s...`
                                                        : lightOptions.length
                                                            ? `Select ${assetTitle}`
                                                            : lightsCooldownNote
                                                                ? `No ${assetNoun}s due for AMC yet`
                                                                : `No ${assetNoun}s found`
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
                                        {selectedWard && <span className="badge bg-soft-secondary text-secondary">{selectedWard.label}</span>}
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
                            </>
                            )}

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
                                    {adminChoices && (
                                        <div className="border rounded-3 p-3 mb-3">
                                            <div className="fw-semibold mb-2">Date and time</div>
                                            <SourceChoice
                                                name="amc-datetime-source"
                                                value={dateTimeSource}
                                                onChange={(value) => {
                                                    if (value === 'current') chooseCurrentDateTime()
                                                    else setDateTimeSource('manual')
                                                }}
                                                options={[
                                                    { value: 'current', label: 'Use current date and time' },
                                                    { value: 'manual', label: 'Enter date and time' },
                                                ]}
                                            />
                                            {dateTimeSource === 'current' ? (
                                                <DetailItem label="Saved as" value={`${formatDisplayDate(localTodayISO())}, ${nowTimeValue()}`} />
                                            ) : (
                                                <div className="col-lg-4 col-md-6 px-0">
                                                    <label className="form-label">Visit date and time <span className="text-danger">*</span></label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-control"
                                                        value={amcDate && amcTime ? `${amcDate}T${amcTime}` : ''}
                                                        onChange={(event) => chooseManualDateTime(event.target.value)}
                                                    />
                                                </div>
                                            )}

                                            <div className="fw-semibold mt-3 mb-2">Latitude and longitude</div>
                                            <SourceChoice
                                                name="amc-location-source"
                                                value={locationSource}
                                                onChange={(value) => {
                                                    if (value === 'gps') chooseGpsLocation()
                                                    else chooseManualLocation()
                                                }}
                                                options={[
                                                    { value: 'gps', label: 'Use GPS' },
                                                    { value: 'manual', label: 'Enter latitude and longitude' },
                                                ]}
                                            />
                                            {locationSource === 'manual' ? (
                                                <div className="row g-3">
                                                    <div className="col-lg-4 col-md-6">
                                                        <label className="form-label">Latitude <span className="text-danger">*</span></label>
                                                        <input className="form-control" inputMode="decimal" value={latitudeInput} onChange={(event) => applyAdminLatitude(event.target.value)} />
                                                    </div>
                                                    <div className="col-lg-4 col-md-6">
                                                        <label className="form-label">Longitude <span className="text-danger">*</span></label>
                                                        <input className="form-control" inputMode="decimal" value={longitudeInput} onChange={(event) => applyAdminLongitude(event.target.value)} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <DetailItem
                                                    label="GPS location"
                                                    value={isLocating ? 'Reading GPS...' : (latitudeInput && longitudeInput ? `${latitudeInput}, ${longitudeInput}` : 'GPS will be read when you save')}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {scheduleNote && <div className="alert alert-light border fs-12">{scheduleNote}</div>}
                                    {upStyle && (
                                        <div className="row g-2 mb-3">
                                            <div className="col-lg-3 col-md-6">
                                                {isEdit ? (
                                                    <>
                                                        <label className="form-label">UID</label>
                                                        <input className="form-control" value={uidInput} onChange={(event) => setUidInput(event.target.value)} />
                                                    </>
                                                ) : (
                                                    <DetailItem
                                                        label={<>UID <span className="d-block">यूआईडी · saved with this visit</span></>}
                                                        value={savedUid}
                                                    />
                                                )}
                                            </div>
                                            <div className="col-lg-3 col-md-6">
                                                <DetailItem
                                                    label={<>Financial Year <span className="d-block">वित्तीय वर्ष · saved with this visit</span></>}
                                                    value={savedFinancialYear}
                                                />
                                            </div>
                                            {(region === 'kusumc' || plantKind) && (
                                                <>
                                                    {plantKind && (
                                                        <>
                                                            <div className="col-lg-3 col-md-6">
                                                                {isEdit ? (
                                                                    <>
                                                                        <label className="form-label">Scheme name</label>
                                                                        <input className="form-control" value={schemeName} onChange={(event) => setSchemeName(event.target.value)} />
                                                                    </>
                                                                ) : (
                                                                    <DetailItem label="Scheme name" value={schemeName} />
                                                                )}
                                                            </div>
                                                            <div className="col-lg-3 col-md-6">
                                                                {isEdit ? (
                                                                    <>
                                                                        <label className="form-label">Order no</label>
                                                                        <input className="form-control" value={orderNo} onChange={(event) => setOrderNo(event.target.value)} />
                                                                    </>
                                                                ) : (
                                                                    <DetailItem label="Order no" value={orderNo} />
                                                                )}
                                                            </div>
                                                            <div className="col-lg-3 col-md-6">
                                                                {isEdit ? (
                                                                    <>
                                                                        <label className="form-label">UID date</label>
                                                                        <input className="form-control" value={uidDate} onChange={(event) => setUidDate(event.target.value)} />
                                                                    </>
                                                                ) : (
                                                                    <DetailItem label="UID date" value={uidDate} />
                                                                )}
                                                            </div>
                                                            {(region === 'offgrid' || region === 'ongrid') && (
                                                                <div className="col-lg-3 col-md-6">
                                                                    {isEdit ? (
                                                                        <>
                                                                            <label className="form-label">Installed place</label>
                                                                            <input className="form-control" value={installedPlace} onChange={(event) => setInstalledPlace(event.target.value)} />
                                                                        </>
                                                                    ) : (
                                                                        <DetailItem label="Installed place" value={installedPlace} />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    <div className="col-lg-3 col-md-6">
                                                        {isEdit ? (
                                                            <>
                                                                <label className="form-label">Work order no</label>
                                                                <input className="form-control" value={workOrderNo} onChange={(event) => setWorkOrderNo(event.target.value)} />
                                                            </>
                                                        ) : (
                                                            <DetailItem label="Work order no" value={workOrderNo} />
                                                        )}
                                                    </div>
                                                    <div className="col-lg-3 col-md-6">
                                                        {isEdit ? (
                                                            <>
                                                                <label className="form-label">Capacity</label>
                                                                <input className="form-control" value={capacityInput} onChange={(event) => setCapacityInput(event.target.value)} />
                                                            </>
                                                        ) : (
                                                            <DetailItem label="Capacity" value={capacityInput} />
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

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

                                    {upStyle && (
                                        <>
                                            <hr className="border-dashed" />
                                            <SectionHeading
                                                icon={<FiHelpCircle size={16} />}
                                                title="Questions to Ask Beneficiary"
                                                titleHi="लाभार्थी से पूछे जाने वाले प्रश्न"
                                                subtitle="Feedback and operational history from the beneficiary"
                                                subtitleHi="लाभार्थी से प्रतिक्रिया और संचालन का विवरण"
                                            />
                                            <div className="row g-3 mb-4">
                                                <div className={plantStatus === 'Functional' ? 'col-lg-6 col-12' : 'col-12'}>
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <QuestionText
                                                                number="1"
                                                                en="Is the light currently Functional / Non-Functional / Stolen / Missing from designated place?"
                                                                hi="क्या लाइट वर्तमान में कार्यरत / अकार्यरत / चोरी हो गई / निर्धारित स्थान से गायब है?"
                                                                required
                                                            />
                                                            <div className="d-flex flex-wrap align-items-center gap-3">
                                                                {['Functional', 'Non-Functional', 'Stolen / Missing from Designated Place'].map((opt) => (
                                                                    <div className="form-check" key={opt}>
                                                                        <input
                                                                            className="form-check-input"
                                                                            type="radio"
                                                                            id={`plant-status-${opt.replace(/[^a-zA-Z0-9]/g, '_')}`}
                                                                            name="plant-status"
                                                                            checked={plantStatus === opt}
                                                                            onChange={() => {
                                                                                setPlantStatus(opt)
                                                                                if (opt === 'Functional') return
                                                                                setFunctionalDurationValue('')
                                                                                setFunctionalDurationUnit('Months')
                                                                                setBackupHoursPerDay('')
                                                                                setBreakdownCount('')
                                                                                setLastRepairDate('')
                                                                                setPanelCleaningDone('')
                                                                                setBatteryBankCondition('')
                                                                                setBatteryTerminalCleaned('')
                                                                                setBatteryPetroleumJellyApplied('')
                                                                                setLuminairesCleanedWiring('')
                                                                                setWiringCheckedLooseWires('')
                                                                            }}
                                                                        />
                                                                        <label className="form-check-label fs-13 text-secondary" htmlFor={`plant-status-${opt.replace(/[^a-zA-Z0-9]/g, '_')}`} style={{ cursor: 'pointer' }}>
                                                                            {opt}
                                                                            {OPTION_HI[opt] ? <span className="d-block fs-12 text-muted">{OPTION_HI[opt]}</span> : null}
                                                                        </label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {plantStatus === 'Functional' && (
                                                <>
                                                <div className="col-lg-6 col-12">
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <QuestionText
                                                                number="2"
                                                                en="How long has the light been operating satisfactorily and continuously? (Months / Years)"
                                                                hi="लाइट कितने समय से संतोषजनक और निरंतर चल रही है? (महीने / वर्ष)"
                                                            />
                                                            <div className="row g-2 align-items-center">
                                                                <div className="col-sm-5 col-12">
                                                                    <input
                                                                        type="number"
                                                                        className="form-control"
                                                                        placeholder="जैसे 12"
                                                                        value={functionalDurationValue}
                                                                        onChange={(e) => setFunctionalDurationValue(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-sm-7 col-12 d-flex align-items-center gap-3">
                                                                    {['Months', 'Years'].map((unit) => (
                                                                        <div className="form-check" key={unit}>
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="radio"
                                                                                id={`duration-unit-${unit}`}
                                                                                name="duration-unit"
                                                                                checked={functionalDurationUnit === unit}
                                                                                onChange={() => setFunctionalDurationUnit(unit)}
                                                                            />
                                                                            <label className="form-check-label fs-13 text-secondary" htmlFor={`duration-unit-${unit}`} style={{ cursor: 'pointer' }}>
                                                                                {unit}
                                                                                <span className="d-block fs-12 text-muted">{OPTION_HI[unit]}</span>
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-lg-6 col-12">
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <QuestionText
                                                                number="3"
                                                                en="How many hours of backup are being obtained from the light? (Hours / Day)"
                                                                hi="लाइट से प्रतिदिन कितने घंटे का बैकअप मिल रहा है?"
                                                            />
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="form-control"
                                                                placeholder="घंटे / दिन (जैसे 6)"
                                                                value={backupHoursPerDay}
                                                                onChange={(e) => setBackupHoursPerDay(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-lg-6 col-12">
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <QuestionText
                                                                number="4"
                                                                en="How many times has the light become non-functional after installation?"
                                                                hi="स्थापना के बाद लाइट कितनी बार अकार्यरत हुई?"
                                                            />
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                placeholder="खराबी की संख्या (जैसे 0)"
                                                                value={breakdownCount}
                                                                onChange={(e) => setBreakdownCount(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <RadioQuestion
                                                    number="4.1"
                                                    question="Was petroleum jelly applied to the battery terminals?"
                                                    questionHi="क्या बैटरी टर्मिनल पर पेट्रोलियम जेली लगाई गई?"
                                                    options={['Yes', 'No', 'Not Applicable']}
                                                    value={batteryPetroleumJellyApplied}
                                                    onChange={setBatteryPetroleumJellyApplied}
                                                />

                                                <div className="col-lg-6 col-12">
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <QuestionText
                                                                number="5"
                                                                en="When was the light previously repaired?"
                                                                hi="लाइट की पिछली मरम्मत कब हुई थी?"
                                                            />
                                                            <input
                                                                type="date"
                                                                className="form-control"
                                                                value={lastRepairDate}
                                                                onChange={(e) => setLastRepairDate(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                </>
                                                )}
                                            </div>

                                            {plantStatus === 'Functional' && (
                                            <>
                                            <hr className="border-dashed" />
                                            <SectionHeading
                                                icon={<FiTool size={16} />}
                                                title="Service Details Performed by Firm Representative"
                                                titleHi="फर्म प्रतिनिधि द्वारा किया गया सर्विस विवरण"
                                                subtitle="Maintenance and technical checks carried out on site"
                                                subtitleHi="साइट पर किया गया रखरखाव और तकनीकी जाँच"
                                            />
                                            <div className="row g-3 mb-4">
                                                <RadioQuestion
                                                    number="1"
                                                    question="Was cleaning of the solar panel(s) carried out?"
                                                    questionHi="क्या सोलर पैनल की सफाई की गई?"
                                                    options={['Yes', 'No']}
                                                    value={panelCleaningDone}
                                                    onChange={setPanelCleaningDone}
                                                />
                                                <RadioQuestion
                                                    number="2"
                                                    question="Battery bank condition"
                                                    questionHi="बैटरी बैंक की स्थिति"
                                                    options={[
                                                        'Satisfactory (Full backup received)',
                                                        'Unsatisfactory',
                                                        'Not Applicable',
                                                    ]}
                                                    value={batteryBankCondition}
                                                    onChange={setBatteryBankCondition}
                                                />
                                                <RadioQuestion
                                                    number="3"
                                                    question="Were the battery terminals cleaned?"
                                                    questionHi="क्या बैटरी टर्मिनल साफ किए गए?"
                                                    options={['Yes', 'No', 'Not Applicable']}
                                                    value={batteryTerminalCleaned}
                                                    onChange={setBatteryTerminalCleaned}
                                                />
                                                <RadioQuestion
                                                    number="4"
                                                    question="Were all luminaires cleaned and wires properly arranged?"
                                                    questionHi="क्या सभी ल्यूमिनेयर साफ किए गए और तार ठीक से व्यवस्थित किए गए?"
                                                    options={['Yes', 'No']}
                                                    value={luminairesCleanedWiring}
                                                    onChange={setLuminairesCleanedWiring}
                                                />
                                                <RadioQuestion
                                                    number="5"
                                                    question="Was the light wiring checked and loose/exposed wires properly fixed?"
                                                    questionHi="क्या लाइट की वायरिंग जाँची गई और ढीले / खुले तार ठीक किए गए?"
                                                    options={['Yes', 'No']}
                                                    value={wiringCheckedLooseWires}
                                                    onChange={setWiringCheckedLooseWires}
                                                />
                                            </div>
                                            </>
                                            )}
                                        </>
                                    )}

                                    <hr className="border-dashed" />
                                    {upStyle ? (
                                        <>
                                            <SectionHeading
                                                icon={<FiPaperclip size={16} />}
                                                title="Documentation & Photos"
                                                titleHi="दस्तावेज़ और फोटो"
                                                subtitle="Capture or upload the signed visit sheet and light photos"
                                                subtitleHi="हस्ताक्षरित विजिट शीट और लाइट की फोटो लें"
                                            />
                                            {adminChoices && (
                                                <SourceChoice
                                                    name="amc-photo-source"
                                                    value={photoSource}
                                                    onChange={setPhotoSource}
                                                    options={[
                                                        { value: 'camera', label: 'Camera with GPS' },
                                                        { value: 'upload', label: 'Upload photos' },
                                                    ]}
                                                />
                                            )}
                                            <div className="row g-3 mb-4">
                                                <div className="col-lg-4 col-md-6 col-12">
                                                    {photoControl({
                                                        label: 'Upload Form (Visit Slip)',
                                                        labelHi: 'विजिट स्लिप अपलोड करें',
                                                        hint: 'Capture photo of the signed visit slip / हस्ताक्षरित विजिट स्लिप की फोटो लें',
                                                        file: formImage,
                                                        storedPath: keptPhotos.slip,
                                                        onFile: setFormImage,
                                                        onCapture: (file) => setFormImage(file),
                                                        onClear: () => {
                                                            setFormImage(null)
                                                            setKeptPhotos((current) => ({ ...current, slip: '' }))
                                                        },
                                                    })}
                                                </div>
                                                <div className="col-lg-4 col-md-6 col-12">
                                                    {photoControl({
                                                        label: 'Light Photo 1',
                                                        labelHi: 'लाइट फोटो 1',
                                                        hint: 'Capture first photo of the light / लाइट की पहली फोटो लें',
                                                        file: image1,
                                                        storedPath: keptPhotos.photo1,
                                                        onFile: setImage1,
                                                        onCapture: (file, coords) => {
                                                            setImage1(file)
                                                            setImage1Coords(coords)
                                                            if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                        },
                                                        onClear: () => {
                                                            setImage1(null)
                                                            setImage1Coords(null)
                                                            setKeptPhotos((current) => ({ ...current, photo1: '' }))
                                                        },
                                                    })}
                                                </div>
                                                <div className="col-lg-4 col-md-6 col-12">
                                                    {photoControl({
                                                        label: 'Light Photo 2',
                                                        labelHi: 'लाइट फोटो 2',
                                                        hint: 'Capture second photo of the light / लाइट की दूसरी फोटो लें',
                                                        file: image2,
                                                        storedPath: keptPhotos.photo2,
                                                        onFile: setImage2,
                                                        onCapture: (file, coords) => {
                                                            setImage2(file)
                                                            setImage2Coords(coords)
                                                            if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                        },
                                                        onClear: () => {
                                                            setImage2(null)
                                                            setImage2Coords(null)
                                                            setKeptPhotos((current) => ({ ...current, photo2: '' }))
                                                        },
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <SectionHeading icon={<FiPaperclip size={16} />} title="Documentation" subtitle="Capture 2 photos from camera — latitude and longitude will be printed on each image" />
                                            {adminChoices && (
                                                <SourceChoice
                                                    name="amc-photo-source-bihar"
                                                    value={photoSource}
                                                    onChange={setPhotoSource}
                                                    options={[
                                                        { value: 'camera', label: 'Camera with GPS' },
                                                        { value: 'upload', label: 'Upload photos' },
                                                    ]}
                                                />
                                            )}
                                            <div className="row g-3 mb-3">
                                                <div className="col-lg-6">
                                                    {photoControl({
                                                        label: 'Photo 1',
                                                        hint: 'Open camera and capture',
                                                        file: image1,
                                                        storedPath: keptPhotos.photo1,
                                                        onFile: setImage1,
                                                        onCapture: (file, coords) => {
                                                            setImage1(file)
                                                            setImage1Coords(coords)
                                                            if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                        },
                                                        onClear: () => {
                                                            setImage1(null)
                                                            setImage1Coords(null)
                                                            setKeptPhotos((current) => ({ ...current, photo1: '' }))
                                                        },
                                                    })}
                                                </div>
                                                <div className="col-lg-6">
                                                    {photoControl({
                                                        label: 'Photo 2',
                                                        hint: 'Open camera and capture',
                                                        file: image2,
                                                        storedPath: keptPhotos.photo2,
                                                        onFile: setImage2,
                                                        onCapture: (file, coords) => {
                                                            setImage2(file)
                                                            setImage2Coords(coords)
                                                            if (submitError.startsWith('Lat long issue')) setSubmitError('')
                                                        },
                                                        onClear: () => {
                                                            setImage2(null)
                                                            setImage2Coords(null)
                                                            setKeptPhotos((current) => ({ ...current, photo2: '' }))
                                                        },
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}

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
                                    {isEdit && (
                                        <div className="mb-3">
                                            <label className="form-label">Remarks</label>
                                            <textarea className="form-control" rows={2} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="d-flex justify-content-end gap-2 pt-4 border-top">
                                <button type="button" className="btn btn-light mt-4" onClick={() => navigate(isEdit ? `${detailsPath}?id=${editId}` : viewPath)} disabled={isSubmitting}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2" disabled={isSubmitting}>
                                    {isSubmitting ? <FiLoader className="spin" size={14} /> : <FiSend size={14} />}
                                    {isSubmitting ? 'Saving...' : (isEdit ? 'Update AMC' : 'Submit AMC')}
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