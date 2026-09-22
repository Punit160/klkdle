import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiEdit2,
  FiExternalLink,
  FiEye,
  FiEyeOff,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiUpload,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getUser } from '../../utils/auth'
import { resolveUploadUrl } from '../../utils/uploadUrl'
import { isSoftwareAssignablePortalRole } from '../../constants/portalPermissions'
import { approvalStatusLabel, userIsAdmin, USER_ROLE_DEFAULT } from '../../utils/userRoles'

const emptyForm = () => ({
  id: '',
  company_id: '',
  state: '',
  district: '',
  block: '',
  panchayat: '',
  name: '',
  email: '',
  contact_no: '',
  emergency_contact_no: '',
  police_verification_validity: '',
  address: '',
  role: USER_ROLE_DEFAULT,
  status: 0,
  approval_status: 0,
  approval_remarks: '',
  admin_remark: '',
  password: '',
  educational_document: '',
  aadhaar_voter_id: '',
  pan_card: '',
  driving_license: '',
  police_verification: '',
  cancelled_cheque: '',
  rent_agreement_electricity_bill: '',
  profile_image: '',
  portal_role_ids: [],
})

const USER_DOCUMENT_FIELDS = [
  { key: 'profile_image', label: 'Profile photo' },
  { key: 'educational_document', label: 'Educational document' },
  { key: 'aadhaar_voter_id', label: 'Aadhaar / Voter ID' },
  { key: 'pan_card', label: 'PAN card' },
  { key: 'driving_license', label: 'Driving license' },
  { key: 'police_verification', label: 'Police verification' },
  { key: 'cancelled_cheque', label: 'Cancelled cheque' },
  { key: 'rent_agreement_electricity_bill', label: 'Rent / electricity bill' },
]

const isImageUpload = (storedPath, file) => {
  if (file) return String(file.type || '').startsWith('image/')
  const url = resolveUploadUrl(storedPath)
  return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) || /\.(jpe?g|png|gif|webp)$/i.test(String(storedPath || ''))
}

