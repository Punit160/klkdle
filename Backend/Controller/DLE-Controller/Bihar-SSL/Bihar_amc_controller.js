import prisma from '../../../Config/Prisma.js'
import { toPublicFileUrl } from '../../../Utils/publicUrl.js'

// ==========================================
// JSON STRING -> ARRAY
// ==========================================

const parseJsonArray = (value) => {
    if (Array.isArray(value)) {
        return value
    }

    if (
        typeof value === 'string' &&
        value.trim()
    ) {
        try {
            const parsed = JSON.parse(value)

            return Array.isArray(parsed)
                ? parsed
                : []
        } catch (error) {
            return []
        }
    }

    return []
}

const toStringArray = (value) => {
    if (Array.isArray(value)) return value
    if (value === undefined || value === null || value === '') return []
    return [value]
}

const cleanIds = (value) =>
    toStringArray(value)
        .filter((id) => id !== undefined && id !== null && String(id).trim() !== '')
        .map((id) => String(id).trim())

const samePeriod = (upload, start, end) =>
    String(upload.start_month_year || '') === String(start || '') &&
    String(upload.end_month_year || '') === String(end || '')

const normalizePlace = (value) => String(value || '').trim().toLowerCase()

const toISODate = (value) => {
    if (!value) return null
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return null
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const summarizeLights = (uploads = []) => {
    const ordered = [...uploads].sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime()
        const bTime = new Date(b.created_at || 0).getTime()
        return aTime - bTime
    })

    const doneMap = new Map()
    let pendingMap = new Map()

    ordered.forEach((upload) => {
        const sslIds = parseJsonArray(upload.ssl_id)
        const poleNos = parseJsonArray(upload.pole_no)
        const amcDate = toISODate(upload.created_at) || upload.start_month_year || ''
        sslIds.forEach((id, index) => {
            doneMap.set(String(id), {
                pole_no: poleNos[index] ?? '',
                unique_id: poleNos[index] ?? '',
                amc_date: amcDate,
                start_month_year: upload.start_month_year || '',
                end_month_year: upload.end_month_year || '',
            })
        })

        pendingMap = new Map()
        const pendingSslIds = parseJsonArray(upload.pending_ssl_id)
        const pendingPoleNos = parseJsonArray(upload.pending_pole_no)
        pendingSslIds.forEach((id, index) => {
            const sslId = String(id)
            if (!doneMap.has(sslId)) {
                pendingMap.set(sslId, pendingPoleNos[index] ?? '')
            }
        })
    })

    const doneEntries = [...doneMap.entries()]

    return {
        done_ssl_id: doneEntries.map(([id]) => id),
        done_pole_no: doneEntries.map(([, info]) => info.pole_no),
        done_amc_date: doneEntries.map(([, info]) => info.amc_date),
        done_lights: doneEntries.map(([ssl_id, info]) => ({
            ssl_id,
            pole_no: info.pole_no,
            unique_id: info.unique_id || info.pole_no,
            amc_date: info.amc_date,
            start_month_year: info.start_month_year,
            end_month_year: info.end_month_year,
        })),
        pending_ssl_id: [...pendingMap.keys()],
        pending_pole_no: [...pendingMap.values()],
        completed_lights: doneMap.size,
        pending_lights: pendingMap.size,
        total_lights: doneMap.size + pendingMap.size,
    }
}

const findQuarterUploads = async ({ company_id, district, block, panchayat, start_month_year, end_month_year }) => {
    const parents = await prisma.biharSslAmcDocument.findMany({
        where: company_id ? { company_id: String(company_id) } : {},
        include: { uploadDocuments: true },
        orderBy: { id: 'asc' },
    })

    const matchedParents = parents.filter((parent) =>
        normalizePlace(parent.district) === normalizePlace(district) &&
        normalizePlace(parent.block) === normalizePlace(block) &&
        normalizePlace(parent.panchayat) === normalizePlace(panchayat)
    )

    const uploads = []
    matchedParents.forEach((parent) => {
        (parent.uploadDocuments || []).forEach((upload) => {
            if (samePeriod(upload, start_month_year, end_month_year)) {
                uploads.push(upload)
            }
        })
    })

    return { parents: matchedParents, uploads, summary: summarizeLights(uploads) }
}


