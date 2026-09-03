/* eslint-disable react/prop-types */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    FiX,
    FiUploadCloud,
    FiMapPin,
    FiCalendar,
    FiPaperclip,
    FiCheckCircle,
    FiLoader,
    FiList
} from 'react-icons/fi'

import SelectDropdown from '@/components/shared/SelectDropdown'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import externalApi from '../../../../api/externalApi'
import { getCompanyId, getUser } from '../../../../utils/auth'
import localApi from '../../../../api/localApi'
import { app, external } from '../../../../api/routes'



const toOptions = (arr = []) => {
    if (!Array.isArray(arr)) {
        return []
    }

    return arr
        .filter(
            (item) =>
                item !== null &&
                item !== undefined &&
                String(item).trim() !== ''
        )
        .map((item) => ({
            value: String(item),
            label: String(item)
        }))
}


// =====================================================
// ERROR MESSAGE HELPER
// =====================================================

const getErrorMessage = (
    err,
    fallback = "Something went wrong. Please try again."
) => {
    const data = err?.response?.data

    if (typeof data === 'string' && data.trim()) {
        return data
    }

    if (data?.message) {
        return data.message
    }

    if (data?.error) {
        return typeof data.error === 'string'
            ? data.error
            : fallback
    }

    if (Array.isArray(data?.errors) && data.errors.length) {
        const first = data.errors[0]

        if (typeof first === 'string') {
            return first
        }
    }

    if (data?.errors && typeof data.errors === 'object') {
        const firstKey = Object.keys(data.errors)[0]
        const firstVal = data.errors[firstKey]

        if (Array.isArray(firstVal) && firstVal.length) {
            return firstVal[0]
        }

        if (typeof firstVal === 'string') {
            return firstVal
        }
    }

    if (err?.message === 'Network Error') {
        return "Network error. Please check your internet connection."
    }

    if (err?.code === 'ECONNABORTED') {
        return "Request timed out. Please try again."
    }

    return fallback
}


// =====================================================
// SECTION HEADING
// =====================================================

const SectionHeading = ({
    icon,
    title,
    subtitle
}) => (
    <div className="d-flex align-items-center gap-3 mb-4">

        <div className="avatar-text avatar-md bg-soft-primary text-primary icon flex-shrink-0">
            {icon}
        </div>

        <div>
            <h6 className="fw-bold text-dark mb-0">
                {title}
            </h6>

            {subtitle && (
                <p className="fs-12 text-muted mb-0">
                    {subtitle}
                </p>
            )}
        </div>

    </div>
)


// =====================================================
// DROPZONE
// =====================================================

const Dropzone = ({
    multiple = false,
    accept,
    onFiles,
    label,
    hint
}) => {

    const inputRef = useRef(null)

    const [isDragging, setIsDragging] =
        useState(false)


    const handleFiles = (fileList) => {

        const files = Array.from(
            fileList || []
        )

        if (files.length) {
            onFiles(files)
        }
    }


    return (
        <div
            role="button"
            tabIndex={0}

            onClick={() =>
                inputRef.current?.click()
            }

            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    inputRef.current?.click()
                }
            }}

            onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
            }}

            onDragLeave={() =>
                setIsDragging(false)
            }

            onDrop={(e) => {

                e.preventDefault()

                setIsDragging(false)

                handleFiles(
                    e.dataTransfer.files
                )
            }}

            className="d-flex flex-column align-items-center justify-content-center text-center rounded-3 p-3"

            style={{
                border: `2px dashed ${
                    isDragging
                        ? 'var(--bs-primary, #3454d1)'
                        : '#d7dbe4'
                }`,

                background: isDragging
                    ? 'rgba(52,84,209,0.05)'
                    : '#fafbfc',

                cursor: 'pointer',

                transition:
                    'all .15s ease-in-out',

                minHeight: '110px'
            }}
        >

            <input
                ref={inputRef}
                type="file"
                className="d-none"

                multiple={multiple}

                accept={accept}

                onChange={(e) => {

                    handleFiles(
                        e.target.files
                    )

                    e.target.value = ""
                }}
            />

            <div className="avatar-text avatar-md bg-soft-primary text-primary icon mb-2">

                <FiUploadCloud size={16} />

            </div>

            <div className="fs-12 fw-semibold text-dark mb-1">

                {label}

            </div>

            <div className="fs-11 text-muted">

                {hint}

            </div>

        </div>
    )
}


