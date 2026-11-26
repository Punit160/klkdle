import { getAmcApprovalLabel } from '../../../utils/amcApproval'

export const INSPECTION_REPORT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'district', label: 'District' },
  { id: 'block', label: 'Block' },
  { id: 'panchayat', label: 'Panchayat' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'approval', label: 'Approval' },
  { id: 'register', label: 'Inspection register' },
]

const GROUP_HEADERS = ['Group', 'Inspections', 'Pending', 'Approved', 'Rejected']

const blankBucket = (label) => ({
  label,
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
})

const addInspection = (bucket, row) => {
  bucket.total += 1
  if (row.status === 1) bucket.approved += 1
  else if (row.status === 2) bucket.rejected += 1
  else bucket.pending += 1
}

export const groupInspections = (rows, labelOf) => {
  const map = new Map()
  rows.forEach((row) => {
    const label = String(labelOf(row) || '').trim() || 'Not set'
    if (!map.has(label)) map.set(label, blankBucket(label))
    addInspection(map.get(label), row)
  })
  return [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

const bucketCells = (row) => [row.label, row.total, row.pending, row.approved, row.rejected]

export const inspectionReportTable = (reportId, rows) => {
  if (reportId === 'district') {
    return {
      title: 'District report',
      headers: GROUP_HEADERS,
      rows: groupInspections(rows, (row) => row.district).map(bucketCells),
    }
  }
  if (reportId === 'block') {
    return {
      title: 'Block report',
      headers: ['District', 'Block', 'Inspections', 'Pending', 'Approved', 'Rejected'],
      rows: groupInspections(rows, (row) => `${row.district || 'Not set'}|||${row.block || 'Not set'}`).map(
        (row) => {
          const [district, block] = row.label.split('|||')
          return [district, block, row.total, row.pending, row.approved, row.rejected]
        }
      ),
    }
  }
  if (reportId === 'panchayat') {
    return {
      title: 'Panchayat report',
      headers: ['District', 'Block', 'Panchayat', 'Inspections', 'Pending', 'Approved', 'Rejected'],
      rows: groupInspections(
        rows,
        (row) => `${row.district || 'Not set'}|||${row.block || 'Not set'}|||${row.panchayat || 'Not set'}`
      ).map((row) => {
        const [district, block, panchayat] = row.label.split('|||')
        return [district, block, panchayat, row.total, row.pending, row.approved, row.rejected]
      }),
    }
  }
  if (reportId === 'inspector') {
    return {
      title: 'Inspector report',
      headers: ['Inspector', 'Inspections', 'Pending', 'Approved', 'Rejected'],
      rows: groupInspections(rows, (row) => row.inspector).map(bucketCells),
    }
  }
  if (reportId === 'daily') {
    return {
      title: 'Daily report',
      headers: GROUP_HEADERS,
      rows: groupInspections(rows, (row) => row.day || 'No date')
        .sort((a, b) => String(b.label).localeCompare(String(a.label)))
        .map(bucketCells),
    }
  }
  if (reportId === 'monthly') {
    return {
      title: 'Monthly report',
      headers: GROUP_HEADERS,
      rows: groupInspections(rows, (row) => row.month || 'No date')
        .sort((a, b) => String(b.label).localeCompare(String(a.label)))
        .map(bucketCells),
    }
  }
  if (reportId === 'approval') {
    return {
      title: 'Approval report',
      headers: ['CA number', 'Consumer', 'District', 'Inspection date', 'Inspector', 'Status', 'Remarks', 'Decision by'],
      rows: [...rows]
        .sort((a, b) => a.status - b.status || String(a.ca).localeCompare(String(b.ca)))
        .map((row) => [
          row.ca,
          row.name,
          row.district,
          row.day,
          row.inspector,
          getAmcApprovalLabel(row.status),
          row.remarks,
          row.by,
        ]),
    }
  }

  return {
    title: 'Inspection register',
    headers: [
      'CA number',
      'Consumer',
      'Mobile',
      'District',
      'Block',
      'Panchayat',
      'Village',
      'Inspection date',
      'Inspector',
      'Photos',
      'Status',
      'Remarks',
      'Latitude',
      'Longitude',
    ],
    rows: rows.map((row) => [
      row.ca,
      row.name,
      row.mobile,
      row.district,
      row.block,
      row.panchayat,
      row.village,
      row.day,
      row.inspector,
      row.photos,
      getAmcApprovalLabel(row.status),
      row.remarks,
      row.latitude,
      row.longitude,
    ]),
  }
}
