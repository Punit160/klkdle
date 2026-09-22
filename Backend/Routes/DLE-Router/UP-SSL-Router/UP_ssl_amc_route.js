import express from 'express'

import {
    createAmcDocument,
    getAllDistricts,
    getAmcDocuments,
    updateAmcDocument,
} from '../../../Controller/DLE-Controller/UP-SSL/UP_amc_controller.js'
import { upAmcUpload } from '../../../Middleware/upAmcUploadMiddleware.js'
import {
  requireSslAmcAdd,
  requireSslAmcRead,
} from '../../../Middleware/portalModulePermission.js'

const router = express.Router()

const upRead = requireSslAmcRead('up')
const upAdd = requireSslAmcAdd('up')

router.post('/create', upAdd, ...upAmcUpload, createAmcDocument)
router.post('/store', upAdd, ...upAmcUpload, createAmcDocument)
router.post('/update', upAdd, ...upAmcUpload, updateAmcDocument)

router.get('/get', upRead, getAmcDocuments)
router.get('/view', upRead, getAmcDocuments)
router.get('/dashboard/district', upRead, getAllDistricts)

export default router
