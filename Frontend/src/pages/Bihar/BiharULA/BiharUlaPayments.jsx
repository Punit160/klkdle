import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiActivity, FiPlus, FiTrash2 } from 'react-icons/fi'
import Pagination from '@/components/shared/Pagination'
import { api, pages } from '../../../api/routes'
import localApi from '../../../api/localApi'
import { getApiErrorMessage } from '../../../utils/apiError'

const inr = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const Stat = ({ title, value, subtitle, tone = 'primary' }) => (
  <div className="bihar-amc-stat">
    <div className="bihar-amc-stat-top">
      <div className={`bihar-amc-stat-icon ${tone}`}>
        <FiActivity size={18} />
      </div>
      <strong>{value}</strong>
    </div>
    <span>{title}</span>
    {subtitle ? <small>{subtitle}</small> : null}
  </div>
)

const BiharUlaPayments = () => {
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    localApi
      .get(api.biharUla.payments, { params: { page, limit: 12 } })
      .then((res) => {
        if (cancelled) return
        setSummary(res.data?.summary || null)
        setRows(res.data?.data || [])
        setMeta(res.data?.meta || { page: 1, total_pages: 1, total: 0 })
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'Could not load site payments.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <div className="bihar-amc-section-card">
      <div className="bihar-amc-section-head">
        <div className="bihar-amc-section-head-left">
          <div className="bihar-amc-section-icon amc">
            <FiActivity size={20} />
          </div>
          <div>
            <h5>Payments and expenses</h5>
            <p>Collected, pending, and expense for every ULA site</p>
          </div>
        </div>
      </div>
      <div className="bihar-amc-section-body">
        {error ? <div className="alert alert-warning py-2 fs-13">{error}</div> : null}
        <div className="bihar-amc-stat-grid">
          <Stat title="Amount to receive" value={inr(summary?.expected)} subtitle="Central ₹33,000 + State ₹10,000" tone="primary" />
          <Stat title="Collected" value={inr(summary?.collected)} subtitle="Payments marked received" tone="success" />
          <Stat title="Pending" value={inr(summary?.pending)} subtitle={`${summary?.pending_payment_count ?? 0} sites not fully paid`} tone="warning" />
          <Stat title="Full payment" value={summary?.full_payment_count ?? 0} subtitle="Both parts received" tone="success" />
        </div>
        <div className="bihar-amc-stat-grid">
          <Stat title="Central received" value={summary?.central_received_count ?? 0} subtitle="₹33,000 each" tone="info" />
          <Stat title="State received" value={summary?.state_received_count ?? 0} subtitle="₹10,000 each" tone="info" />
          <Stat title="Expense" value={inr(summary?.expense)} subtitle="All site expenses" tone="danger" />
          <Stat title="Collected minus expense" value={inr(summary?.balance)} subtitle="Revenue against expense" tone="primary" />
        </div>
        <div className="table-responsive mt-3">
          <table className="table bihar-amc-table mb-0">
            <thead>
              <tr>
                <th>CA</th>
                <th>Location</th>
                <th>Central</th>
                <th>State</th>
                <th>Collected</th>
                <th>Pending</th>
                <th>Expense</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><div className="bihar-amc-empty">Loading payments…</div></td></tr>
              ) : null}
              {!loading && rows.length === 0 ? (
                <tr><td colSpan={7}><div className="bihar-amc-empty">No ULA sites yet.</div></td></tr>
              ) : null}
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="fw-semibold" to={`${pages.bihar.ulaDetails}?id=${row.id}`}>
                      {row.ca_no || '—'}
                    </Link>
                    <div className="fs-11 text-muted">{row.consumer_name || '—'}</div>
                  </td>
                  <td className="fs-12 text-muted">{[row.district, row.block, row.village].filter(Boolean).join(' / ') || '—'}</td>
                  <td>{row.central_received ? 'Received' : 'Pending'}</td>
                  <td>{row.state_received ? 'Received' : 'Pending'}</td>
                  <td>{inr(row.collected)}</td>
                  <td>{inr(row.pending)}</td>
                  <td>{inr(row.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta.total_pages > 1 ? (
          <div className="mt-3">
            <Pagination currentPage={page} totalPages={meta.total_pages} onPageChange={setPage} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const UlaSitePaymentEditor = ({ surveyId }) => {
  const [row, setRow] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')

  const load = useCallback(async () => {
    if (!surveyId) return
    setError('')
    try {
      const res = await localApi.get(api.biharUla.payment(surveyId))
      setRow(res.data?.data || null)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load site payment.'))
    }
  }, [surveyId])

  useEffect(() => {
    load()
  }, [load])

  const patchPayment = async (field, checked) => {
    setBusy(true)
    setError('')
    try {
      await localApi.patch(api.biharUla.payment(surveyId), { [field]: checked })
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update this payment.'))
    } finally {
      setBusy(false)
    }
  }

  const addExpense = async () => {
    setBusy(true)
    setError('')
    try {
      await localApi.post(api.biharUla.paymentExpenses(surveyId), { amount, remarks })
      setAmount('')
      setRemarks('')
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not add this expense.'))
    } finally {
      setBusy(false)
    }
  }

  const removeExpense = async (expenseId) => {
    setBusy(true)
    setError('')
    try {
      await localApi.delete(api.biharUla.paymentExpense(expenseId))
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not remove this expense.'))
    } finally {
      setBusy(false)
    }
  }

  if (!row && !error) return null

  return (
    <div className="ula-detail-section">
      <h6 className="fw-bold mb-3">Payments and expenses</h6>
      {error ? <div className="alert alert-warning py-2 fs-13">{error}</div> : null}
      {row ? (
        <>
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="d-flex align-items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={Boolean(row.central_received)}
                  disabled={busy}
                  onChange={(event) => patchPayment('central_received', event.target.checked)}
                />
                Central ₹33,000 received
              </label>
            </div>
            <div className="col-md-3">
              <label className="d-flex align-items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={Boolean(row.state_received)}
                  disabled={busy}
                  onChange={(event) => patchPayment('state_received', event.target.checked)}
                />
                State ₹10,000 received
              </label>
            </div>
            <div className="col-md-2"><div className="fs-11 text-muted">Collected</div><div className="fw-semibold">{inr(row.payment_collected)}</div></div>
            <div className="col-md-2"><div className="fs-11 text-muted">Pending</div><div className="fw-semibold">{inr(row.payment_pending)}</div></div>
            <div className="col-md-2"><div className="fs-11 text-muted">Balance</div><div className="fw-semibold">{inr(row.payment_balance)}</div></div>
          </div>
          <div className="fs-12 text-muted mb-2">Expense {inr(row.payment_expense)}</div>
          {(row.expenses || []).map((item) => (
            <div key={item.id} className="d-flex justify-content-between gap-2 fs-13 mb-1">
              <span>{inr(item.amount)} · {item.remarks}</span>
              <button type="button" className="btn btn-link btn-sm p-0 text-danger" disabled={busy} onClick={() => removeExpense(item.id)}>
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
          <div className="row g-2 mt-2">
            <div className="col-md-3">
              <input className="form-control form-control-sm" inputMode="decimal" placeholder="Expense amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="col-md-6">
              <input className="form-control form-control-sm" placeholder="Remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} />
            </div>
            <div className="col-md-3">
              <button type="button" className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1" disabled={busy} onClick={addExpense}>
                <FiPlus size={14} /> Add expense
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default BiharUlaPayments
