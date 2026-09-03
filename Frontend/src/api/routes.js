/**
 * Single route map for the whole app.
 *
 * pages  → browser URLs  (/login, /bihar/amc/upload)
 * api    → this Node app  (POST /api/auth/login)
 * erp    → External API   (GET  https://klkerp.com/api/dle/.../volume)
 */

const erpSsl = (state) => `/dle/${state}/ssl-amc`
const apiSsl = (state) => `/api/${state}/amc`

/** Browser page URLs */
export const pages = {
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  idCard: '/id-card',
  certificate: '/certificate',

  bihar: {
    amcDashboard: '/bihar/amc',
    amcUpload: '/bihar/amc/upload',
    amcList: '/bihar/amc/list',
    amcDetails: '/bihar/amc/details',
    complaint: '/bihar/amc/complaint',
    complaints: '/bihar/amc/complaints',
    lightAmc: '/bihar/amc/light',
    lightAmcList: '/bihar/amc/light/list',
    lightAmcDetails: '/bihar/amc/light/details',
  },

  up: {
    amcDashboard: '/up/amc',
    amcUpload: '/up/amc/upload',
    amcList: '/up/amc/list',
    amcDetails: '/up/amc/details',
    lightAmc: '/up/amc/light',
    lightAmcList: '/up/amc/light/list',
    lightAmcDetails: '/up/amc/light/details',
  },
}

/** Old page URLs → redirect targets (router.jsx) */
export const legacyPages = {
  '/authentication/login/': pages.login,
  '/authentication/login': pages.login,
  '/DLE/dashboard': pages.dashboard,
  '/dle/register-form': pages.register,
  '/dle/user-profile': pages.profile,
  '/dle/id-card': pages.idCard,
  '/dle/user-cerficate': pages.certificate,
  '/bihar/ssl/dashboard': pages.bihar.amcDashboard,
  '/bihar/ssl-amc/upload-form': pages.bihar.amcUpload,
  '/bihar/ssl-amc/view-document': pages.bihar.amcList,
  '/bihar/ssl-amc/view-document-details': pages.bihar.amcDetails,
  '/bihar/ssl-amc/complaint': pages.bihar.complaint,
  '/bihar/ssl-amc/view-complaint': pages.bihar.complaints,
  '/bihar/ssl-amc/view-complaint-details': pages.bihar.complaints,
  '/bihar/ssl-amc/light-amc': pages.bihar.lightAmc,
  '/bihar/ssl-amc/view-light-amc': pages.bihar.lightAmcList,
  '/bihar/ssl-amc/view-light-amc-details': pages.bihar.lightAmcDetails,
  '/uttarpradesh/ssl-amc/Dashboard': pages.up.amcDashboard,
  '/uttarpradesh/ssl-amc/upload-form': pages.up.amcUpload,
  '/uttarpradesh/ssl-amc/view-document': pages.up.amcList,
  '/uttarpradesh/ssl-amc/view-document-details': pages.up.amcDetails,
  '/uttarpradesh/ssl-amc/light-amc': pages.up.lightAmc,
  '/uttarpradesh/ssl-amc/view-light-amc': pages.up.lightAmcList,
  '/uttarpradesh/ssl-amc/view-light-amc-details': pages.up.lightAmcDetails,
}

/** External ERP — master data & complaints (klkerp.com) */
export const erp = {
  ssl: {
    volume: (state) => `${erpSsl(state)}/volume`,
    district: (state) => `${erpSsl(state)}/district`,
    blocks: (state) => `${erpSsl(state)}/blocks`,
    panchayat: (state) => `${erpSsl(state)}/panchayat`,
    details: (state) => `${erpSsl(state)}/details`,
    complaintDetails: (state) => `${erpSsl(state)}/complaint/details`,
    complaintStore: (state) => `${erpSsl(state)}/complaint/store`,
    complaintView: (state) => `${erpSsl(state)}/complaint/view`,
  },
}

/** This Node app — all paths start with /api */
export const api = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password',
  },
  ssl: {
    get: (state) => `${apiSsl(state)}/get`,
    store: (state) => `${apiSsl(state)}/store`,
    create: (state) => `${apiSsl(state)}/store`,
    view: (state) => `${apiSsl(state)}/view`,
    update: (state) => `${apiSsl(state)}/update`,
    dashboard: (state) => `${apiSsl(state)}/dashboard/district`,
    dashboardDistrict: (state) => `${apiSsl(state)}/dashboard/district`,
  },
  lightAmc: {
    get: '/api/light-amc/get',
    list: '/api/light-amc/get',
    store: '/api/light-amc/store',
    last: '/api/light-amc/last',
    periodStatus: '/api/light-amc/period-status',
    view: (id) => `/api/light-amc/view/${id}`,
  },
}

// Backward-compatible aliases used across the app
export const external = erp
export const app = api