// =====================================================
// FILE BADGE
// =====================================================

const FileBadge = ({
    file,
    onRemove
}) => (

    <span className="badge bg-soft-success text-success d-inline-flex align-items-center gap-2 py-2 px-3 rounded-pill fw-normal">

        <FiCheckCircle size={12} />

        <span
            className="fs-12 text-truncate"
            style={{
                maxWidth: '160px'
            }}
            title={file?.name || ''}
        >
            {file?.name || 'File'}
        </span>

        <span className="fs-11 opacity-75">

            {file?.size
                ? `${(
                    file.size / 1024
                ).toFixed(0)}KB`
                : ''}

        </span>

        <button
            type="button"
            onClick={onRemove}

            className="btn btn-sm p-0 border-0 bg-transparent d-flex align-items-center text-success"

            style={{
                lineHeight: 0
            }}
        >
            <FiX size={13} />
        </button>

    </span>
)


// =====================================================
// SITE BADGE
// =====================================================

const SiteBadge = ({
    site,
    onRemove
}) => {

    const status = String(
        site?.site_status || ''
    ).toLowerCase()


    const statusClass =
        status === 'completed'
            ? 'bg-soft-success text-success'
            : status === 'pending'
                ? 'bg-soft-warning text-warning'
                : status === 'rejected'
                    ? 'bg-soft-danger text-danger'
                    : 'bg-soft-secondary text-secondary'


    return (

        <div
            className="position-relative bg-white border rounded-3 px-3 py-2"

            style={{
                minWidth: '150px'
            }}
        >

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
                    lineHeight: 0
                }}
            >

                <FiX size={12} />

            </button>


            <div className="fs-11 text-muted mb-1">

                ID: {site?.unique_id || site?.id || '-'}

            </div>


            <div className="d-flex align-items-center justify-content-between gap-2">

                <span className="fs-12 fw-semibold text-dark">

                    Pole {site?.pole_no || '-'}

                </span>


                <span
                    className={`badge ${statusClass} rounded-pill fs-10 text-capitalize`}
                >
                    {site?.site_status || 'Pending'}
                </span>

            </div>

        </div>
    )
}


// =====================================================
// MAIN COMPONENT
// =====================================================

