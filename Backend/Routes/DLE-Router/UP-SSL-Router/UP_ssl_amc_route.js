import express from 'express'

import {
    createAmcDocument,
    getAllDistricts,
    getAmcDocuments,
    updateAmcDocument,
} from '../../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js'

import upload from '../../../Middleware/UploadMiddleware.js'

const router = express.Router()

const amcUpload = upload.fields([
    {
        name: 'amc_document',
        maxCount: 20
    },
    {
        name: 'invoice_document',
        maxCount: 1
    }
])

router.post('/create', amcUpload, createAmcDocument)
router.post('/store', amcUpload, createAmcDocument)
router.post('/update', amcUpload, updateAmcDocument)

router.get(
    '/get',
    getAmcDocuments
)

router.get(
    '/view',
    getAmcDocuments
)

router.get(
    '/dashboard/district',
    getAllDistricts
)

export default router