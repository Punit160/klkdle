import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FiEye, FiEyeOff, FiRefreshCw, FiTrash2, FiUserCheck } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getUser, saveAuthData, getToken } from '../../utils/auth'
import {
  getUserPortalPermissions,
  userCanManagePortalAccess,
  userCanManagePortalApiCredentials,
} from '../../utils/portalAccess'
import ExternalApiIntegrationManual from '../../components/Portal/ExternalApiIntegrationManual'
import {
  isSoftwareAssignablePortalRole,
  SSL_AMC_READ_DASHBOARD_PAIRS,
  syncSslAmcDashboardPermissionKeys,
} from '../../constants/portalPermissions'
import { userIsAdmin } from '../../utils/userRoles'

const MODULE_LABELS = {
  admin: 'Administration',
  bihar_amc: 'Bihar SSL AMC',
  up_amc: 'UP SSL AMC',
  bihar_light_amc: 'Bihar field AMC',
  up_light_amc: 'UP field AMC',
  bihar_ula: 'Bihar ULA',
  other: 'Other',
}

const normalizePermission = (p) => ({
  id: p.id,
  key: p.key || p.permission_key,
  label: p.label || p.key || p.permission_key,
  module: p.module || 'other',
  description: p.description,
})

const groupByModule = (permissions) => {
  const map = new Map()
  permissions.forEach((p) => {
    const key = p.module || 'other'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  })
  return map
}

const permKeysEqual = (a, b) => {
  const sa = [...(a || [])].sort().join('|')
  const sb = [...(b || [])].sort().join('|')
  return sa === sb
}