// ==========================================
// CREATE AMC DOCUMENT
// ==========================================

export const createAmcDocument = async (req, res) => {
    try {

        const {
            district,
            block,
            panchayat,
            volume,
            start_month_year,
            end_month_year,
            company_id,
            user_id,
            remarks,
        } = req.body


        // ==========================================
        // SSL IDS
        // ==========================================

        let sslIds =
            req.body['ssl_id[]'] ||
            req.body.ssl_id ||
            []


        // ==========================================
        // UNIQUE ID (pehle 'pole_no' tha, ab 'unique_id' aayega)
        // ==========================================

        let uniqueIds =
            req.body['unique_id[]'] ||
            req.body.unique_id ||
            req.body['pole_no[]'] ||
            req.body.pole_no ||
            []

        let pendingSslIds =
            req.body['pending_ssl_id[]'] ||
            req.body.pending_ssl_id ||
            []

        let pendingPoleNos =
            req.body['pending_pole_no[]'] ||
            req.body.pending_pole_no ||
            req.body['pending_unique_id[]'] ||
            req.body.pending_unique_id ||
            []


        // ==========================================
        // ARRAY CONVERSION
        // ==========================================

        if (!Array.isArray(sslIds)) {
            sslIds = [sslIds]
        }

        if (!Array.isArray(uniqueIds)) {
            uniqueIds = [uniqueIds]
        }

        if (!Array.isArray(pendingSslIds)) {
            pendingSslIds = [pendingSslIds]
        }

        if (!Array.isArray(pendingPoleNos)) {
            pendingPoleNos = [pendingPoleNos]
        }


        // ==========================================
        // REQUIRED VALIDATION
        // ==========================================

        if (sslIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one site (ssl_id) is required',
            })
        }


        if (
            !district ||
            !block ||
            !panchayat ||
            !volume ||
            !start_month_year ||
            !company_id ||
            !user_id
        ) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
            })
        }


        // ==========================================
        // FILES
        // ==========================================

        const amcFiles =
            req.files?.amc_document || []

        const invoiceFile =
            req.files?.invoice_document?.[0] || null


        if (amcFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'At least one AMC document is required',
            })
        }


        // ==========================================
        // FILE PATH
        // ==========================================

        const amcDocumentNames = amcFiles
            .map(
                (file) =>
                    `/uploads/bihar/ssl/amc/doc/${file.filename}`
            )
            .join(',')


        const invoiceDocumentName =
            invoiceFile
                ? `/uploads/bihar/ssl/amc/invoice/${invoiceFile.filename}`
                : null


        // ==========================================
        // CLEAN SSL IDS
        // ==========================================

        const sslIdArray = cleanIds(sslIds)
        const uniqueIdArray = cleanIds(uniqueIds)
        const pendingSslIdArray = cleanIds(pendingSslIds)
        const pendingPoleNoArray = cleanIds(pendingPoleNos)

        if (
            uniqueIdArray.length > 0 &&
            uniqueIdArray.length !== sslIdArray.length
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'SSL ID and Unique ID count must be same',
                ssl_count:
                    sslIdArray.length,
                unique_id_count:
                    uniqueIdArray.length,
            })
        }

        const { parents, summary: quarterSummary } = await findQuarterUploads({
            company_id,
            district,
            block,
            panchayat,
            start_month_year,
            end_month_year,
        })

        const alreadyDone = new Set(quarterSummary.done_ssl_id)
        const allowedPending = new Set(quarterSummary.pending_ssl_id)
        const duplicateIds = sslIdArray.filter((id) => alreadyDone.has(id))

        if (duplicateIds.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'AMC documentation already uploaded for this quarter. You can upload again only for pending lights.',
                duplicate_ssl_ids: duplicateIds,
            })
        }

        if (alreadyDone.size > 0) {
            if (allowedPending.size === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'AMC documentation already uploaded for this quarter. There are no pending lights left.',
                })
            }

            const notPending = sslIdArray.filter((id) => !allowedPending.has(id))
            if (notPending.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'For this quarter you can upload documentation only for pending lights.',
                    invalid_ssl_ids: notPending,
                })
            }
        }

        // ==========================================
        // TRANSACTION
        // ==========================================

        const result =
            await prisma.$transaction(
                async (tx) => {

                    let parentDocument = parents[0]
                        ? await tx.biharSslAmcDocument.findUnique({
                            where: { id: parents[0].id },
                        })
                        : null

                    if (!parentDocument) {
                        parentDocument =
                            await tx.biharSslAmcDocument.create({
                                data: {
                                    company_id: String(company_id),
                                    state: String(volume),
                                    district: String(district),
                                    block: String(block),
                                    panchayat: String(panchayat),
                                    created_by: String(user_id),
                                },
                            })
                    }

                    const uploadDocument =
                        await tx.biharSslAmcUploadDocument.create({
                            data: {
                                company_id: String(company_id),
                                bihar_ssl_amc_id: parentDocument.id,
                                ssl_id: JSON.stringify(sslIdArray),
                                pole_no:
                                    uniqueIdArray.length > 0
                                        ? JSON.stringify(uniqueIdArray)
                                        : null,
                                pending_ssl_id:
                                    pendingSslIdArray.length > 0
                                        ? JSON.stringify(pendingSslIdArray)
                                        : null,
                                pending_pole_no:
                                    pendingPoleNoArray.length > 0
                                        ? JSON.stringify(pendingPoleNoArray)
                                        : null,
                                start_month_year: String(start_month_year),
                                end_month_year: end_month_year
                                    ? String(end_month_year)
                                    : null,
                                amc_document: amcDocumentNames,
                                invoice_document: invoiceDocumentName,
                                remarks: remarks ? String(remarks).slice(0, 255) : null,
                                amc_doc_status: 0,
                                invoice_status: 0,
                                validation_status: 'pending',
                                created_by: BigInt(user_id),
                            },
                        })

                    return {
                        parentDocument,
                        uploadDocument,
                    }
                }
            )


        // ==========================================
        // SERIALIZE BIGINT
        // ==========================================

        const serialized =
            JSON.parse(
                JSON.stringify(
                    result,
                    (key, value) =>
                        typeof value === 'bigint'
                            ? value.toString()
                            : value
                )
            )


        return res.status(201).json({

            success: true,

            message:
                'AMC document uploaded successfully.',

            data:
                serialized,
        })


    } catch (error) {

        console.error(
            'AMC document creation failed:',
            error
        )

        return res.status(500).json({

            success: false,

            message:
                'Something went wrong while submitting the AMC document.',

            error:
                error.message,
        })
    }
}


