const ssl = (state) => `/dle/${state}/ssl-amc`
const appSsl = (state) => `/api/${state}/ssl-amc`

/** External API (https://klkerp.com/api) */
export const external = {
  ssl: {
    volume: (state) => `${ssl(state)}/volume`,
    district: (state) => `${ssl(state)}/district`,
    blocks: (state) => `${ssl(state)}/blocks`,
    panchayat: (state) => `${ssl(state)}/panchayat`,
    details: (state) => `${ssl(state)}/details`,
    complaintDetails: (state) => `${ssl(state)}/complaint/details`,
    complaintStore: (state) => `${ssl(state)}/complaint/store`,
    complaintView: (state) => `${ssl(state)}/complaint/view`,
  },
}

/** This app's Node API — every route starts with /api */
export const app = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password',
  },
  ssl: {
    get: (state) => `${appSsl(state)}/get`,
    store: (state) => `${appSsl(state)}/store`,
    create: (state) => `${appSsl(state)}/create`,
    view: (state) => `${appSsl(state)}/view`,
    update: (state) => `${appSsl(state)}/update`,
    dashboardDistrict: (state) => `${appSsl(state)}/dashboard/district`,
  },
  lightAmc: {
    get: '/api/light-amc/get',
    store: '/api/light-amc/store',
    last: '/api/light-amc/last',
    periodStatus: '/api/light-amc/period-status',
    view: (id) => `/api/light-amc/view/${id}`,
  },
}
