import express from 'express'

import {
    createAmcDocument,
    getAllDistricts,
    getAmcDocuments,
    updateAmcDocument,
} from '../../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js'
import { upAmcUpload } from '../../../Middleware/upAmcUploadMiddleware.js'
import { protect } from '../../../Middleware/authmiddleware.js'

const router = express.Router()

router.post('/create', ...upAmcUpload, createAmcDocument)
router.post('/store', ...upAmcUpload, createAmcDocument)
router.post('/update', ...upAmcUpload, updateAmcDocument)

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