const UserDocumentUpload = ({ label, fieldKey, storedPath, draftFile, onPick }) => {
  const previewUrl = useMemo(() => {
    if (draftFile) return URL.createObjectURL(draftFile)
    return resolveUploadUrl(storedPath)
  }, [draftFile, storedPath])

  useEffect(() => {
    if (!draftFile || !previewUrl?.startsWith('blob:')) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [draftFile, previewUrl])

  const showImage = previewUrl && isImageUpload(storedPath, draftFile)

  return (
    <div className={fieldKey === 'profile_image' ? 'col-md-12' : 'col-md-6 col-lg-4'}>
      <label className="form-label fs-13 mb-1">{label}</label>
      <div className="border rounded p-2 bg-light mb-2">
        {previewUrl ? (
          showImage ? (
            <img
              src={previewUrl}
              alt={label}
              className="rounded d-block"
              style={{
                maxHeight: fieldKey === 'profile_image' ? 160 : 120,
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="fs-13 d-inline-flex align-items-center gap-1"
            >
              <FiExternalLink /> View current file
            </a>
          )
        ) : (
          <span className="text-muted fs-12">No file uploaded</span>
        )}
        {draftFile && (
          <div className="fs-11 text-success mt-1">New file selected: {draftFile.name}</div>
        )}
      </div>
      <label className="btn btn-sm btn-outline-primary mb-0">
        <FiUpload className="me-1" />
        {storedPath || draftFile ? 'Replace file' : 'Upload file'}
        <input
          type="file"
          className="d-none"
          accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
          onChange={(e) => {
            onPick(fieldKey, e.target.files?.[0] || null)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}

const STATE_FILTER_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'Bihar', label: 'Bihar' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
  { value: 'UP', label: 'UP' },
]

const buildUserFormData = (form, fileDrafts, adminCompanyId) => {
  const fd = new FormData()
  const skip = new Set(['id', 'portal_roles'])
  const fileFields = new Set(USER_DOCUMENT_FIELDS.map((d) => d.key))
  Object.entries(form).forEach(([key, value]) => {
    if (skip.has(key) || fileFields.has(key)) return
    if (key === 'portal_role_ids') {
      fd.append(key, JSON.stringify(value || []))
      return
    }
    if (value !== undefined && value !== null && value !== '') {
      fd.append(key, String(value))
    }
  })
  fd.append('company_id', form.company_id || adminCompanyId || '')
  Object.entries(fileDrafts).forEach(([key, file]) => {
    if (file) fd.append(key, file)
  })
  return fd
}

const UserMaster = () => {
  const [authVersion, setAuthVersion] = useState(0)
  useEffect(() => {
    const refresh = () => setAuthVersion((n) => n + 1)
    window.addEventListener('dle-auth-updated', refresh)
    return () => window.removeEventListener('dle-auth-updated', refresh)
  }, [])

  const actor = getUser()
  const isAdmin = userIsAdmin(actor)
  const adminCompanyId = String(actor?.company_id ?? actor?.companyId ?? '').trim()

  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0 })
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState('')
  const [filterApproval, setFilterApproval] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(emptyForm())
  const [portalRoles, setPortalRoles] = useState([])
  const [mode, setMode] = useState('list')
  const [showPassword, setShowPassword] = useState(false)
  const [fileDrafts, setFileDrafts] = useState({})

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await localApi.get(app.userMaster.users, {
        params: {
          page,
          limit: 20,
          search: searchQuery || undefined,
          state: filterState === '' ? undefined : filterState,
          approval_status: filterApproval === '' ? undefined : filterApproval,
        },
      })
      setUsers(res.data?.data || [])
      setMeta(res.data?.meta || { page: 1, total_pages: 1, total: 0 })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [page, searchQuery, filterState, filterApproval])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, 400)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (isAdmin) loadUsers()
    else setLoading(false)
  }, [isAdmin, loadUsers, authVersion])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, filterState, filterApproval])

  const loadPortalRoles = async (companyId) => {
    if (!companyId) {
      setPortalRoles([])
      return
    }
    try {
      const res = await localApi.get(app.portal.roles)
      setPortalRoles(res.data?.data || [])
    } catch {
      setPortalRoles([])
    }
  }

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      company_id: adminCompanyId,
    })
    setShowPassword(false)
    setFileDrafts({})
    setMode('form')
    loadPortalRoles(adminCompanyId)
  }

  const setFileDraft = (fieldKey, file) => {
    setFileDrafts((prev) => {
      const next = { ...prev }
      if (file) next[fieldKey] = file
      else delete next[fieldKey]
      return next
    })
  }

  const openEdit = async (id) => {
    setError('')
    setDetailLoading(true)
    try {
      const res = await localApi.get(app.userMaster.user(id))
      const u = res.data?.data
      setForm({
        ...emptyForm(),
        ...u,
        password: u.password ?? '',
        portal_role_ids: u.portal_role_ids || [],
      })
      setShowPassword(false)
      setFileDrafts({})
      await loadPortalRoles(u.company_id)
      setMode('form')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user.')
    } finally {
      setDetailLoading(false)
    }
  }

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const togglePortalRole = (roleId) => {
    setForm((prev) => {
      const ids = prev.portal_role_ids || []
      return {
        ...prev,
        portal_role_ids: ids.includes(roleId)
          ? ids.filter((id) => id !== roleId)
          : [...ids, roleId],
      }
    })
  }

  const saveUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      delete payload.id
      payload.company_id = form.company_id || adminCompanyId || null
      if (form.id && !String(payload.password || '').trim()) {
        delete payload.password
      }
      if (!form.id && !String(payload.password || '').trim()) {
        setError('Password is required for new users.')
        setSaving(false)
        return
      }

      const hasFiles = Object.values(fileDrafts).some(Boolean)
      if (hasFiles) {
        const fd = buildUserFormData(form, fileDrafts, adminCompanyId)
        if (form.id) {
          await localApi.put(app.userMaster.user(form.id), fd)
        } else {
          await localApi.post(app.userMaster.users, fd)
        }
      } else if (form.id) {
        await localApi.put(app.userMaster.user(form.id), payload)
      } else {
        await localApi.post(app.userMaster.users, payload)
      }
      setMode('list')
      setForm(emptyForm())
      setFileDrafts({})
      await loadUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="User master" />
        <div className="alert alert-warning m-3">
          Only admin users (role=1) can access user master. Log out and log in again after your
          account is set to role=1 in the database. Admins are not listed in this table (by design).
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="User master" />
      <div className="main-content">
        {error && <div className="alert alert-danger">{error}</div>}

        {mode === 'list' && (
          <div className="card stretch stretch-full">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <h5 className="card-title mb-0">Users</h5>
              <button type="button" className="btn btn-sm btn-primary" onClick={openCreate}>
                <FiPlus className="me-1" /> Add user
              </button>
            </div>
            <div className="card-body border-bottom py-3">
              <div className="row g-3 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label fs-12 text-muted mb-1">Search</label>
                  <input
                    type="search"
                    className="form-control form-control-sm"
                    placeholder="Name, email, contact…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fs-12 text-muted mb-1">State</label>
                  <select
                    className="form-select form-select-sm"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                  >
                    {STATE_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fs-12 text-muted mb-1">Approval</label>
                  <select
                    className="form-select form-select-sm"
                    value={filterApproval}
                    onChange={(e) => setFilterApproval(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="0">Pending</option>
                    <option value="1">Approved</option>
                    <option value="2">Rejected</option>
                  </select>
                </div>
              </div>
              {!loading && (
                <p className="fs-12 text-muted mb-0 mt-3">
                  {meta.total ?? 0} user(s) · page {meta.page ?? page} of {meta.total_pages ?? 1}
                  {searchInput.trim() !== searchQuery && (
                    <span className="ms-2">· updating search…</span>
                  )}
                </p>
              )}
            </div>
            {loading ? (
              <CardLoader />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-3">Name</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Company</th>
                        <th>Portal roles</th>
                        <th>Approval</th>
                        <th>Status</th>
                        <th>State</th>
                        <th className="text-end pe-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="ps-3 fw-medium">{u.name}</td>
                          <td className="text-muted fs-13">{u.email}</td>
                          <td className="fs-13">{u.contact_no || '—'}</td>
                          <td className="fs-13">{u.company_id || '—'}</td>
                          <td className="fs-13">
                            {(u.portal_role_names?.length
                              ? u.portal_role_names.join(', ')
                              : null) || '—'}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                Number(u.approval_status) === 1
                                  ? 'bg-soft-success text-success'
                                  : Number(u.approval_status) === 2
                                    ? 'bg-soft-danger text-danger'
                                    : 'bg-soft-warning text-warning'
                              }`}
                            >
                              {approvalStatusLabel(u.approval_status)}
                            </span>
                          </td>
                          <td className="fs-13">{Number(u.status) === 1 ? 'Active' : 'Inactive'}</td>
                          <td className="fs-13">{u.state || '—'}</td>
                          <td className="text-end pe-3">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEdit(u.id)}
                              title="Edit user"
                            >
                              <FiEdit2 />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!users.length && (
                        <tr>
                          <td colSpan={9} className="text-center text-muted py-5">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="card-footer d-flex justify-content-center">
                  <Pagination
                    currentPage={page}
                    totalPages={meta.total_pages || 1}
                    onPageChange={setPage}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {mode === 'form' && (
          <form className="card stretch stretch-full" onSubmit={saveUser}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{form.id ? 'Edit user' : 'Add user'}</h6>
              <button type="button" className="btn btn-light btn-sm" onClick={() => setMode('list')}>
                Back to list
              </button>
            </div>
            {detailLoading ? (
              <CardLoader />
            ) : (
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Name *</label>
                  <input className="form-control" name="name" value={form.name} onChange={onChange} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Company ID</label>
                  <input
                    className="form-control bg-light"
                    name="company_id"
                    value={form.company_id || adminCompanyId || '—'}
                    readOnly
                    disabled
                    title="Company cannot be changed here"
                  />
                  <p className="fs-11 text-muted mb-0 mt-1">
                    Fixed for your organization (not editable).
                  </p>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Role</label>
                  <input className="form-control bg-light" value="Field user (2)" readOnly disabled />
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    Login password {form.id ? '(edit to change)' : '*'}
                  </label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control pe-5"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      autoComplete="new-password"
                      required={!form.id}
                      placeholder={form.id ? 'Current login password' : 'Set login password'}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-secondary position-absolute top-50 end-0 translate-middle-y me-1 px-2 py-0 border-0 shadow-none text-decoration-none"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {form.id && (
                    <p className="fs-11 text-muted mb-0 mt-1">
                      Use the eye icon to view the stored login password. Clear the field and save only
                      if you want to keep it unchanged — leave as-is and save other fields.
                    </p>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Contact</label>
                  <input className="form-control" name="contact_no" value={form.contact_no} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Emergency contact</label>
                  <input
                    className="form-control"
                    name="emergency_contact_no"
                    value={form.emergency_contact_no}
                    onChange={onChange}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Police verification validity</label>
                  <input
                    className="form-control"
                    name="police_verification_validity"
                    value={form.police_verification_validity}
                    onChange={onChange}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">State</label>
                  <input className="form-control" name="state" value={form.state} onChange={onChange} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">District</label>
                  <input className="form-control" name="district" value={form.district} onChange={onChange} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Block</label>
                  <input className="form-control" name="block" value={form.block} onChange={onChange} />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Panchayat</label>
                  <input className="form-control" name="panchayat" value={form.panchayat} onChange={onChange} />
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <textarea className="form-control" rows={2} name="address" value={form.address} onChange={onChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select className="form-select" name="status" value={form.status} onChange={onChange}>
                    <option value={0}>Inactive (0)</option>
                    <option value={1}>Active (1)</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Approval status</label>
                  <select
                    className="form-select"
                    name="approval_status"
                    value={form.approval_status}
                    onChange={onChange}
                  >
                    <option value={0}>Pending</option>
                    <option value={1}>Approved</option>
                    <option value={2}>Rejected</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Approval remarks</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    name="approval_remarks"
                    value={form.approval_remarks}
                    onChange={onChange}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Admin remark</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    name="admin_remark"
                    value={form.admin_remark}
                    onChange={onChange}
                  />
                </div>

                <div className="col-12">
                  <h6 className="text-muted fs-13 mb-2">Profile & documents</h6>
                  <p className="fs-12 text-muted mb-2">
                    Preview current files and upload replacements (PDF, JPG, PNG — max 5MB each).
                  </p>
                </div>
                {USER_DOCUMENT_FIELDS.map(({ key, label }) => (
                  <UserDocumentUpload
                    key={key}
                    fieldKey={key}
                    label={label}
                    storedPath={form[key]}
                    draftFile={fileDrafts[key]}
                    onPick={setFileDraft}
                  />
                ))}

                {portalRoles.length > 0 && (
                  <div className="col-12">
                    <h6 className="fs-13 mb-2">Portal roles (same company)</h6>
                    {portalRoles
                      .filter((r) => !isSoftwareAssignablePortalRole(r))
                      .filter((r) => (form.portal_role_ids || []).includes(r.id))
                      .map((r) => (
                        <span key={r.id} className="badge bg-secondary me-2 mb-1">
                          {r.name} (DB only)
                        </span>
                      ))}
                    {portalRoles.filter(isSoftwareAssignablePortalRole).map((r) => (
                      <label key={r.id} className="d-flex gap-2 fs-13 me-3 d-inline-flex">
                        <input
                          type="checkbox"
                          checked={(form.portal_role_ids || []).includes(r.id)}
                          onChange={() => togglePortalRole(r.id)}
                        />
                        {r.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
            <div className="card-footer">
              <button type="submit" className="btn btn-primary" disabled={saving || detailLoading}>
                <FiSave className="me-1" />
                {saving ? 'Saving…' : 'Save user'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

export default UserMaster
