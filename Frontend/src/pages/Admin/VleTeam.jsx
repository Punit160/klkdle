import React, { useCallback, useEffect, useState } from 'react'
import { FiEdit2, FiEye, FiEyeOff, FiPlus, FiSave } from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardLoader from '@/components/shared/CardLoader'
import localApi from '../../api/localApi'
import { app } from '../../api/routes'
import { getUser } from '../../utils/auth'
import { approvalStatusLabel, userIsAdmin, userIsDle } from '../../utils/userRoles'

const emptyForm = () => ({
  id: '',
  dle_id: '',
  original_dle_id: '',
  name: '',
  email: '',
  contact_no: '',
  password: '',
})

const VleTeam = () => {
  const actor = getUser()
  const isDle = userIsDle(actor)
  const isAdmin = userIsAdmin(actor)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [vles, setVles] = useState([])
  const [dles, setDles] = useState([])
  const [used, setUsed] = useState(0)
  const [limit, setLimit] = useState(5)
  const [mode, setMode] = useState('list')
  const [form, setForm] = useState(emptyForm())
  const [showPassword, setShowPassword] = useState(false)

  const loadTeam = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await localApi.get(app.team.vles)
      const data = res.data?.data || {}
      setVles(data.vles || [])
      setDles(data.dles || [])
      setUsed(Number(data.used || 0))
      setLimit(Number(data.limit || 5))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load VLEs.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isDle || isAdmin) loadTeam()
    else setLoading(false)
  }, [isDle, isAdmin, loadTeam])

  const openCreate = () => {
    setNotice('')
    setError('')
    setForm(emptyForm())
    setShowPassword(false)
    setMode('form')
  }

  const openEdit = (row) => {
    setNotice('')
    setError('')
    setForm({
      id: row.id,
      dle_id: row.parent_user_id || '',
      original_dle_id: row.parent_user_id || '',
      name: row.name || '',
      email: row.email || '',
      contact_no: row.contact_no || '',
      password: '',
    })
    setShowPassword(false)
    setMode('form')
  }

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const saveVle = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        contact_no: form.contact_no,
      }
      if (isAdmin) payload.dle_id = form.dle_id
      if (!form.id || form.password.trim()) payload.password = form.password
      const res = form.id
        ? await localApi.put(app.team.vle(form.id), payload)
        : await localApi.post(app.team.vles, payload)
      setNotice(res.data?.message || 'VLE saved.')
      setMode('list')
      setForm(emptyForm())
      await loadTeam()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save VLE.')
    } finally {
      setSaving(false)
    }
  }

  if (!isDle && !isAdmin) {
    return (
      <>
        <PageHeader title="Add VLE" />
        <div className="alert alert-warning m-3">
          Only a DLE can add VLEs, and an admin must grant Add VLE on that DLE&apos;s role.
          Each VLE is saved as a user on that DLE&apos;s team.
        </div>
      </>
    )
  }

  const selectedDle = dles.find((dle) => String(dle.id) === String(form.dle_id))
  const slotsLeft = isAdmin
    ? selectedDle
      ? Math.max(Number(selectedDle.limit) - Number(selectedDle.used), 0)
      : null
    : Math.max(limit - used, 0)
  const sameTeamEdit = Boolean(form.id) && String(form.dle_id) === String(form.original_dle_id)
  const teamIsFull = isAdmin
    ? Boolean(selectedDle) && Number(selectedDle.used) >= Number(selectedDle.limit) && !sameTeamEdit
    : slotsLeft < 1

  return (
    <>
      <PageHeader title="Add VLE" />
      <div className="main-content">
        {error && <div className="alert alert-danger">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}

        {mode === 'list' && (
          <div className="card stretch stretch-full">
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <h5 className="card-title mb-1">{isAdmin ? 'VLE teams' : 'My team'}</h5>
                <p className="fs-12 text-muted mb-0">
                  {isAdmin
                    ? `Choose a DLE when you add a VLE. Each DLE can have ${limit} VLEs. A VLE added by a DLE joins that DLE's team.`
                    : `${used} of ${limit} VLEs. A VLE you add joins your team. A rejected VLE frees a slot.`}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={openCreate}
                disabled={!isAdmin && slotsLeft < 1}
              >
                <FiPlus className="me-1" /> Add VLE
              </button>
            </div>
            {loading ? (
              <CardLoader />
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Name</th>
                      {isAdmin && <th>DLE</th>}
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Approval</th>
                      <th>Status</th>
                      <th className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vles.map((row) => (
                      <tr key={row.id}>
                        <td className="ps-3 fw-medium">{row.name}</td>
                        {isAdmin && <td className="fs-13">{row.parent_name || '—'}</td>}
                        <td className="text-muted fs-13">{row.email}</td>
                        <td className="fs-13">{row.contact_no || '—'}</td>
                        <td>
                          <span
                            className={`badge ${
                              Number(row.approval_status) === 1
                                ? 'bg-soft-success text-success'
                                : Number(row.approval_status) === 2
                                  ? 'bg-soft-danger text-danger'
                                  : 'bg-soft-warning text-warning'
                            }`}
                          >
                            {approvalStatusLabel(row.approval_status)}
                          </span>
                        </td>
                        <td className="fs-13">{Number(row.status) === 1 ? 'Active' : 'Inactive'}</td>
                        <td className="text-end pe-3">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => openEdit(row)}
                            title="Edit VLE"
                          >
                            <FiEdit2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!vles.length && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="text-center text-muted py-5">
                          {isAdmin ? 'No VLEs yet.' : `No VLEs yet. Add up to ${limit}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {mode === 'form' && (
          <form className="card stretch stretch-full" onSubmit={saveVle}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{form.id ? 'Edit VLE' : 'Add VLE'}</h6>
              <button type="button" className="btn btn-light btn-sm" onClick={() => setMode('list')}>
                Back to team
              </button>
            </div>
            <div className="card-body">
              <p className="fs-13 text-muted">
                {isAdmin
                  ? 'This VLE is saved as a user on the selected DLE’s team and uses that DLE’s company, location, and portal access.'
                  : `This VLE is saved as a user on your team${
                      slotsLeft ? ` (${slotsLeft} slot${slotsLeft === 1 ? '' : 's'} left)` : ''
                    }. They use your company, location, and portal access.`}
              </p>
              <div className="row g-3">
                {isAdmin && (
                  <div className="col-12">
                    <label className="form-label">DLE *</label>
                    <select
                      className="form-select"
                      name="dle_id"
                      value={form.dle_id}
                      onChange={onChange}
                      required
                    >
                      <option value="">Select DLE</option>
                      {dles.map((dle) => (
                        <option key={dle.id} value={dle.id}>
                          {dle.name} ({dle.used} of {dle.limit})
                        </option>
                      ))}
                    </select>
                    {selectedDle && (
                      <p className="fs-11 text-muted mb-0 mt-1">
                        {teamIsFull
                          ? `${selectedDle.name} already has ${selectedDle.limit} VLEs.`
                          : `${selectedDle.name} has ${selectedDle.used} of ${selectedDle.limit} VLEs.`}
                      </p>
                    )}
                  </div>
                )}
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
                <div className="col-md-6">
                  <label className="form-label">Contact *</label>
                  <input
                    className="form-control"
                    name="contact_no"
                    value={form.contact_no}
                    onChange={onChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Login password {form.id ? '(leave blank to keep)' : '*'}
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
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-secondary position-absolute top-50 end-0 translate-middle-y me-1 px-2 py-0 border-0 shadow-none text-decoration-none"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer">
              <button type="submit" className="btn btn-primary" disabled={saving || teamIsFull}>
                <FiSave className="me-1" />
                {saving ? 'Saving…' : form.id ? 'Save VLE' : 'Add VLE'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

export default VleTeam
