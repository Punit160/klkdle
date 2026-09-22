import React, { useMemo, useState } from 'react'
import { APP_API_BASE, joinUrl } from '../../api/config'
import { filterEndpointsForCredentialScopes } from '../../utils/portalApiScopes'

const MODULE_LABELS = {
  bihar_ssl_amc: 'Bihar SSL AMC',
  up_ssl_amc: 'UP SSL AMC',
  bihar_light_amc: 'Bihar field AMC',
  up_light_amc: 'UP field AMC',
  light_amc: 'Field AMC (shared routes)',
  bihar_ula: 'Bihar ULA',
  integration: 'Integration',
}

const scopeBadgeClass = (scope) => {
  if (scope === 'all') return 'bg-dark'
  if (scope === 'approve') return 'bg-warning text-dark'
  if (scope === 'write') return 'bg-info text-dark'
  return 'bg-secondary'
}

const resolveApiBase = (catalogBaseUrl) => {
  if (catalogBaseUrl) return String(catalogBaseUrl).replace(/\/$/, '')
  if (APP_API_BASE) return APP_API_BASE
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

const fillCurl = (template, { apiKey, secret, base }) => {
  if (!template) return ''
  return template
    .replace(/YOUR_API_KEY/g, apiKey || 'YOUR_API_KEY')
    .replace(/YOUR_SECRET/g, secret || 'YOUR_SECRET')
    .replace(/\$\{base\}/g, base)
}

const CopyBlock = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }
  if (!text) return null
  return (
    <div className="position-relative mb-3">
      <pre className="bg-light border rounded p-3 fs-12 mb-0 overflow-auto" style={{ maxHeight: 220 }}>
        {text}
      </pre>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-2"
        onClick={onCopy}
      >
        {copied ? 'Copied' : label}
      </button>
    </div>
  )
}

