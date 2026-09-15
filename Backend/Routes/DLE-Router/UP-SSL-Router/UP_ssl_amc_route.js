import express from 'express'

import {
    createAmcDocument,
    getAllDistricts,
    getAmcDocuments,
    updateAmcDocument,
} from '../../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js'
import { updateAmcApprovalStatus } from '../../../Controller/DLE-Controller/amc-approval-controller.js'

import upload from '../../../Middleware/UploadMiddleware.js'
import { protect } from '../../../Middleware/authmiddleware.js'

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
router.post('/approval/status', updateAmcApprovalStatus('up'))

router.get(
    '/get',
    protect,
    getAmcDocuments
)

router.get(
    '/view',
    protect,
    getAmcDocuments
)

router.get(
    '/dashboard/district',
    protect,
    getAllDistricts
)

export default router