// ==========================================
// GET AMC DOCUMENTS
// ==========================================

export const getAmcDocuments = async (req, res) => {

    try {

        const documents =
            await prisma.biharSslAmcDocument.findMany({

                orderBy: {
                    id: 'desc',
                },

                include: {
                    uploadDocuments: true,
                },
            })


        // ==========================================
        // GROUP SAME LOCATION
        // ==========================================

        const groupedMap =
            new Map()


        documents.forEach((parent) => {

            const district =
                String(
                    parent.district || ''
                ).trim()


            const block =
                String(
                    parent.block || ''
                ).trim()


            const panchayat =
                String(
                    parent.panchayat || ''
                ).trim()


            const groupKey = [
                district.toLowerCase(),
                block.toLowerCase(),
                panchayat.toLowerCase(),
            ].join('|')


            if (!groupedMap.has(groupKey)) {

                groupedMap.set(groupKey, {

                    id:
                        parent.id?.toString(),

                    company_id:
                        parent.company_id,

                    state:
                        parent.state,

                    district,

                    block,

                    panchayat,

                    created_by:
                        parent.created_by?.toString(),

                    created_at:
                        parent.created_at,

                    updated_at:
                        parent.updated_at,

                    amc: [],
                })
            }


            const groupedRow =
                groupedMap.get(groupKey)


            const uploads =
                parent.uploadDocuments || []


            uploads.forEach((upload) => {

                // ==================================
                // SSL IDS
                // ==================================

                const sslIds =
                    parseJsonArray(
                        upload.ssl_id
                    )


                // ==================================
                // POLE NOS
                // ==================================

                const poleNos =
                    parseJsonArray(
                        upload.pole_no
                    )

                const pendingSslIds =
                    parseJsonArray(
                        upload.pending_ssl_id
                    )

                const pendingPoleNos =
                    parseJsonArray(
                        upload.pending_pole_no
                    )


                // ==================================
                // PERIOD
                // ==================================

                let period =
                    groupedRow.amc.find(
                        (item) =>
                            item.start_month_year ===
                                upload.start_month_year &&
                            item.end_month_year ===
                                upload.end_month_year
                    )


                if (!period) {

                    period = {

                        period:
                            upload.end_month_year
                                ? `${upload.start_month_year} - ${upload.end_month_year}`
                                : upload.start_month_year,

                        start_month_year:
                            upload.start_month_year,

                        end_month_year:
                            upload.end_month_year,

                        total_lights:
                            0,

                        completed_lights:
                            0,

                        pending_lights:
                            0,

                        done_ssl_id: [],
                        done_pole_no: [],
                        pending_ssl_id: [],
                        pending_pole_no: [],

                        document: [],

                        amc_no:
                            groupedRow.amc.length + 1,
                    }


                    groupedRow.amc.push(
                        period
                    )
                }


                // ==================================
                // DOCUMENT
                // ==================================

                period.document.push({

                    id:
                        upload.id?.toString(),

                    company_id:
                        upload.company_id,

                    bihar_ssl_amc_id:
                        upload.bihar_ssl_amc_id?.toString(),

                    volume: [
                        groupedRow.state,
                    ],

                    ssl_id:
                        sslIds,

                    pole_no:
                        poleNos,

                    pending_ssl_id:
                        pendingSslIds,

                    pending_pole_no:
                        pendingPoleNos,

                    start_month_year:
                        upload.start_month_year,

                    end_month_year:
                        upload.end_month_year,

                    remarks:
                        upload.remarks || null,

                    amc_document:
                        upload.amc_document,

                    amc_doc_status:
                        upload.amc_doc_status,

                    invoice_document:
                        upload.invoice_document,

                    invoice_status:
                        upload.invoice_status,

                    validation_status:
                        upload.validation_status,

                    created_by:
                        upload.created_by?.toString(),

                    created_at:
                        upload.created_at,

                    updated_at:
                        upload.updated_at,

                    amc_document_url:
                        toPublicFileUrl(req, upload.amc_document),

                    invoice_document_url:
                        toPublicFileUrl(req, upload.invoice_document),
                })
            })
        })


        const data =
            Array.from(
                groupedMap.values()
            )


        // ==========================================
        // SORT PERIODS
        // ==========================================

        data.forEach((row) => {

            row.amc.sort(
                (a, b) =>
                    String(
                        b.start_month_year
                    ).localeCompare(
                        String(
                            a.start_month_year
                        )
                    )
            )


            row.amc.forEach(
                (period, index) => {

                    period.amc_no =
                        index + 1

                    const lights = summarizeLights(period.document)
                    period.total_lights = lights.total_lights
                    period.completed_lights = lights.completed_lights
                    period.pending_lights = lights.pending_lights
                    period.done_ssl_id = lights.done_ssl_id
                    period.done_pole_no = lights.done_pole_no
                    period.pending_ssl_id = lights.pending_ssl_id
                    period.pending_pole_no = lights.pending_pole_no
                }
            )
        })


        // ==========================================
        // SUMMARY
        // ==========================================

        const totalDistricts =
            new Set(
                data
                    .map(
                        (item) =>
                            item.district
                    )
                    .filter(Boolean)
            ).size


        const totalBlocks =
            new Set(
                data
                    .map(
                        (item) =>
                            `${item.district}|${item.block}`
                    )
                    .filter(Boolean)
            ).size


        const totalPanchayats =
            data.length


        const totalLights =
            data.reduce(
                (total, row) =>
                    total +
                    row.amc.reduce(
                        (sum, period) =>
                            sum +
                            Number(
                                period.total_lights ||
                                0
                            ),
                        0
                    ),
                0
            )


        return res.status(200).json({

            success: true,

            message:
                'AMC documents fetched successfully.',

            summary: {

                total_district:
                    totalDistricts,

                total_block:
                    totalBlocks,

                total_panchayat:
                    totalPanchayats,

                total_lights:
                    totalLights,
            },

            data,
        })


    } catch (error) {

        console.error(
            'Get AMC documents failed:',
            error
        )

        return res.status(500).json({

            success: false,

            message:
                'Something went wrong while fetching AMC documents.',

            error:
                error.message,
        })
    }
}


