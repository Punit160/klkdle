import { useSearchParams } from 'react-router-dom'
import { AMC_DOC_APPROVAL, getRowApprovalSummary } from '../../utils/amcApproval'
const lightTotals = (row) =>
  (Array.isArray(row?.amc) ? row.amc : []).reduce(
    (acc, period) => {
      acc.total += Number(period.total_lights) || 0
      acc.pending += Number(period.pending_lights) || 0
      return acc
    },
    { total: 0, pending: 0 }
  )

export const isAmcDocumentationComplete = (row) => {
  const lights = lightTotals(row)
  return lights.total > 0 && lights.pending === 0
}

export const summarizeAmcDocuments = (rows) => {
  const stats = {
    total: rows.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    complete: 0,
    lightsPending: 0,
  }
  rows.forEach((row) => {
    const status = getRowApprovalSummary(row).status
    if (status === AMC_DOC_APPROVAL.APPROVED) stats.approved += 1
    else if (status === AMC_DOC_APPROVAL.REJECTED) stats.rejected += 1
    else stats.pending += 1
    if (isAmcDocumentationComplete(row)) stats.complete += 1
    else stats.lightsPending += 1
  })
  return stats
}

export const amcDocumentDistricts = (rows) =>
  [...new Set(rows.map((row) => String(row.district || '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )

export const matchAmcDocument = (row, { approvalFilter, statusFilter, districtFilter, searchTerm }) => {
  const approval = getRowApprovalSummary(row).status
  if (approvalFilter === 'pending' && approval !== AMC_DOC_APPROVAL.PENDING) return false
  if (approvalFilter === 'approved' && approval !== AMC_DOC_APPROVAL.APPROVED) return false
  if (approvalFilter === 'rejected' && approval !== AMC_DOC_APPROVAL.REJECTED) return false
  const complete = isAmcDocumentationComplete(row)
  if (statusFilter === 'completed' && !complete) return false
  if (statusFilter === 'pending' && complete) return false
  if (
    districtFilter &&
    String(row.district || '').trim().toLowerCase() !== districtFilter.toLowerCase()
  ) {
    return false
  }
  const term = String(searchTerm || '').trim().toLowerCase()
  if (!term) return true
  return [row.panchayat, row.district, row.block].some((value) =>
    String(value || '').toLowerCase().includes(term)
  )
}

export const useAmcDocumentFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') || ''
  const districtFilter = (searchParams.get('district') || '').trim()
  const approvalParam = searchParams.get('approval')
  const approvalFilter = approvalParam || (statusFilter || districtFilter ? 'all' : 'pending')

  const apply = (patch) => {
    const approval = Object.prototype.hasOwnProperty.call(patch, 'approval')
      ? patch.approval
      : approvalFilter
    const status = Object.prototype.hasOwnProperty.call(patch, 'status') ? patch.status : statusFilter
    const district = Object.prototype.hasOwnProperty.call(patch, 'district')
      ? patch.district
      : districtFilter
    const next = new URLSearchParams(searchParams)
    if (!approval || (approval === 'pending' && !status && !district)) next.delete('approval')
    else next.set('approval', approval || 'pending')
    if (status) next.set('status', status)
    else next.delete('status')
    if (district) next.set('district', district)
    else next.delete('district')
    setSearchParams(next, { replace: true })
  }

  return { approvalFilter, statusFilter, districtFilter, apply }
}