const PortalAccessAdmin = () => {
  const [authVersion, setAuthVersion] = useState(0)
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    const refresh = () => setAuthVersion((n) => n + 1)
    window.addEventListener('dle-auth-updated', refresh)
    return () => window.removeEventListener('dle-auth-updated', refresh)
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = getToken()
    if (!token) {
      setPortalReady(true)
      return undefined
    }
    localApi
      .get(app.portal.me)
      .then((res) => {
        if (cancelled) return
        const keys = res.data?.data?.permission_keys || []
        const current = getUser() || {}
        if (!permKeysEqual(keys, getUserPortalPermissions(current))) {
          saveAuthData(token, { ...current, portal_permissions: keys })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPortalReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const user = getUser()
  const isAdmin = userIsAdmin(user)
  const canManageRoles = userCanManagePortalAccess(user) || isAdmin
  const canManageApi = userCanManagePortalApiCredentials(user) || isAdmin
  const canManage = canManageRoles || canManageApi

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])
  const [companyUsers, setCompanyUsers] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [selectedPermKeys, setSelectedPermKeys] = useState([])
  const [assignMode, setAssignMode] = useState('by-role')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleIds, setAssignRoleIds] = useState([])
  const [lockedUserRoleIds, setLockedUserRoleIds] = useState([])
  const [bulkRoleId, setBulkRoleId] = useState('')
  const [bulkMemberUserIds, setBulkMemberUserIds] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [userStateFilter, setUserStateFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiCredentials, setApiCredentials] = useState([])
  const [integrationCatalog, setIntegrationCatalog] = useState(null)
  const [credLabel, setCredLabel] = useState('External portal')
  const [credSecret, setCredSecret] = useState('')
  const [showCredSecret, setShowCredSecret] = useState(false)
  const [showRevealedSecret, setShowRevealedSecret] = useState(false)
  const [credScopes, setCredScopes] = useState(['all'])
  const [revealedCredential, setRevealedCredential] = useState(null)

  const formatUserState = (state) => {
    const s = String(state || '').trim()
    return s || 'No state'
  }

  const userStateOptions = useMemo(() => {
    const set = new Set()
    companyUsers.forEach((u) => set.add(formatUserState(u.state)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [companyUsers])

  const userOptionLabel = (u) => {
    const state = formatUserState(u.state)
    return `${u.name} · ${state} (${u.email})`
  }

  const permGroups = useMemo(() => groupByModule(permissions), [permissions])

  const assignableRoles = useMemo(
    () => roles.filter((role) => isSoftwareAssignablePortalRole(role)),
    [roles]
  )

  const loadIntegrationCatalog = useCallback(async () => {
    if (!canManageApi) return
    try {
      const res = await localApi.get(app.portal.integrationCatalog)
      setIntegrationCatalog(res.data?.data || null)
    } catch {
      setIntegrationCatalog(null)
    }
  }, [canManageApi])

  const loadApiCredentials = useCallback(async () => {
    if (!canManageApi) return
    try {
      const res = await localApi.get(app.portal.apiCredentials)
      setApiCredentials(res.data?.data || [])
      await loadIntegrationCatalog()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load API credentials.'
      if (err.response?.status === 500 && /portal_api_credentials/i.test(String(msg))) {
        setError('API credentials table missing. Run database migration on the server.')
      } else {
        setError(msg)
      }
    }
  }, [canManageApi, loadIntegrationCatalog])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const requests = [localApi.get(app.portal.permissions)]
      if (canManageRoles) {
        requests.push(localApi.get(app.portal.roles), localApi.get(app.portal.users))
      }
      const results = await Promise.all(requests)
      const permRes = results[0]
      const permRows = (permRes.data?.data || []).map(normalizePermission).filter((p) => p.key)
      setPermissions(permRows)
      if (canManageRoles) {
        setRoles(results[1]?.data?.data || [])
        setCompanyUsers(results[2]?.data?.data || [])
      }
      await loadApiCredentials()
    } catch (err) {
      const status = err.response?.status
      if (status === 403) {
        setError(
          err.response?.data?.message ||
            'You need portal access permission, or your user must have company_id set.'
        )
      } else {
        setError(err.response?.data?.message || 'Failed to load portal access data.')
      }
    } finally {
      setLoading(false)
    }
  }, [canManageRoles, loadApiCredentials])

  useEffect(() => {
    if (canManage) loadAll()
    else setLoading(false)
  }, [canManage, loadAll, authVersion])

  const resetRoleForm = () => {
    setSelectedRoleId('')
    setRoleName('')
    setRoleDescription('')
    setSelectedPermKeys([])
  }

  const loadRoleMembers = useCallback(async (roleId) => {
    if (!roleId) {
      setBulkMemberUserIds([])
      return
    }
    try {
      const res = await localApi.get(app.portal.roleMembers(roleId))
      setBulkMemberUserIds(res.data?.data?.user_ids || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users for this role.')
    }
  }, [])

  const mergePermissionsForRole = useCallback((roleKeys) => {
    if (!roleKeys?.length) return
    setPermissions((prev) => {
      const known = new Set(prev.map((p) => p.key))
      const extras = roleKeys
        .filter((k) => k && !known.has(k))
        .map((k) => ({
          id: null,
          key: k,
          label: k,
          module: 'other',
          description: 'Legacy or custom permission key',
        }))
      return extras.length ? [...prev, ...extras] : prev
    })
  }, [])

  const editRole = (role) => {
    if (!isSoftwareAssignablePortalRole(role)) {
      setError(
        'This role includes portal admin permissions and is maintained in the database only.'
      )
      return
    }
    const keys = role.permission_keys || []
    mergePermissionsForRole(keys)
    setSelectedRoleId(role.id)
    setRoleName(role.name)
    setRoleDescription(role.description || '')
    setSelectedPermKeys(syncSslAmcDashboardPermissionKeys(keys))
    setBulkRoleId(role.id)
    loadRoleMembers(role.id)
  }

  const allPermissionKeys = useMemo(() => permissions.map((p) => p.key), [permissions])

  const selectAllPermissions = () => setSelectedPermKeys([...allPermissionKeys])

  const clearAllPermissions = () => setSelectedPermKeys([])

  const toggleModulePermissions = (moduleKey, items, selectAll) => {
    const moduleKeys = items.map((p) => p.key)
    setSelectedPermKeys((prev) => {
      if (selectAll) {
        return [...new Set([...prev, ...moduleKeys])]
      }
      return prev.filter((k) => !moduleKeys.includes(k))
    })
  }

  const filteredCompanyUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    return companyUsers.filter((u) => {
      const stateLabel = formatUserState(u.state)
      if (userStateFilter && stateLabel !== userStateFilter) return false
      if (!q) return true
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        stateLabel.toLowerCase().includes(q) ||
        String(u.contact_no || '').includes(q)
      )
    })
  }, [companyUsers, userSearch, userStateFilter])

  const filteredUsersByState = useMemo(() => {
    const map = new Map()
    filteredCompanyUsers.forEach((u) => {
      const key = formatUserState(u.state)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(u)
    })
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredCompanyUsers])

  const toggleBulkMember = (userId) => {
    setBulkMemberUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const selectAllFilteredMembers = () => {
    const ids = filteredCompanyUsers.map((u) => u.id)
    setBulkMemberUserIds((prev) => [...new Set([...prev, ...ids])])
  }

  const clearBulkMembers = () => setBulkMemberUserIds([])

  const saveRoleMembers = async () => {
    if (!bulkRoleId) return
    setSaving(true)
    setError('')
    try {
      await localApi.put(app.portal.roleMembers(bulkRoleId), {
        user_ids: bulkMemberUserIds,
      })
      await loadAll()
      await loadRoleMembers(bulkRoleId)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign role to users.')
    } finally {
      setSaving(false)
    }
  }

  const onBulkRoleChange = (roleId) => {
    setBulkRoleId(roleId)
    loadRoleMembers(roleId)
  }

  const togglePerm = (key) => {
    setSelectedPermKeys((prev) => {
      let next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      for (const [readKey, dashKey] of SSL_AMC_READ_DASHBOARD_PAIRS) {
        if (key === readKey) {
          if (next.includes(readKey)) next = [...new Set([...next, dashKey])]
          else next = next.filter((k) => k !== dashKey)
        }
      }
      return next
    })
  }

  const saveRole = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: roleName.trim(),
        description: roleDescription.trim(),
        permission_keys: syncSslAmcDashboardPermissionKeys(selectedPermKeys),
      }
      let savedKeys = payload.permission_keys
      if (selectedRoleId) {
        const res = await localApi.put(app.portal.role(selectedRoleId), payload)
        savedKeys = res.data?.data?.permission_keys || savedKeys
      } else {
        const res = await localApi.post(app.portal.roles, payload)
        savedKeys = res.data?.data?.permission_keys || savedKeys
      }
      if (savedKeys.length !== payload.permission_keys.length) {
        setError(
          `Role saved with ${savedKeys.length} of ${payload.permission_keys.length} permissions. Refresh and try again.`
        )
      } else {
        resetRoleForm()
      }
      await loadAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save role.')
    } finally {
      setSaving(false)
    }
  }

  const deleteRole = async (roleId) => {
    if (!window.confirm('Delete this role? Users will lose these permissions.')) return
    setSaving(true)
    try {
      await localApi.delete(app.portal.role(roleId))
      if (selectedRoleId === roleId) resetRoleForm()
      await loadAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete role.')
    } finally {
      setSaving(false)
    }
  }

  const loadUserRoles = async (userId) => {
    setAssignUserId(userId)
    setLockedUserRoleIds([])
    if (!userId) {
      setAssignRoleIds([])
      return
    }
    try {
      const res = await localApi.get(app.portal.userRoles(userId))
      const assignments = res.data?.data?.roles || []
      const locked = assignments
        .filter((a) => !isSoftwareAssignablePortalRole({ permission_keys: a.permission_keys }))
        .map((a) => a.role_id)
      setLockedUserRoleIds(locked)
      const allIds = res.data?.data?.role_ids || []
      setAssignRoleIds(allIds.filter((id) => !locked.includes(id)))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user roles.')
    }
  }

  const saveUserRoles = async () => {
    if (!assignUserId) return
    setSaving(true)
    try {
      await localApi.put(app.portal.userRoles(assignUserId), {
        role_ids: [...new Set([...lockedUserRoleIds, ...assignRoleIds])],
      })
      await loadAll()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign roles.')
    } finally {
      setSaving(false)
    }
  }

  const createApiCredential = async (e) => {
    e.preventDefault()
    const scopes = credScopes.length ? credScopes : ['all']
    if (!credSecret.trim() || credSecret.trim().length < 8) {
      setError('Secret password must be at least 8 characters.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await localApi.post(app.portal.apiCredentials, {
        label: credLabel.trim(),
        secret: credSecret.trim(),
        scopes,
      })
      setRevealedCredential(res.data?.data || null)
      setShowRevealedSecret(false)
      setCredSecret('')
      setShowCredSecret(false)
      setCredScopes(['all'])
      await loadApiCredentials()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create API credential.')
    } finally {
      setSaving(false)
    }
  }

  const deleteApiCredential = async (id) => {
    if (!window.confirm('Delete this API credential? The external portal will stop working.')) return
    setSaving(true)
    try {
      await localApi.delete(app.portal.apiCredential(id))
      await loadApiCredentials()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete credential.')
    } finally {
      setSaving(false)
    }
  }

  const toggleCredScope = (scope) => {
    if (scope === 'all') {
      setCredScopes((prev) => (prev.includes('all') ? [] : ['all']))
      return
    }
    setCredScopes((prev) => {
      const withoutAll = prev.filter((s) => s !== 'all')
      return withoutAll.includes(scope)
        ? withoutAll.filter((s) => s !== scope)
        : [...withoutAll, scope]
    })
  }

  if (!portalReady) {
    return (
      <>
        <PageHeader title="Portal access" />
        <div className="main-content">
          <CardLoader />
        </div>
      </>
    )
  }

  if (!canManage) {
    return (
      <>
        <PageHeader title="Portal access" />
        <div className="alert alert-warning m-3">
          Portal roles and API credentials are managed only by DLE administrators (
          <code>users.role=1</code> in the database). Module access for field users is assigned
          through portal roles by a DLE admin.
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Portal roles & permissions" />
      <div className="main-content">
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2">
            {error}
            <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={loadAll}>
              Retry
            </button>
          </div>
        )}

        <div className="row g-3">
          {canManageRoles && (
          <div className="col-xl-5">
            <div className="card stretch stretch-full">
              <CardHeader title="Roles" />
              {loading ? (
                <CardLoader />
              ) : (
                <div className="card-body">
                  <div className="list-group mb-3">
                    {roles.map((role) => {
                      const assignable = isSoftwareAssignablePortalRole(role)
                      return (
                      <div
                        key={role.id}
                        className={`list-group-item d-flex justify-content-between align-items-start ${
                          selectedRoleId === role.id ? 'border-primary border-2 bg-light' : ''
                        }`}
                      >
                        <button
                          type="button"
                          className="btn btn-link text-body text-start p-0 border-0 shadow-none text-decoration-none"
                          onClick={() => editRole(role)}
                          disabled={!assignable}
                        >
                          <strong>{role.name}</strong>
                          {!assignable && (
                            <span className="badge bg-secondary ms-1 fs-10">DB only</span>
                          )}
                          <div className="fs-12 opacity-75">
                            {role.user_count} user(s) · {role.permission_keys?.length || 0} permissions
                          </div>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteRole(role.id)}
                          disabled={saving || !assignable}
                          aria-label="Delete role"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )})}
                    {!roles.length && (
                      <div className="text-muted fs-13">No roles yet. Create one below.</div>
                    )}
                  </div>

                  <form onSubmit={saveRole}>
                    <h6 className="mb-2">{selectedRoleId ? 'Edit role' : 'New role'}</h6>
                    <input
                      className="form-control mb-2"
                      placeholder="Role name"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                      required
                    />
                    <input
                      className="form-control mb-2"
                      placeholder="Description (optional)"
                      value={roleDescription}
                      onChange={(e) => setRoleDescription(e.target.value)}
                    />
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <span className="fs-12 text-muted">
                        {selectedPermKeys.length} of {permissions.length} permissions selected
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={selectAllPermissions}
                        disabled={!permissions.length}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={clearAllPermissions}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="border rounded p-2 mb-2" style={{ maxHeight: 380, overflow: 'auto' }}>
                      {[...permGroups.entries()].map(([module, items]) => {
                        const moduleLabel = MODULE_LABELS[module] || module
                        const allModuleSelected = items.every((p) => selectedPermKeys.includes(p.key))
                        return (
                          <div key={module} className="mb-3">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <div className="fs-11 text-uppercase text-muted fw-semibold">
                                {moduleLabel}
                              </div>
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0 fs-11"
                                onClick={() =>
                                  toggleModulePermissions(module, items, !allModuleSelected)
                                }
                              >
                                {allModuleSelected ? 'Clear module' : 'Select module'}
                              </button>
                            </div>
                            {items.map((p) => (
                              <label key={p.key} className="d-flex gap-2 fs-13 mb-1">
                                <input
                                  type="checkbox"
                                  checked={selectedPermKeys.includes(p.key)}
                                  onChange={() => togglePerm(p.key)}
                                />
                                <span>
                                  {p.label}
                                  <span className="text-muted fs-11 d-block">{p.key}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )
                      })}
                      {!permissions.length && (
                        <div className="text-muted fs-13">
                          No permissions loaded. Use Refresh or check that portal RBAC migration ran.
                        </div>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={saving}>
                        {selectedRoleId ? 'Update role' : 'Create role'}
                      </button>
                      {selectedRoleId && (
                        <button type="button" className="btn btn-light" onClick={resetRoleForm}>
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-light ms-auto"
                        onClick={loadAll}
                        title="Refresh"
                      >
                        <FiRefreshCw />
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
          )}

          {canManageRoles && (
          <div className="col-xl-7">
            <div className="card stretch stretch-full">
              <CardHeader title="Assign roles to users" />
              {loading ? (
                <CardLoader />
              ) : (
                <div className="card-body">
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${assignMode === 'by-role' ? 'active' : ''}`}
                        onClick={() => setAssignMode('by-role')}
                      >
                        <FiUserCheck className="me-1" />
                        One role → many users
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${assignMode === 'by-user' ? 'active' : ''}`}
                        onClick={() => setAssignMode('by-user')}
                      >
                        One user → many roles
                      </button>
                    </li>
                  </ul>

                  {assignMode === 'by-role' && (
                    <>
                      <label className="form-label">Role</label>
                      <select
                        className="form-select mb-2"
                        value={bulkRoleId}
                        onChange={(e) => onBulkRoleChange(e.target.value)}
                      >
                        <option value="">Select role…</option>
                        {assignableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <p className="fs-12 text-muted mb-2">
                        Select all users who should have this role. Other roles on each user are
                        unchanged.
                      </p>

                      {bulkRoleId && (
                        <>
                          <div className="row g-2 mb-2">
                            <div className="col-md-6">
                              <select
                                className="form-select form-select-sm"
                                value={userStateFilter}
                                onChange={(e) => setUserStateFilter(e.target.value)}
                              >
                                <option value="">All states</option>
                                {userStateOptions.map((state) => (
                                  <option key={state} value={state}>
                                    {state}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-md-6">
                              <input
                                type="search"
                                className="form-control form-control-sm"
                                placeholder="Search name, email, state…"
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="d-flex gap-2 mb-2 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={selectAllFilteredMembers}
                              disabled={!filteredCompanyUsers.length}
                            >
                              Select all shown
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={clearBulkMembers}
                            >
                              Clear selection
                            </button>
                            <span className="fs-12 text-muted align-self-center ms-auto">
                              {bulkMemberUserIds.length} selected
                            </span>
                          </div>
                          <div
                            className="border rounded p-2 mb-2"
                            style={{ maxHeight: 320, overflow: 'auto' }}
                          >
                            {filteredUsersByState.map(([state, users]) => (
                              <div key={state} className="mb-2">
                                <div className="fs-11 text-uppercase text-muted fw-semibold sticky-top bg-white py-1">
                                  {state}
                                  <span className="fw-normal text-lowercase ms-1">
                                    ({users.length})
                                  </span>
                                </div>
                                {users.map((u) => (
                                  <label key={u.id} className="d-flex gap-2 fs-13 mb-1 ps-1">
                                    <input
                                      type="checkbox"
                                      checked={bulkMemberUserIds.includes(u.id)}
                                      onChange={() => toggleBulkMember(u.id)}
                                    />
                                    <span>
                                      {u.name}{' '}
                                      <span className="badge bg-light text-dark border me-1">
                                        {formatUserState(u.state)}
                                      </span>
                                      <span className="text-muted">({u.email})</span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            ))}
                            {!filteredCompanyUsers.length && (
                              <div className="text-muted fs-13">No users match your search.</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={saveRoleMembers}
                            disabled={saving}
                          >
                            Save assignments for this role
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {assignMode === 'by-user' && (
                    <>
                      <label className="form-label">Company user</label>
                      <select
                        className="form-select mb-3"
                        value={assignUserId}
                        onChange={(e) => loadUserRoles(e.target.value)}
                      >
                        <option value="">Select user…</option>
                        {companyUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {userOptionLabel(u)}
                          </option>
                        ))}
                      </select>

                      {assignUserId && (
                        <>
                          {lockedUserRoleIds.length > 0 && (
                            <p className="fs-12 text-muted mb-2">
                              Database-only roles (unchanged when you save):{' '}
                              {lockedUserRoleIds
                                .map((id) => roles.find((r) => r.id === id)?.name || id)
                                .join(', ')}
                            </p>
                          )}
                          <div className="mb-2 fw-semibold fs-13">Roles</div>
                          {assignableRoles.map((role) => (
                            <label key={role.id} className="d-flex gap-2 fs-13 mb-1">
                              <input
                                type="checkbox"
                                checked={assignRoleIds.includes(role.id)}
                                onChange={() =>
                                  setAssignRoleIds((prev) =>
                                    prev.includes(role.id)
                                      ? prev.filter((id) => id !== role.id)
                                      : [...prev, role.id]
                                  )
                                }
                              />
                              <span>{role.name}</span>
                            </label>
                          ))}
                          <button
                            type="button"
                            className="btn btn-primary mt-2"
                            onClick={saveUserRoles}
                            disabled={saving}
                          >
                            Save user access
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {canManageApi && (
            <div className="col-12">
              <div className="card stretch stretch-full">
                <CardHeader title="External portal API (key + password)" />
                <div className="card-body">
                  <ExternalApiIntegrationManual
                    catalog={integrationCatalog}
                    apiCredentials={apiCredentials}
                    previewApiKey={revealedCredential?.api_key}
                    previewSecret={revealedCredential?.plain_secret}
                  />

                  {revealedCredential && (
                    <div className="alert alert-success">
                      <strong>Save these now</strong> (secret is shown once):
                      <div className="mt-2 font-monospace fs-12">
                        <div>API Key: {revealedCredential.api_key}</div>
                        <div className="mt-1" style={{ maxWidth: 420 }}>
                          <label className="form-label fs-12 mb-1">Secret</label>
                          <div className="position-relative">
                            <input
                              type={showRevealedSecret ? 'text' : 'password'}
                              className="form-control form-control-sm pe-5 font-monospace bg-white"
                              readOnly
                              value={revealedCredential.plain_secret || ''}
                            />
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-secondary position-absolute top-50 end-0 translate-middle-y me-1 px-2 py-0 border-0 shadow-none text-decoration-none"
                              onClick={() => setShowRevealedSecret((v) => !v)}
                              aria-label={showRevealedSecret ? 'Hide secret' : 'Show secret'}
                            >
                              {showRevealedSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-success mt-2"
                        onClick={() => setRevealedCredential(null)}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  <form className="mb-3" onSubmit={createApiCredential}>
                    <div className="row g-3 align-items-start">
                      <div className="col-md-4">
                        <label className="form-label fs-12 mb-1">Label</label>
                        <input
                          className="form-control form-control-sm"
                          value={credLabel}
                          onChange={(e) => setCredLabel(e.target.value)}
                          placeholder="External portal"
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fs-12 mb-1">Secret password (min 8 chars)</label>
                        <div className="position-relative">
                          <input
                            type={showCredSecret ? 'text' : 'password'}
                            className="form-control form-control-sm pe-5"
                            value={credSecret}
                            onChange={(e) => setCredSecret(e.target.value)}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Enter API secret"
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-secondary position-absolute top-50 end-0 translate-middle-y me-1 px-2 py-0 border-0 shadow-none text-decoration-none"
                            onClick={() => setShowCredSecret((v) => !v)}
                            aria-label={
                              showCredSecret ? 'Hide secret password' : 'Show secret password'
                            }
                          >
                            {showCredSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label fs-12 mb-1 d-block">Scopes</label>
                        <div className="d-flex flex-wrap gap-3 pt-1">
                          {['all', 'read', 'approve', 'write'].map((scope) => (
                            <label key={scope} className="fs-13 mb-0 d-flex align-items-center gap-1">
                              <input
                                type="checkbox"
                                checked={credScopes.includes(scope)}
                                onChange={() => toggleCredScope(scope)}
                              />
                              {scope}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="col-12">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                          Create API credential
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Label</th>
                          <th>API key</th>
                          <th>Scopes</th>
                          <th>Active</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {apiCredentials.map((c) => (
                          <tr key={c.id}>
                            <td>{c.label}</td>
                            <td className="font-monospace fs-12">{c.api_key}</td>
                            <td>{(c.scopes || []).join(', ')}</td>
                            <td>{c.is_active ? 'Yes' : 'No'}</td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteApiCredential(c.id)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!apiCredentials.length && (
                          <tr>
                            <td colSpan={5} className="text-muted fs-13">
                              No API credentials yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default PortalAccessAdmin