export const getQuarterStatus = async (req, res) => {
    try {
        const {
            company_id,
            district,
            block,
            panchayat,
            start_month_year,
            end_month_year,
        } = req.query

        if (!company_id || !district || !block || !panchayat || !start_month_year) {
            return res.status(400).json({
                success: false,
                message: 'company_id, district, block, panchayat and start_month_year are required',
            })
        }

        const { summary } = await findQuarterUploads({
            company_id,
            district,
            block,
            panchayat,
            start_month_year,
            end_month_year,
        })

        const exists = summary.completed_lights > 0 || summary.pending_lights > 0

        return res.status(200).json({
            success: true,
            data: {
                exists,
                ...summary,
                can_upload: !exists || summary.pending_lights > 0,
            },
        })
    } catch (error) {
        console.error('GET QUARTER STATUS ERROR:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch quarter status',
        })
    }
}


export const getAllDistricts = async (req, res) => {
    try {
        // ==========================================
        // FETCH ALL AMC DOCUMENTS
        // ==========================================

        const documents =
            await prisma.biharSslAmcDocument.findMany({
                include: {
                    uploadDocuments: true,
                },
                orderBy: {
                    id: 'desc',
                },
            })

        // ==========================================
        // DISTRICT MAP
        // ==========================================

        const districtMap = new Map()

        // ==========================================
        // PROCESS EACH PARENT
        // ==========================================

        documents.forEach((parent) => {
            const district =
                String(parent.district || '').trim()

            const block =
                String(parent.block || '').trim()

            const panchayat =
                String(parent.panchayat || '').trim()

            if (!district || !block || !panchayat) {
                return
            }

            // --------------------------------------
            // NORMALIZED DISTRICT KEY
            // --------------------------------------

            const districtKey =
                district.toLowerCase()

            // --------------------------------------
            // CREATE DISTRICT
            // --------------------------------------

            if (!districtMap.has(districtKey)) {
                districtMap.set(districtKey, {
                    district: district,
                    blocks: new Set(),
                    panchayats: new Map(),
                })
            }

            const districtData =
                districtMap.get(districtKey)

            // --------------------------------------
            // BLOCK
            // --------------------------------------

            districtData.blocks.add(
                block.toLowerCase()
            )

            // --------------------------------------
            // PANCHAYAT UNIQUE KEY
            // --------------------------------------

            const panchayatKey = [
                block.toLowerCase(),
                panchayat.toLowerCase(),
            ].join('|')

            // --------------------------------------
            // CREATE PANCHAYAT
            // --------------------------------------

            if (
                !districtData.panchayats.has(
                    panchayatKey
                )
            ) {
                districtData.panchayats.set(
                    panchayatKey,
                    {
                        block,
                        panchayat,
                        total_lights: 0,
                        completed_lights: 0,
                        pending_lights: 0,
                    }
                )
            }

            const panchayatData =
                districtData.panchayats.get(
                    panchayatKey
                )

            // ==========================================
            // PROCESS UPLOAD DOCUMENTS
            // ==========================================

            const uploads =
                parent.uploadDocuments || []

            uploads.forEach((upload) => {
                // --------------------------------------
                // SSL IDS
                // --------------------------------------

                let sslIds = []

                try {
                    if (
                        Array.isArray(
                            upload.ssl_id
                        )
                    ) {
                        sslIds =
                            upload.ssl_id
                    } else if (
                        typeof upload.ssl_id ===
                        'string'
                    ) {
                        const parsed =
                            JSON.parse(
                                upload.ssl_id
                            )

                        if (
                            Array.isArray(parsed)
                        ) {
                            sslIds = parsed
                        }
                    }
                } catch (error) {
                    sslIds = []
                }

                // --------------------------------------
                // TOTAL LIGHTS
                // --------------------------------------

                const totalLights =
                    sslIds.length

                // --------------------------------------
                // STATUS
                // --------------------------------------

                const isCompleted =
                    Number(
                        upload.amc_doc_status
                    ) === 1

                // --------------------------------------
                // ADD LIGHTS
                // --------------------------------------

                panchayatData.total_lights +=
                    totalLights

                if (isCompleted) {
                    panchayatData.completed_lights +=
                        totalLights
                } else {
                    panchayatData.pending_lights +=
                        totalLights
                }
            })
        })

        // ==========================================
        // CREATE DISTRICT RESPONSE
        // ==========================================

        const districts = []

        districtMap.forEach((districtData) => {
            const panchayats =
                Array.from(
                    districtData.panchayats.values()
                )

            // --------------------------------------
            // TOTAL LIGHTS
            // --------------------------------------

            const totalLights =
                panchayats.reduce(
                    (sum, panchayat) =>
                        sum +
                        Number(
                            panchayat.total_lights || 0
                        ),
                    0
                )

            // --------------------------------------
            // COMPLETED PANCHAYATS
            // --------------------------------------

            const completedPanchayats =
                panchayats.filter(
                    (panchayat) =>
                        panchayat.total_lights > 0 &&
                        panchayat.pending_lights === 0
                ).length

            // --------------------------------------
            // PENDING PANCHAYATS
            // --------------------------------------

            const pendingPanchayats =
                panchayats.length -
                completedPanchayats

            // --------------------------------------
            // PUSH DISTRICT
            // --------------------------------------

            districts.push({
                district:
                    districtData.district,

                total_blocks:
                    districtData.blocks.size,

                total_panchayats:
                    panchayats.length,

                total_lights:
                    totalLights,

                completed:
                    completedPanchayats,

                pending:
                    pendingPanchayats,
            })
        })

        // ==========================================
        // SORT DISTRICTS
        // ==========================================

        districts.sort((a, b) =>
            String(a.district).localeCompare(
                String(b.district)
            )
        )

        // ==========================================
        // SUMMARY
        // ==========================================

        const totalDistricts =
            districts.length

        const totalLights =
            districts.reduce(
                (sum, district) =>
                    sum +
                    Number(
                        district.total_lights || 0
                    ),
                0
            )

        const completedPanchayats =
            districts.reduce(
                (sum, district) =>
                    sum +
                    Number(
                        district.completed || 0
                    ),
                0
            )

        const pendingPanchayats =
            districts.reduce(
                (sum, district) =>
                    sum +
                    Number(
                        district.pending || 0
                    ),
                0
            )

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            level: 'district',

            period: 'all',

            summary: {
                total_district:
                    totalDistricts,

                total_lights:
                    totalLights,

                completed_panchayats:
                    completedPanchayats,

                pending_panchayats:
                    pendingPanchayats,
            },

            districts,
        })
    } catch (error) {
        console.error(
            'Get all district dashboard failed:',
            error
        )

        return res.status(500).json({
            success: false,

            message:
                'Something went wrong while fetching district dashboard.',

            error:
                error.message,
        })
    }
}

