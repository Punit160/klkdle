import { pages } from '../api/routes'
import {
  PORTAL_BIHAR_SSL_AMC_ADD,
  PORTAL_BIHAR_SSL_AMC_DASHBOARD,
  PORTAL_BIHAR_SSL_AMC_READ,
  PORTAL_BIHAR_LIGHT_AMC_ADD,
  PORTAL_BIHAR_LIGHT_AMC_READ,
  PORTAL_BIHAR_ULA_ADD,
  PORTAL_BIHAR_ULA_DASHBOARD,
  PORTAL_BIHAR_ULA_READ,
  PORTAL_UP_SSL_AMC_ADD,
  PORTAL_UP_SSL_AMC_DASHBOARD,
  PORTAL_UP_SSL_AMC_READ,
  PORTAL_UP_LIGHT_AMC_ADD,
  PORTAL_UP_LIGHT_AMC_READ,
} from '../constants/portalPermissions'
import { userCanAccessPortalModule } from './portalAccess'

/** Browser path → at least one of these portal permission keys is required. */
export const PAGE_PATH_PORTAL_PERMISSIONS = {
  [pages.bihar.amcDashboard]: [PORTAL_BIHAR_SSL_AMC_DASHBOARD, PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.assignAmc]: [PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.amcUpload]: [PORTAL_BIHAR_SSL_AMC_ADD],
  [pages.bihar.amcList]: [PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.amcDetails]: [PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.complaint]: [PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.complaints]: [PORTAL_BIHAR_SSL_AMC_READ],
  [pages.bihar.lightAmc]: [PORTAL_BIHAR_LIGHT_AMC_ADD],
  [pages.bihar.lightAmcList]: [PORTAL_BIHAR_LIGHT_AMC_READ],
  [pages.bihar.lightAmcDetails]: [PORTAL_BIHAR_LIGHT_AMC_READ],
  [pages.bihar.ulaForm]: [PORTAL_BIHAR_ULA_ADD],
  [pages.bihar.ulaList]: [PORTAL_BIHAR_ULA_READ],
  [pages.bihar.ulaDetails]: [PORTAL_BIHAR_ULA_READ],
  [pages.bihar.ulaDashboard]: [PORTAL_BIHAR_ULA_DASHBOARD],

  [pages.up.amcDashboard]: [PORTAL_UP_SSL_AMC_DASHBOARD, PORTAL_UP_SSL_AMC_READ],
  [pages.up.amcUpload]: [PORTAL_UP_SSL_AMC_ADD],
  [pages.up.amcList]: [PORTAL_UP_SSL_AMC_READ],
  [pages.up.amcDetails]: [PORTAL_UP_SSL_AMC_READ],
  [pages.up.lightAmc]: [PORTAL_UP_LIGHT_AMC_ADD],
  [pages.up.lightAmcList]: [PORTAL_UP_LIGHT_AMC_READ],
  [pages.up.lightAmcDetails]: [PORTAL_UP_LIGHT_AMC_READ],
}

export const userCanAccessPagePath = (user, path) => {
  const required = PAGE_PATH_PORTAL_PERMISSIONS[path]
  if (!required?.length) return true
  return userCanAccessPortalModule(user, required)
}