const ExternalApiIntegrationManual = ({
  catalog,
  apiCredentials = [],
  previewApiKey = '',
  previewSecret = '',
}) => {
  const [manualCredId, setManualCredId] = useState('')

  const auth = catalog?.auth
  const base = resolveApiBase(catalog?.base_url)
  const allEndpoints = useMemo(() => catalog?.endpoints || [], [catalog?.endpoints])

  const selectedCred = useMemo(() => {
    if (!manualCredId) return null
    return apiCredentials.find((c) => String(c.id) === String(manualCredId)) || null
  }, [manualCredId, apiCredentials])

  const previewKey = previewApiKey || selectedCred?.api_key || 'YOUR_API_KEY'
  const previewSec = previewSecret || 'YOUR_SECRET'

  const visibleEndpoints = useMemo(() => {
    if (selectedCred?.scopes?.length) {
      return filterEndpointsForCredentialScopes(allEndpoints, selectedCred.scopes)
    }
    return allEndpoints
  }, [allEndpoints, selectedCred])

  const endpointsByModule = useMemo(() => {
    const map = new Map()
    visibleEndpoints.forEach((route) => {
      const mod = route.module || 'other'
      if (!map.has(mod)) map.set(mod, [])
      map.get(mod).push(route)
    })
    return map
  }, [visibleEndpoints])

  const discoverCurl =
    auth?.examples?.discover_curl ||
    (base
      ? `curl -sS -X GET "${joinUrl(base, '/api/portal/integration/me')}" \\
  -H "X-Portal-Api-Key: YOUR_API_KEY" \\
  -H "X-Portal-Api-Secret: YOUR_SECRET"`
      : '')

  const readCurl = auth?.examples?.read_curl
  const approveCurl = auth?.examples?.approve_curl

  if (!catalog) {
    return <p className="text-muted fs-13 mb-0">Loading integration manual…</p>
  }

  return (
    <div className="external-api-manual border rounded p-3 mb-4 bg-light-subtle">
      <h6 className="mb-2">Integration manual (for the other portal)</h6>
      <p className="fs-13 text-muted mb-3">
        Share this with developers who connect using the API key and secret password from the table
        below. They must send both on every request — no DLE user login required.
      </p>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="fs-12 fw-semibold text-uppercase text-muted mb-1">1. Authentication headers</div>
          <table className="table table-sm table-bordered bg-white mb-0 fs-13">
            <tbody>
              {Object.entries(auth?.headers || {}).map(([header, desc]) => (
                <tr key={header}>
                  <td className="font-monospace">{header}</td>
                  <td>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fs-12 text-muted mt-2 mb-0">{auth?.company_id}</p>
        </div>
        <div className="col-md-6">
          <div className="fs-12 fw-semibold text-uppercase text-muted mb-1">2. Scopes on each credential</div>
          <ul className="fs-13 mb-0 ps-3">
            {Object.entries(auth?.scope_descriptions || {}).map(([scope, desc]) => (
              <li key={scope}>
                <span className={`badge ${scopeBadgeClass(scope)} me-1`}>{scope}</span>
                {desc}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="fs-12 fw-semibold text-uppercase text-muted mb-1">3. API base URL</div>
      <p className="font-monospace fs-13">{base || '(same host as this app)'}</p>

      <div className="fs-12 fw-semibold text-uppercase text-muted mb-1">
        4. Example requests (replace key &amp; secret)
      </div>
      <p className="fs-12 text-muted">Discover allowed routes for a key:</p>
      <CopyBlock text={fillCurl(discoverCurl, { apiKey: previewKey, secret: previewSec, base })} />

      {readCurl && (
        <>
          <p className="fs-12 text-muted mb-1">Read — pending Bihar SSL AMC approvals:</p>
          <CopyBlock text={fillCurl(readCurl, { apiKey: previewKey, secret: previewSec, base })} />
        </>
      )}

      {approveCurl && (
        <>
          <p className="fs-12 text-muted mb-1">Approve — adjust JSON body to your upload id:</p>
          <CopyBlock text={fillCurl(approveCurl, { apiKey: previewKey, secret: previewSec, base })} />
        </>
      )}

      <div className="d-flex flex-wrap align-items-center gap-2 mb-2 mt-3">
        <div className="fs-12 fw-semibold text-uppercase text-muted">5. Endpoint catalog</div>
        {apiCredentials.length > 0 && (
          <select
            className="form-select form-select-sm ms-auto"
            style={{ maxWidth: 320 }}
            value={manualCredId}
            onChange={(e) => setManualCredId(e.target.value)}
          >
            <option value="">All endpoints (full catalog)</option>
            {apiCredentials.map((c) => (
              <option key={c.id} value={c.id}>
                Filter: {c.label || c.api_key} ({(c.scopes || []).join(', ')})
              </option>
            ))}
          </select>
        )}
      </div>
      {selectedCred && (
        <p className="fs-12 text-muted">
          Showing {visibleEndpoints.length} route(s) allowed for scopes:{' '}
          <strong>{(selectedCred.scopes || []).join(', ')}</strong>
        </p>
      )}

      {[...endpointsByModule.entries()].map(([module, routes]) => (
        <div key={module} className="mb-3">
          <div className="fs-12 fw-semibold mb-1">{MODULE_LABELS[module] || module}</div>
          <div className="table-responsive">
            <table className="table table-sm table-bordered bg-white mb-0 fs-12">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 72 }}>Method</th>
                  <th>Path</th>
                  <th style={{ width: 88 }}>Scope</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={`${route.method}-${route.path}`}>
                    <td>
                      <span className="badge bg-primary">{route.method}</span>
                    </td>
                    <td className="font-monospace">{route.path}</td>
                    <td>
                      <span className={`badge ${scopeBadgeClass(route.scope)}`}>{route.scope}</span>
                    </td>
                    <td>{route.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {!visibleEndpoints.length && (
        <p className="text-muted fs-13 mb-0">No endpoints match the selected credential scopes.</p>
      )}
    </div>
  )
}

export default ExternalApiIntegrationManual
