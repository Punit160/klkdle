export const PORTAL_API_SCOPE_ALL = 'all'

export const credentialAllowsApiScope = (credentialScopes, routeScope) => {
  const set = new Set(Array.isArray(credentialScopes) ? credentialScopes : [])
  if (set.has(PORTAL_API_SCOPE_ALL)) return true
  if (!routeScope) return true
  return set.has(routeScope)
}

export const filterEndpointsForCredentialScopes = (endpoints, credentialScopes) =>
  (endpoints || []).filter((route) =>
    credentialAllowsApiScope(credentialScopes, route.scope)
  )
