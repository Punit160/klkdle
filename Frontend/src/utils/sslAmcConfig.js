import { pages } from '../api/routes'
import { getSslLocationConfig } from './sslLocation'

/**
 * Bihar AMC and UP AMC are separate modules:
 * - different external API paths (/dle/bihar/ssl-amc vs /dle/up/ssl-amc)
 * - different local document APIs (/api/bihar/amc vs /api/up/amc)
 * - different location rules (Bihar: volume + panchayat, UP: village via panchayat param)
 */
export const SSL_AMC_REGIONS = {
  bihar: {
    key: 'bihar',
    sslState: 'bihar',
    stateName: 'Bihar',
    moduleTitle: 'Bihar AMC',
    requiresVolume: true,
    externalApiPath: '/dle/bihar/ssl-amc',
    localDocApiPath: '/api/bihar/amc',
    pages: pages.bihar,
    location: getSslLocationConfig('bihar'),
  },
  up: {
    key: 'up',
    sslState: 'up',
    stateName: 'Uttar Pradesh',
    moduleTitle: 'UP AMC',
    requiresVolume: false,
    externalApiPath: '/dle/up/ssl-amc',
    localDocApiPath: '/api/up/amc',
    pages: pages.up,
    location: getSslLocationConfig('up'),
  },
  kusumc: {
    key: 'kusumc',
    sslState: 'up',
    stateName: 'Uttar Pradesh',
    moduleTitle: 'UP KUSUM-C AMC',
    requiresVolume: false,
    externalApiPath: '/dle/up/ssl-amc',
    localDocApiPath: '/api/up/amc',
    pages: {
      lightAmc: pages.up.kusumcAmc,
      lightAmcList: pages.up.kusumcAmcList,
      lightAmcDetails: pages.up.kusumcAmcDetails,
      dashboard: pages.up.kusumcDashboard,
    },
    location: getSslLocationConfig('up'),
  },
  powerpack: {
    key: 'powerpack',
    sslState: 'up',
    stateName: 'Uttar Pradesh',
    moduleTitle: 'UP Power Pack AMC',
    requiresVolume: false,
    externalApiPath: '/dle/up/ssl-amc',
    localDocApiPath: '/api/up/amc',
    pages: {
      lightAmc: pages.up.powerpackAmc,
      lightAmcList: pages.up.powerpackAmcList,
      lightAmcDetails: pages.up.powerpackAmcDetails,
      dashboard: pages.up.powerpackDashboard,
    },
    location: getSslLocationConfig('up'),
  },
  offgrid: {
    key: 'offgrid',
    sslState: 'up',
    stateName: 'Uttar Pradesh',
    moduleTitle: 'UP Off Grid AMC',
    requiresVolume: false,
    externalApiPath: '/dle/up/ssl-amc',
    localDocApiPath: '/api/up/amc',
    pages: {
      lightAmc: pages.up.offgridAmc,
      lightAmcList: pages.up.offgridAmcList,
      lightAmcDetails: pages.up.offgridAmcDetails,
      dashboard: pages.up.offgridDashboard,
    },
    location: getSslLocationConfig('up'),
  },
  ongrid: {
    key: 'ongrid',
    sslState: 'up',
    stateName: 'Uttar Pradesh',
    moduleTitle: 'UP On Grid AMC',
    requiresVolume: false,
    externalApiPath: '/dle/up/ssl-amc',
    localDocApiPath: '/api/up/amc',
    pages: {
      lightAmc: pages.up.ongridAmc,
      lightAmcList: pages.up.ongridAmcList,
      lightAmcDetails: pages.up.ongridAmcDetails,
      dashboard: pages.up.ongridDashboard,
    },
    location: getSslLocationConfig('up'),
  },
}

export const getSslAmcConfig = (region = 'bihar') =>
  SSL_AMC_REGIONS[region] || SSL_AMC_REGIONS.bihar

export const withRegionVolume = (params, region, volume) => {
  const config = getSslAmcConfig(region)
  if (!config.requiresVolume || !volume) return params
  return { ...params, volume }
}
