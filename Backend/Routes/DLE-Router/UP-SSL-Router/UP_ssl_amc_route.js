import express from 'express'

import {
    createAmcDocument,
    getAllDistricts,
    getAmcDocuments,
    updateAmcDocument,
} from '../../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js'
import {
    getAmcDocumentsForApproval,
    updateAmcApprovalStatus,
} from '../../../Controller/DLE-Controller/amc-approval-controller.js'

import { upAmcUpload } from '../../../Middleware/upAmcUploadMiddleware.js'
import { protect } from '../../../Middleware/authmiddleware.js'

const router = express.Router()

router.post('/create', ...upAmcUpload, createAmcDocument)
router.post('/store', ...upAmcUpload, createAmcDocument)
router.post('/update', ...upAmcUpload, updateAmcDocument)
router.post('/approval/status', protect, updateAmcApprovalStatus('up'))
router.get('/approval/list', protect, getAmcDocumentsForApproval('up'))
router.get('/approval/pending', protect, (req, res, next) => {
    if (req.query.approval_status == null || req.query.approval_status === '') {
        req.query.approval_status = String(0)
    }
    return getAmcDocumentsForApproval('up')(req, res, next)
})

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