const UploadForm = ({
    isModal = false,
    onSuccess = null,
    onCancel = null
}) => {

    const navigate = useNavigate()


    // =================================================
    // LOCATION STATE
    // =================================================

    const [
        selectedDistrict,
        setSelectedDistrict
    ] = useState(null)

    const [
        selectedBlock,
        setSelectedBlock
    ] = useState(null)

    const [
        selectedPanchayat,
        setSelectedPanchayat
    ] = useState(null)


    const [
        districtOptions,
        setDistrictOptions
    ] = useState([])

    const [
        blockOptions,
        setBlockOptions
    ] = useState([])

    const [
        panchayatOptions,
        setPanchayatOptions
    ] = useState([])


    const [
        isDistrictLoading,
        setIsDistrictLoading
    ] = useState(false)

    const [
        isBlockLoading,
        setIsBlockLoading
    ] = useState(false)

    const [
        isPanchayatLoading,
        setIsPanchayatLoading
    ] = useState(false)


    // =================================================
    // AMC PERIOD
    // =================================================

    const [
        startMonth,
        setStartMonth
    ] = useState("")

    const [
        endMonth,
        setEndMonth
    ] = useState("")


    // =================================================
    // SITE DETAILS
    // =================================================

    const [
        siteDetails,
        setSiteDetails
    ] = useState([])

    const [
        selectedSiteIds,
        setSelectedSiteIds
    ] = useState([])

    const [
        siteSummary,
        setSiteSummary
    ] = useState(null)

    const [
        isSitesLoading,
        setIsSitesLoading
    ] = useState(false)

    const [
        sitesError,
        setSitesError
    ] = useState("")


    // =================================================
    // DOCUMENTS
    // =================================================

    const [
        documents,
        setDocuments
    ] = useState([])


    const addDocuments = (files) => {

        if (!files?.length) {
            return
        }

        setDocuments((prev) => [
            ...prev,
            ...files
        ])
    }


    const removeDocument = (index) => {

        setDocuments((prev) =>
            prev.filter(
                (_, i) => i !== index
            )
        )
    }


    // =================================================
    // INVOICE
    // =================================================

    const [
        invoice,
        setInvoice
    ] = useState(null)


    const addInvoice = (files) => {

        if (!files?.length) {
            return
        }

        setInvoice(files[0])
    }


    const removeInvoice = () => {

        setInvoice(null)

    }


    // =================================================
    // SUBMIT STATE
    // =================================================

    const [
        isSubmitting,
        setIsSubmitting
    ] = useState(false)

    const [
        submitError,
        setSubmitError
    ] = useState("")

    const [
        submitSuccess,
        setSubmitSuccess
    ] = useState(false)

    const [
        successMessage,
        setSuccessMessage
    ] = useState("")


    // =================================================
    // FETCH DISTRICTS
    // =================================================

    useEffect(() => {

        const fetchDistricts = async () => {

            setIsDistrictLoading(true)

            setSubmitError("")


            try {

                const res =
                    await externalApi.get(
                        external.ssl.district('up')
                    )


                console.log(
                    "DISTRICT API RESPONSE:",
                    res?.data
                )


                const list =
                    Array.isArray(
                        res?.data?.data
                    )
                        ? res.data.data
                        : []


                const options =
                    list
                        .filter(
                            (item) =>
                                item?.district !==
                                    null &&
                                item?.district !==
                                    undefined &&
                                String(
                                    item.district
                                ).trim() !== ''
                        )
                        .map((item) => ({
                            value: String(
                                item.district
                            ),
                            label: String(
                                item.district
                            )
                        }))


                console.log(
                    "DISTRICT OPTIONS:",
                    options
                )


                setDistrictOptions(
                    options
                )

            } catch (err) {

                console.error(
                    'Failed to fetch districts:',
                    err
                )

                setDistrictOptions([])

                setSubmitError(
                    getErrorMessage(
                        err,
                        "Failed to load districts. Please refresh and try again."
                    )
                )

            } finally {

                setIsDistrictLoading(
                    false
                )

            }
        }


        fetchDistricts()

    }, [])


    // =================================================
    // FETCH BLOCKS
    // =================================================

    useEffect(() => {

        if (!selectedDistrict) {

            setBlockOptions([])

            return
        }


        const fetchBlocks = async () => {

            setIsBlockLoading(true)

            setBlockOptions([])

            try {

                const res =
                    await externalApi.get(
                        external.ssl.blocks('up'),
                        {
                            params: {
                                district:
                                    selectedDistrict.value
                            }
                        }
                    )


                console.log(
                    "BLOCK API RESPONSE:",
                    res?.data
                )


                const list =
                    Array.isArray(
                        res?.data?.data
                    )
                        ? res.data.data
                        : []


                const options =
                    list
                        .filter(
                            (item) =>
                                item?.block !==
                                    null &&
                                item?.block !==
                                    undefined &&
                                String(
                                    item.block
                                ).trim() !== ''
                        )
                        .map((item) => ({
                            value: String(
                                item.block
                            ),
                            label: String(
                                item.block
                            )
                        }))


                console.log(
                    "BLOCK OPTIONS:",
                    options
                )


                setBlockOptions(
                    options
                )

            } catch (err) {

                console.error(
                    'Failed to fetch blocks:',
                    err
                )

                setBlockOptions([])

                setSubmitError(
                    getErrorMessage(
                        err,
                        "Failed to load blocks. Please try again."
                    )
                )

            } finally {

                setIsBlockLoading(
                    false
                )

            }
        }


        fetchBlocks()

    }, [selectedDistrict])


    // =================================================
    // FETCH PANCHAYATS
    // =================================================

    useEffect(() => {

        if (
            !selectedDistrict ||
            !selectedBlock
        ) {

            setPanchayatOptions([])

            return
        }


        const fetchPanchayats = async () => {

            setIsPanchayatLoading(true)

            setPanchayatOptions([])


            try {

                const res =
                    await externalApi.get(
                        external.ssl.panchayat('up'),
                        {
                            params: {
                                district:
                                    selectedDistrict.value,

                                block:
                                    selectedBlock.value
                            }
                        }
                    )


                console.log(
                    "PANCHAYAT API RESPONSE:",
                    res?.data
                )


                const list =
                    Array.isArray(
                        res?.data?.data
                    )
                        ? res.data.data
                        : []

                


               const options =
    list
        .filter(
            (item) =>
                item?.village !== null &&
                item?.village !== undefined &&
                String(item.village).trim() !== ''
        )
        .map((item) => ({
            value: String(item.village),
            label: String(item.village)
        }))

setPanchayatOptions(options)

                console.log(
                    "PANCHAYAT OPTIONS:",
                    options
                )


                setPanchayatOptions(
                    options
                )

            } catch (err) {

                console.error(
                    'Failed to fetch panchayats:',
                    err
                )

                setPanchayatOptions([])

                setSubmitError(
                    getErrorMessage(
                        err,
                        "Failed to load panchayats. Please try again."
                    )
                )

            } finally {

                setIsPanchayatLoading(
                    false
                )

            }
        }


        fetchPanchayats()

    }, [
        selectedDistrict,
        selectedBlock
    ])


    // =================================================
    // FETCH SITE DETAILS
    // =================================================

    useEffect(() => {

        if (
            !selectedDistrict ||
            !selectedBlock ||
            !selectedPanchayat ||
            !startMonth ||
            !endMonth
        ) {

            setSiteDetails([])

            setSelectedSiteIds([])

            setSiteSummary(null)

            setSitesError("")

            return
        }


        const fetchSiteDetails =
            async () => {

                setIsSitesLoading(
                    true
                )

                setSitesError("")


                try {

                    const res =
                        await externalApi.get(
                            external.ssl.details('up'),
                            {
                                params: {

                                    district:
                                        selectedDistrict.value,

                                    block:
                                        selectedBlock.value,

                                    panchayat:
                                        selectedPanchayat.value,

                                    start_month_year:
                                        startMonth,

                                    end_month_year:
                                        endMonth
                                }
                            }
                        )


                    console.log(
                        "SITE DETAILS API RESPONSE:",
                        res?.data
                    )


                    const list =
                        Array.isArray(
                            res?.data?.data
                        )
                            ? res.data.data
                            : []


                    console.log(
                        "SITE LIST:",
                        list
                    )


                    setSiteDetails(
                        list
                    )


                    setSelectedSiteIds(
                        list
                            .filter(
                                (item) =>
                                    item?.id !==
                                    null &&
                                    item?.id !==
                                    undefined
                            )
                            .map(
                                (item) =>
                                    item.id
                            )
                    )


                    setSiteSummary(
                        res?.data?.summary ||
                        null
                    )

                } catch (err) {

                    console.error(
                        'Failed to fetch site details:',
                        err
                    )

                    setSiteDetails([])

                    setSelectedSiteIds([])

                    setSiteSummary(null)

                    setSitesError(
                        getErrorMessage(
                            err,
                            "Failed to load site details. Please try again."
                        )
                    )

                } finally {

                    setIsSitesLoading(
                        false
                    )

                }
            }


        fetchSiteDetails()

    }, [
        selectedDistrict,
        selectedBlock,
        selectedPanchayat,
        startMonth,
        endMonth
    ])


    // =================================================
    // DISTRICT SELECT
    // =================================================

    const handleDistrictSelect =
        (option) => {

            setSelectedDistrict(
                option
            )

            setSelectedBlock(null)

            setSelectedPanchayat(null)

            setBlockOptions([])

            setPanchayatOptions([])

            setSiteDetails([])

            setSelectedSiteIds([])

            setSiteSummary(null)

            setSitesError("")
        }


    // =================================================
    // BLOCK SELECT
    // =================================================

    const handleBlockSelect =
        (option) => {

            setSelectedBlock(
                option
            )

            setSelectedPanchayat(null)

            setPanchayatOptions([])

            setSiteDetails([])

            setSelectedSiteIds([])

            setSiteSummary(null)

            setSitesError("")
        }


    // =================================================
    // PANCHAYAT SELECT
    // =================================================

    const handlePanchayatSelect =
        (option) => {

            setSelectedPanchayat(
                option
            )

        }


    // =================================================
    // REMOVE SITE
    // =================================================

    const removeSite = (id) => {

        setSelectedSiteIds(
            (prev) =>
                prev.filter(
                    (sid) =>
                        sid !== id
                )
        )
    }


    // =================================================
    // SELECTED SITES
    // =================================================

    const selectedSites =
        siteDetails.filter(
            (site) =>
                selectedSiteIds.includes(
                    site?.id
                )
        )


    // =================================================
    // SUBMIT
    // =================================================

    const handleSubmit = async (e) => {

        e.preventDefault()


        setSubmitError("")

        setSubmitSuccess(false)

        setSuccessMessage("")


        const companyId =
            getCompanyId()

        const user =
            getUser()

        const userId =
            user?.id


        // ---------------------------------------------
        // COMPANY CHECK
        // ---------------------------------------------

        if (!companyId) {

            setSubmitError(
                "Company information missing. Please login again."
            )

            return
        }


        // ---------------------------------------------
        // USER CHECK
        // ---------------------------------------------

        if (!userId) {

            setSubmitError(
                "User information missing. Please login again."
            )

            return
        }


        // ---------------------------------------------
        // REQUIRED FIELD CHECK
        // ---------------------------------------------

        if (
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


        // ---------------------------------------------
        // SITE CHECK
        // ---------------------------------------------

        if (
            selectedSiteIds.length === 0
        ) {

            setSubmitError(
                "Please select at least one site before submitting."
            )

            return
        }


        // =================================================
        // FORM DATA
        // =================================================

        const formData =
            new FormData()


        // ---------------------------------------------
        // AMC DOCUMENTS
        // ---------------------------------------------

        documents.forEach(
            (file) => {

                formData.append(
                    "amc_document",
                    file
                )

            }
        )


        // ---------------------------------------------
        // INVOICE
        // ---------------------------------------------

        if (invoice) {

            formData.append(
                "invoice_document",
                invoice
            )

        }


        // ---------------------------------------------
        // LOCATION
        // ---------------------------------------------

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


        // ---------------------------------------------
        // AMC PERIOD
        // ---------------------------------------------

        formData.append(
            "start_month_year",
            startMonth
        )


        formData.append(
            "end_month_year",
            endMonth
        )


        // ---------------------------------------------
        // COMPANY
        // ---------------------------------------------

        formData.append(
            "company_id",
            companyId
        )


        // ---------------------------------------------
        // USER
        // ---------------------------------------------

        formData.append(
            "user_id",
            userId
        )


        selectedSites.forEach(
            (site) => {

                formData.append(
                    "ssl_id[]",
                    site.id
                )


                formData.append(
                    "pole_no[]",
                    site?.pole_no || ""
                )

            }
        )


        // =================================================
        // DEBUG
        // =================================================

        console.log(
            "================================="
        )

        console.log(
            "SELECTED DISTRICT:",
            selectedDistrict?.value
        )

        console.log(
            "SELECTED BLOCK:",
            selectedBlock?.value
        )

        console.log(
            "SELECTED PANCHAYAT:",
            selectedPanchayat?.value
        )

        console.log(
            "START MONTH:",
            startMonth
        )

        console.log(
            "END MONTH:",
            endMonth
        )

        console.log(
            "SELECTED SITES:",
            selectedSites
        )

        console.log(
            "================================="
        )


        for (
            const [
                key,
                value
            ] of formData.entries()
        ) {

            console.log(
                "FORM DATA:",
                key,
                value
            )

        }


        // =================================================
        // SUBMIT API
        // =================================================

        setIsSubmitting(true)


        try {

            const res =
                await localApi.post(
                    app.ssl.create('up'),

                    formData,

                    {
                        headers: {
                            "Content-Type":
                                undefined
                        }
                    }
                )


            console.log(
                "SUBMIT RESPONSE:",
                res?.data
            )


            const responseData =
                res?.data?.data ||
                null


            const responseMessage =
                res?.data?.message ||
                "AMC document uploaded successfully."


            setSubmitSuccess(
                true
            )


            setSuccessMessage(
                responseMessage
            )


            // ---------------------------------------------
            // MODAL SUCCESS
            // ---------------------------------------------

            if (
                isModal &&
                onSuccess
            ) {

                setTimeout(
                    () => {

                        onSuccess(
                            responseData
                        )

                    },
                    900
                )

            }

            // ---------------------------------------------
            // PAGE SUCCESS
            // ---------------------------------------------

            else {

                setTimeout(
                    () => {

                        navigate(
                            "/uttarpradesh/ssl-amc/view-document"
                        )

                    },
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

            setIsSubmitting(
                false
            )

        }
    }


    // =================================================
    // CANCEL
    // =================================================

    const handleCancel = () => {

        setSelectedDistrict(null)

        setSelectedBlock(null)

        setSelectedPanchayat(null)

        setDistrictOptions(
            districtOptions
        )

        setBlockOptions([])

        setPanchayatOptions([])

        setStartMonth("")

        setEndMonth("")

        setDocuments([])

        setInvoice(null)

        setSiteDetails([])

        setSelectedSiteIds([])

        setSiteSummary(null)

        setSitesError("")

        setSubmitError("")

        setSubmitSuccess(false)

        setSuccessMessage("")


        if (
            isModal &&
            onCancel
        ) {

            onCancel()

        }
    }


    // =================================================
    // FORM BODY
    // =================================================

    const formBody = (

        <div className="card mb-0">

            <div className="card-body">


                {/* =========================================
                    SUCCESS MESSAGE
                ========================================= */}

                {submitSuccess && (

                    <div
                        className="alert alert-success d-flex align-items-center gap-2"
                        role="alert"
                    >

                        <FiCheckCircle />

                        {successMessage}

                    </div>
                )}


                {/* =========================================
                    ERROR MESSAGE
                ========================================= */}

                {submitError && (

                    <div
                        className="alert alert-danger"
                        role="alert"
                    >

                        {submitError}

                    </div>
                )}


                {/* =========================================
                    LOCATION DETAILS
                ========================================= */}

                <SectionHeading

                    icon={
                        <FiMapPin size={16} />
                    }

                    title="Location Details"

                    subtitle="Select the district, block and panchayat"

                />


                <div className="row">


                    {/* -------------------------------------
                        DISTRICT
                    ------------------------------------- */}

                    <div className="col-lg-4 col-md-6">

                        <label className="form-label">

                            District

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <SelectDropdown

                            options={
                                districtOptions
                            }

                            defaultSelect={
                                isDistrictLoading
                                    ? "Loading districts..."
                                    : "Select District"
                            }

                            selectedOption={
                                selectedDistrict
                            }

                            onSelectOption={
                                handleDistrictSelect
                            }

                        />

                    </div>


                    {/* -------------------------------------
                        BLOCK
                    ------------------------------------- */}

                    <div className="col-lg-4 col-md-6">

                        <label className="form-label">

                            Block

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <SelectDropdown

                            options={
                                blockOptions
                            }

                            defaultSelect={

                                !selectedDistrict
                                    ? "Select District First"

                                    : isBlockLoading
                                        ? "Loading blocks..."

                                        : "Select Block"

                            }

                            selectedOption={
                                selectedBlock
                            }

                            onSelectOption={
                                handleBlockSelect
                            }

                        />

                    </div>


                    {/* -------------------------------------
                        PANCHAYAT
                    ------------------------------------- */}

                    <div className="col-lg-4 col-md-6">

                        <label className="form-label">

                            Panchayat

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <SelectDropdown

                            options={
                                panchayatOptions
                            }

                            defaultSelect={

                                !selectedBlock
                                    ? "Select Block First"

                                    : isPanchayatLoading
                                        ? "Loading panchayats..."

                                        : "Select Panchayat"

                            }

                            selectedOption={
                                selectedPanchayat
                            }

                            onSelectOption={
                                handlePanchayatSelect
                            }

                        />

                    </div>

                </div>


                <hr className="border-dashed" />


                {/* =========================================
                    AMC PERIOD
                ========================================= */}

                <SectionHeading

                    icon={
                        <FiCalendar size={16} />
                    }

                    title="AMC Period"

                    subtitle="Billing month & year this document belongs to"

                />


                <div className="row g-3">


                    {/* -------------------------------------
                        START MONTH
                    ------------------------------------- */}

                    <div className="col-lg-4 col-md-6">

                        <label className="form-label">

                            Start Month / Year

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <input

                            type="month"

                            className="form-control"

                            value={
                                startMonth
                            }

                            onChange={(e) =>
                                setStartMonth(
                                    e.target.value
                                )
                            }

                        />

                    </div>


                    {/* -------------------------------------
                        END MONTH
                    ------------------------------------- */}

                    <div className="col-lg-4 col-md-6">

                        <label className="form-label">

                            End Month / Year

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <input

                            type="month"

                            className="form-control"

                            value={
                                endMonth
                            }

                            min={
                                startMonth ||
                                undefined
                            }

                            onChange={(e) =>
                                setEndMonth(
                                    e.target.value
                                )
                            }

                        />

                    </div>

                </div>


                {/* =========================================
                    SITE DETAILS
                ========================================= */}

                {(
                    isSitesLoading ||
                    sitesError ||
                    siteDetails.length > 0 ||
                    siteSummary
                ) && (

                    <>

                        <hr className="border-dashed" />


                        <SectionHeading

                            icon={
                                <FiList size={16} />
                            }

                            title="Site Details"

                            subtitle="Pending sites for the selected location & period"

                        />


                        {/* Loading */}

                        {isSitesLoading && (

                            <div className="d-flex align-items-center gap-2 text-muted fs-13 mb-2">

                                <FiLoader
                                    className="spin"
                                    size={14}
                                />

                                Loading site details...

                            </div>

                        )}


                        {/* Error */}

                        {!isSitesLoading &&
                            sitesError && (

                                <div className="alert alert-warning fs-13 py-2 mb-2">

                                    {sitesError}

                                </div>

                            )}


                        {/* Sites */}

                        {!isSitesLoading &&
                            !sitesError &&
                            selectedSites.length > 0 && (

                                <div
                                    className="border rounded-3 p-3 mb-1"

                                    style={{
                                        maxHeight:
                                            '260px',

                                        overflowY:
                                            'auto'
                                    }}
                                >

                                    <div className="d-flex flex-wrap gap-3">

                                        {selectedSites.map(
                                            (site) => (

                                                <SiteBadge

                                                    key={
                                                        site.id
                                                    }

                                                    site={
                                                        site
                                                    }

                                                    onRemove={() =>
                                                        removeSite(
                                                            site.id
                                                        )
                                                    }

                                                />

                                            )
                                        )}

                                    </div>

                                </div>

                            )}


                        {/* All Removed */}

                        {!isSitesLoading &&
                            !sitesError &&
                            siteDetails.length > 0 &&
                            selectedSites.length === 0 && (

                                <div className="fs-13 text-muted mb-1">

                                    All sites removed.
                                    Change a filter above
                                    to reload sites.

                                </div>

                            )}


                        {/* No Sites */}

                        {!isSitesLoading &&
                            !sitesError &&
                            siteDetails.length === 0 && (

                                <div className="fs-13 text-muted mb-1">

                                    No pending sites for
                                    this location & period.

                                </div>

                            )}

                    </>

                )}


                <hr className="border-dashed" />


                {/* =========================================
                    DOCUMENT UPLOAD
                ========================================= */}

                <SectionHeading

                    icon={
                        <FiPaperclip />
                    }

                    title="Upload Documents"

                    subtitle="AMC documents are required, invoice is optional"

                />


                <div className="row mb-2">


                    {/* -------------------------------------
                        AMC DOCUMENT
                    ------------------------------------- */}

                    <div className="col-lg-6">

                        <label className="form-label">

                            AMC Documents

                            <span className="text-danger">
                                *
                            </span>

                        </label>


                        <Dropzone

                            multiple

                            accept=".pdf,.jpg,.jpeg,.png"

                            onFiles={
                                addDocuments
                            }

                            label="Click to upload or drag & drop"

                            hint="PDF, JPG or PNG — multiple files allowed"

                        />


                        {documents.length > 0 && (

                            <div className="d-flex flex-wrap gap-2 mt-3">

                                {documents.map(
                                    (
                                        file,
                                        index
                                    ) => (

                                        <FileBadge

                                            key={`${file.name}-${index}`}

                                            file={
                                                file
                                            }

                                            onRemove={() =>
                                                removeDocument(
                                                    index
                                                )
                                            }

                                        />

                                    )
                                )}

                            </div>

                        )}

                    </div>


                    {/* -------------------------------------
                        INVOICE
                    ------------------------------------- */}

                    <div className="col-lg-6">

                        <label className="form-label">

                            Invoice

                            <span className="fs-12 text-muted fw-normal">

                                (Optional)

                            </span>

                        </label>


                        <Dropzone

                            accept=".pdf,.jpg,.jpeg,.png"

                            onFiles={
                                addInvoice
                            }

                            label="Click to upload or drag & drop"

                            hint="PDF, JPG or PNG — single file"

                        />


                        {invoice && (

                            <div className="d-flex flex-wrap gap-2 mt-3">

                                <FileBadge

                                    file={
                                        invoice
                                    }

                                    onRemove={
                                        removeInvoice
                                    }

                                />

                            </div>

                        )}

                    </div>

                </div>


                {/* =========================================
                    SUBMIT / CANCEL
                ========================================= */}

                <div className="d-flex justify-content-end gap-2 mb-0 pt-4 border-top">


                    <button

                        type="button"

                        className="btn btn-light mt-4"

                        onClick={
                            handleCancel
                        }

                        disabled={
                            isSubmitting
                        }

                    >
                        Cancel
                    </button>


                    <button

                        type="submit"

                        className="btn btn-primary mt-4 d-inline-flex align-items-center gap-2"

                        disabled={
                            isSubmitting
                        }

                    >

                        {isSubmitting && (

                            <FiLoader
                                className="spin"
                                size={14}
                            />

                        )}


                        {isSubmitting
                            ? "Submitting..."
                            : "Submit"}

                    </button>

                </div>

            </div>

        </div>

    )


    // =====================================================
    // MODAL
    // =====================================================

    if (isModal) {

        return (

            <form
                onSubmit={
                    handleSubmit
                }
            >

                {formBody}

            </form>

        )
    }


    // =====================================================
    // NORMAL PAGE
    // =====================================================

    return (

        <>

            <PageHeader />

            <div className="main-content">

                <form
                    onSubmit={
                        handleSubmit
                    }
                >

                    {formBody}

                </form>

            </div>

        </>

    )
}


export default UploadForm