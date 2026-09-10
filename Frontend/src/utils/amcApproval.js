export const AMC_DOC_APPROVAL = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
}

export const getAmcApprovalLabel = (status) => {
  const value = Number(status ?? AMC_DOC_APPROVAL.PENDING)

  if (value === AMC_DOC_APPROVAL.APPROVED) return 'Approved'
  if (value === AMC_DOC_APPROVAL.REJECTED) return 'Rejected'
  return 'Pending'
}

export const getAmcApprovalBadgeClass = (status) => {
  const value = Number(status ?? AMC_DOC_APPROVAL.PENDING)

  if (value === AMC_DOC_APPROVAL.APPROVED) {
    return 'bg-soft-success text-success'
  }

  if (value === AMC_DOC_APPROVAL.REJECTED) {
    return 'bg-soft-danger text-danger'
  }

  return 'bg-soft-warning text-warning'
}

export const getRowApprovalSummary = (row) => {
  const documents = (Array.isArray(row?.amc) ? row.amc : []).flatMap(
    (period) => (Array.isArray(period?.document) ? period.document : [])
  )

  if (!documents.length) {
    return {
      status: AMC_DOC_APPROVAL.PENDING,
      label: 'Pending',
    }
  }

  const statuses = documents.map(
    (doc) => Number(doc.approval_status ?? AMC_DOC_APPROVAL.PENDING)
  )

  if (statuses.every((status) => status === AMC_DOC_APPROVAL.APPROVED)) {
    return {
      status: AMC_DOC_APPROVAL.APPROVED,
      label: 'Approved',
    }
  }

  if (statuses.some((status) => status === AMC_DOC_APPROVAL.REJECTED)) {
    return {
      status: AMC_DOC_APPROVAL.REJECTED,
      label: 'Rejected',
    }
  }

  return {
    status: AMC_DOC_APPROVAL.PENDING,
    label: 'Pending',
  }
}

export const formatApprovalDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