export const updateAmcDocument = async (req, res) => {
    try {
        const id = req.body?.id
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'id is required',
            })
        }

        const existing = await prisma.biharSslAmcUploadDocument.findUnique({
            where: { id: BigInt(id) },
        })

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Document not found',
            })
        }

        const amcFile = req.files?.amc_document?.[0]
        const invoiceFile = req.files?.invoice_document?.[0]
        const data = {
            remarks: req.body.remarks != null
                ? String(req.body.remarks).slice(0, 255)
                : existing.remarks,
            updated_at: new Date(),
        }

        if (amcFile) {
            data.amc_document = `/uploads/bihar/ssl/amc/doc/${amcFile.filename}`
        }
        if (invoiceFile) {
            data.invoice_document = `/uploads/bihar/ssl/amc/invoice/${invoiceFile.filename}`
        }

        const updated = await prisma.biharSslAmcUploadDocument.update({
            where: { id: BigInt(id) },
            data,
        })

        return res.json({
            success: true,
            message: 'Document updated successfully.',
            data: {
                ...updated,
                id: updated.id.toString(),
                bihar_ssl_amc_id: updated.bihar_ssl_amc_id?.toString?.(),
                created_by: updated.created_by?.toString?.(),
                amc_document_url: toPublicFileUrl(req, updated.amc_document),
                invoice_document_url: toPublicFileUrl(req, updated.invoice_document),
            },
        })
    } catch (error) {
        console.error('AMC document update failed:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to update document.',
            error: error.message,
        })
    }
}