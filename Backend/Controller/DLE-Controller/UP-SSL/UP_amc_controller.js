import prisma from '../../../Config/Prisma.js'
import { toPublicFileUrl } from '../../../Utils/publicUrl.js'


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


export const createAmcDocument = async (req, res) => {
    try {

        const {
            district,
            block,
            panchayat,
            volume,              // optional 
            start_month_year,
            end_month_year,
            company_id,
            user_id,
        } = req.body


        // ==========================================
        // SSL IDS
        // ==========================================

        let sslIds =
            req.body['ssl_id[]'] ||
            req.body.ssl_id ||
            []


        // ==========================================
        // UNIQUE ID (pehle pole_no tha)
        // ==========================================

        let uniqueIds =
            req.body['unique_id[]'] ||
            req.body.unique_id ||
            req.body['pole_no[]'] ||   // backward-compatible fallback
            req.body.pole_no ||
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


        // ==========================================
        // REQUIRED VALIDATION
        // ==========================================

        if (sslIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one site (ssl_id) is required',
            })
        }


        // "volume" ab required list se hata diya gaya hai,
        // kyunki frontend se yeh field bheji hi nahi ja rahi
        if (
            !district ||
            !block ||
            !panchayat ||
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
        // UP FILE PATH
        // ==========================================

        const amcDocumentNames = amcFiles
            .map(
                (file) =>
                    `/uploads/up/ssl/amc/doc/${file.filename}`
            )
            .join(',')


        const invoiceDocumentName =
            invoiceFile
                ? `/uploads/up/ssl/amc/invoice/${invoiceFile.filename}`
                : null


        // ==========================================
        // CLEAN SSL IDS
        // ==========================================

        const sslIdArray = sslIds
            .filter(
                (id) =>
                    id !== undefined &&
                    id !== null &&
                    String(id).trim() !== ''
            )
            .map((id) => String(id))


        // ==========================================
        // CLEAN UNIQUE IDS
        // ==========================================

        const uniqueIdArray = uniqueIds
            .filter(
                (uid) =>
                    uid !== undefined &&
                    uid !== null &&
                    String(uid).trim() !== ''
            )
            .map((uid) => String(uid))


        // ==========================================
        // SSL / UNIQUE ID COUNT VALIDATION
        // ==========================================

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


        // ==========================================
        // TRANSACTION
        // ==========================================

        const result =
            await prisma.$transaction(
                async (tx) => {

                    // ==================================
                    // PARENT
                    // ==================================

                    const parentDocument =
                        await tx.upSslAmcDocument.create({
                            data: {

                                company_id:
                                    String(company_id),

                                // volume ab optional hai —
                                // agar frontend se nahi aaya
                                // to empty string save hoga
                                state:
                                    volume
                                        ? String(volume)
                                        : '',

                                district:
                                    String(district),

                                block:
                                    String(block),

                                panchayat:
                                    String(panchayat),

                                created_by:
                                    String(user_id),
                            },
                        })


                    // ==================================
                    // ONE UPLOAD ROW
                    // ==================================

                    const uploadDocument =
                        await tx.upSslAmcUploadDocument.create({
                            data: {

                                company_id:
                                    String(company_id),

                                up_ssl_amc_id:
                                    parentDocument.id,


                                // =========================
                                // SSL IDS ARRAY
                                // =========================

                                ssl_id:
                                    JSON.stringify(
                                        sslIdArray
                                    ),


                                // =========================
                                // UNIQUE ID ARRAY
                                // =========================

                                unique_id:
                                    uniqueIdArray.length > 0
                                        ? JSON.stringify(
                                            uniqueIdArray
                                        )
                                        : null,


                                start_month_year:
                                    String(
                                        start_month_year
                                    ),


                                end_month_year:
                                    end_month_year
                                        ? String(
                                            end_month_year
                                        )
                                        : null,


                                amc_document:
                                    amcDocumentNames,


                                invoice_document:
                                    invoiceDocumentName,


                                amc_doc_status:
                                    0,


                                invoice_status:
                                    0,


                                validation_status:
                                    'pending',


                                created_by:
                                    BigInt(user_id),
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


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({

            success: true,

            message:
                'UP AMC document uploaded successfully.',

            data:
                serialized,
        })


    } catch (error) {

        console.error(
            'UP AMC document creation failed:',
            error
        )

        return res.status(500).json({

            success: false,

            message:
                'Something went wrong while submitting the UP AMC document.',

            error:
                error.message,
        })
    }
}


// ==========================================
// GET UP AMC DOCUMENTS
// ==========================================

export const getAmcDocuments = async (req, res) => {

    try {

        const documents =
            await prisma.upSslAmcDocument.findMany({

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
                // UNIQUE IDS
                // ==================================

                const uniqueIds =
                    parseJsonArray(
                        upload.unique_id
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

                        document: [],

                        amc_no:
                            groupedRow.amc.length + 1,
                    }


                    groupedRow.amc.push(
                        period
                    )
                }


                // ==================================
                // LIGHTS
                // ==================================

                const totalLights =
                    sslIds.length


                const completedLights =
                    Number(
                        upload.amc_doc_status
                    ) === 1
                        ? totalLights
                        : 0


                const pendingLights =
                    totalLights -
                    completedLights


                period.total_lights +=
                    totalLights


                period.completed_lights +=
                    completedLights


                period.pending_lights +=
                    pendingLights


                // ==================================
                // DOCUMENT
                // ==================================

                period.document.push({

                    id:
                        upload.id?.toString(),

                    company_id:
                        upload.company_id,

                    up_ssl_amc_id:
                        upload.up_ssl_amc_id?.toString(),

                    volume: [
                        groupedRow.state,
                    ],

                    ssl_id:
                        sslIds,

                    unique_id:
                        uniqueIds,

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


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({

            success: true,

            message:
                'UP AMC documents fetched successfully.',

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
            'Get UP AMC documents failed:',
            error
        )

        return res.status(500).json({

            success: false,

            message:
                'Something went wrong while fetching UP AMC documents.',

            error:
                error.message,
        })
    }
}

export const getAllDistricts = async (req, res) => {
    try {

        // ==========================================
        // FETCH ALL UP AMC DOCUMENTS
        // ==========================================

        const documents =
            await prisma.upSslAmcDocument.findMany({
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


            // ==========================================
            // NORMALIZED DISTRICT KEY
            // ==========================================

            const districtKey =
                district.toLowerCase()


            // ==========================================
            // CREATE DISTRICT
            // ==========================================

            if (!districtMap.has(districtKey)) {

                districtMap.set(districtKey, {
                    district: district,
                    blocks: new Set(),
                    panchayats: new Map(),
                })

            }


            const districtData =
                districtMap.get(districtKey)


            // ==========================================
            // BLOCK
            // ==========================================

            districtData.blocks.add(
                block.toLowerCase()
            )


            // ==========================================
            // PANCHAYAT UNIQUE KEY
            // ==========================================

            const panchayatKey = [
                block.toLowerCase(),
                panchayat.toLowerCase(),
            ].join('|')


            // ==========================================
            // CREATE PANCHAYAT
            // ==========================================

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

                let sslIds = []

                try {

                    if (
                        Array.isArray(upload.ssl_id)
                    ) {

                        sslIds = upload.ssl_id

                    } else if (
                        typeof upload.ssl_id === 'string'
                    ) {

                        const parsed =
                            JSON.parse(upload.ssl_id)

                        if (Array.isArray(parsed)) {
                            sslIds = parsed
                        }

                    }

                } catch (error) {

                    sslIds = []

                }


                // ==========================================
                // TOTAL LIGHTS
                // ==========================================

                const totalLights =
                    sslIds.length


                // ==========================================
                // STATUS
                // ==========================================

                const isCompleted =
                    Number(upload.amc_doc_status) === 1


                // ==========================================
                // ADD LIGHTS
                // ==========================================

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


            const totalLights =
                panchayats.reduce(
                    (sum, panchayat) =>
                        sum +
                        Number(
                            panchayat.total_lights || 0
                        ),
                    0
                )


            const completedPanchayats =
                panchayats.filter(
                    (panchayat) =>
                        panchayat.total_lights > 0 &&
                        panchayat.pending_lights === 0
                ).length


            const pendingPanchayats =
                panchayats.length -
                completedPanchayats


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
            'Get UP district dashboard failed:',
            error
        )

        return res.status(500).json({

            success: false,

            message:
                'Something went wrong while fetching UP district dashboard.',

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

        const existing = await prisma.upSslAmcUploadDocument.findUnique({
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
            data.amc_document = `/uploads/up/ssl/amc/doc/${amcFile.filename}`
        }
        if (invoiceFile) {
            data.invoice_document = `/uploads/up/ssl/amc/invoice/${invoiceFile.filename}`
        }

        const updated = await prisma.upSslAmcUploadDocument.update({
            where: { id: BigInt(id) },
            data,
        })

        return res.json({
            success: true,
            message: 'Document updated successfully.',
            data: {
                ...updated,
                id: updated.id.toString(),
                up_ssl_amc_id: updated.up_ssl_amc_id?.toString?.(),
                created_by: updated.created_by?.toString?.(),
                amc_document_url: toPublicFileUrl(req, updated.amc_document),
                invoice_document_url: toPublicFileUrl(req, updated.invoice_document),
            },
        })
    } catch (error) {
        console.error('UP AMC document update failed:', error)
        return res.status(500).json({
            success: false,
            message: 'Failed to update document.',
            error: error.message,
        })
    }
}