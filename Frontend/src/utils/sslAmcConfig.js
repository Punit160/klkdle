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
}

export const getSslAmcConfig = (region = 'bihar') =>
  SSL_AMC_REGIONS[region === 'up' ? 'up' : 'bihar']

export const withRegionVolume = (params, region, volume) => {
  const config = getSslAmcConfig(region)
  if (!config.requiresVolume || !volume) return params
  return { ...params, volume }
}
