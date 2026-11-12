import { useCallback, useEffect, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { FiActivity, FiPlus, FiTrash2 } from 'react-icons/fi'
import { api } from '../../../api/routes'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    localApi
      .get(api.biharUla.payments, { params: { page: 1, limit: 1 } })
      .then((res) => {
        if (!cancelled) setSummary(res.data?.summary || null)
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
  }, [])

  const sites = Number(summary?.sites) || 0
  const centralAmount = Number(summary?.central_amount) || 33000
  const stateAmount = Number(summary?.state_amount) || 10000
  const centralReceived = Number(summary?.central_received_count) || 0
  const stateReceived = Number(summary?.state_received_count) || 0
  const centralPending = Math.max(sites - centralReceived, 0)
  const statePending = Math.max(sites - stateReceived, 0)
  const collected = Number(summary?.collected) || 0
  const pending = Number(summary?.pending) || 0
  const expense = Number(summary?.expense) || 0

  return (
    <div className="bihar-amc-section-card">
      <div className="bihar-amc-section-head">
        <div className="bihar-amc-section-head-left">
          <div className="bihar-amc-section-icon amc">
            <FiActivity size={20} />
          </div>
          <div>
            <h5>Payments and expenses</h5>
            <p>Collected, pending, and expense for approved ULA sites</p>
          </div>
        </div>
      </div>
      <div className="bihar-amc-section-body">
        {error ? <div className="alert alert-warning py-2 fs-13">{error}</div> : null}
        <div className="bihar-amc-stat-grid">
          <Stat title="Amount to receive" value={inr(summary?.expected)} subtitle="Approved sites × ₹43,000" tone="primary" />
          <Stat title="Collected" value={inr(summary?.collected)} subtitle="Received on approved sites" tone="success" />
          <Stat title="Pending" value={inr(summary?.pending)} subtitle={`${summary?.pending_payment_count ?? 0} approved sites not fully paid`} tone="warning" />
          <Stat title="Full payment" value={summary?.full_payment_count ?? 0} subtitle="Approved sites with both parts" tone="success" />
        </div>
        <div className="bihar-amc-stat-grid">
          <Stat title="Central received" value={summary?.central_received_count ?? 0} subtitle="₹33,000 each" tone="info" />
          <Stat title="State received" value={summary?.state_received_count ?? 0} subtitle="₹10,000 each" tone="info" />
          <Stat title="Expense" value={inr(summary?.expense)} subtitle="Expenses on approved sites" tone="danger" />
          <Stat title="Collected minus expense" value={inr(summary?.balance)} subtitle="Approved sites" tone="primary" />
        </div>
        {loading ? <div className="bihar-amc-empty">Loading payment report…</div> : null}
        {!loading && sites === 0 ? <div className="bihar-amc-empty">No approved ULA sites yet.</div> : null}
        {!loading && sites > 0 ? (
          <>
            <div className="bihar-amc-panel-grid mt-3">
              <div className="bihar-amc-panel">
                <div className="bihar-amc-panel-head">
                  <h6>Collected and pending</h6>
                </div>
                <div className="p-3">
                  <ReactApexChart
                    type="donut"
                    height={280}
                    series={[collected, pending]}
                    options={{
                      labels: ['Collected', 'Pending'],
                      colors: ['#25b865', '#e49e3d'],
                      legend: { position: 'bottom', fontSize: '12px' },
                      dataLabels: { enabled: true },
                      plotOptions: { pie: { donut: { size: '72%' } } },
                      tooltip: { y: { formatter: (value) => inr(value) } },
                    }}
                  />
                </div>
              </div>
              <div className="bihar-amc-panel">
                <div className="bihar-amc-panel-head">
                  <h6>Central, state, and expense</h6>
                </div>
                <div className="p-2 pb-0">
                  <ReactApexChart
                    type="bar"
                    height={280}
                    series={[{
                      name: 'Amount',
                      data: [
                        centralReceived * centralAmount,
                        centralPending * centralAmount,
                        stateReceived * stateAmount,
                        statePending * stateAmount,
                        expense,
                      ],
                    }]}
                    options={{
                      chart: { toolbar: { show: false } },
                      plotOptions: { bar: { borderRadius: 6, columnWidth: '48%', distributed: true } },
                      colors: ['#3454d1', '#e49e3d', '#17a2b8', '#94a3b8', '#ea4d4d'],
                      xaxis: {
                        categories: ['Central received', 'Central pending', 'State received', 'State pending', 'Expense'],
                        labels: { rotate: -25, style: { fontSize: '11px', colors: '#64748b' } },
                      },
                      yaxis: { labels: { formatter: (value) => inr(value) } },
                      grid: { borderColor: '#eef2f6', strokeDashArray: 4 },
                      dataLabels: { enabled: false },
                      legend: { show: false },
                      tooltip: { y: { formatter: (value) => inr(value) } },
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="bihar-amc-footer-stats">
              <div className="bihar-amc-footer-stat"><span>Approved sites</span><strong>{sites}</strong></div>
              <div className="bihar-amc-footer-stat"><span>Full payment</span><strong>{summary?.full_payment_count ?? 0}</strong></div>
              <div className="bihar-amc-footer-stat"><span>Central received</span><strong>{centralReceived}</strong></div>
              <div className="bihar-amc-footer-stat"><span>State received</span><strong>{stateReceived}</strong></div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export const UlaSitePaymentEditor = ({ surveyId, counted = true }) => {
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
      {row && !counted ? (
        <p className="fs-12 text-muted mb-2">This amount is included in the totals after the site is approved.</p>
      ) : null}
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
