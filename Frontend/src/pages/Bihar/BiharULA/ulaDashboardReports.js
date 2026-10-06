import { getAmcApprovalLabel } from '../../../utils/amcApproval'

export const ULA_REPORT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'district', label: 'District' },
  { id: 'block', label: 'Block' },
  { id: 'panchayat', label: 'Panchayat' },
  { id: 'surveyor', label: 'Surveyor' },
  { id: 'daily', label: 'Daily' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'approval', label: 'Approval' },
  { id: 'register', label: 'Site register' },
]

export const ULA_VISIT_OPTIONS = [
  { value: '', label: 'All visit statuses' },
  { value: 'incomplete', label: '1st visit incomplete' },
  { value: 'second_pending', label: '2nd visit pending' },
  { value: 'complete_first', label: 'Complete on 1st visit' },
  { value: 'complete_second', label: '2nd visit complete' },
]

const GROUP_HEADERS = [
  'Group',
  'Sites',
  '1st visit incomplete',
  '2nd visit pending',
  'Complete on 1st visit',
  '2nd visit complete',
  'Pending approval',
  'Approved',
  'Rejected',
]

export const surveyDayKey = (value) => {
  if (!value) return ''
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const classifyUlaVisit = (row) => {
  const solarFirst = Boolean(
    row?.solarMeterOnFirst ||
      row?.solar_meter_on_first_visit ||
      row?.solar_meter_img ||
      row?.solar_meter_img_url
  )
  const firstDone = Boolean(row?.firstVisitComplete ?? row?.first_visit_complete ?? row?.system_img)
  const secondDone = Boolean(
    row?.secondVisitComplete ??
      row?.second_visit_complete ??
      (row?.system_img2 && row?.solar_meter_img2)
  )
  if (secondDone) return { key: 'complete_second', label: '2nd visit complete' }
  if (firstDone && solarFirst) return { key: 'complete_first', label: 'Complete on 1st visit' }
  if (firstDone) return { key: 'second_pending', label: '2nd visit pending' }
  return { key: 'incomplete', label: '1st visit incomplete' }
}

const blankBucket = (label) => ({
  label,
  total: 0,
  incomplete: 0,
  secondPending: 0,
  completeFirst: 0,
  completeSecond: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
})

const addRowToBucket = (bucket, row) => {
  bucket.total += 1
  if (row.visitKey === 'incomplete') bucket.incomplete += 1
  else if (row.visitKey === 'second_pending') bucket.secondPending += 1
  else if (row.visitKey === 'complete_first') bucket.completeFirst += 1
  else if (row.visitKey === 'complete_second') bucket.completeSecond += 1

  const status = Number(row.approvalStatus ?? 0)
  if (status === 1) bucket.approved += 1
  else if (status === 2) bucket.rejected += 1
  else bucket.pending += 1
}

export const groupUlaRows = (rows, labelOf) => {
  const map = new Map()
  rows.forEach((row) => {
    const label = String(labelOf(row) || '').trim() || 'Not set'
    if (!map.has(label)) map.set(label, blankBucket(label))
    addRowToBucket(map.get(label), row)
  })
  return [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
}

export const buildSurveyorReport = (rows) => {
  const map = new Map()
  const touch = (name) => {
    const label = String(name || '').trim()
    const key = !label || label === '—' ? 'Unknown' : label
    if (!map.has(key)) {
      map.set(key, {
        label: key,
        firstVisits: 0,
        secondVisits: 0,
        sites: new Set(),
      })
    }
    return map.get(key)
  }

  rows.forEach((row) => {
    const first = touch(row.firstBy)
    first.firstVisits += 1
    first.sites.add(row.id)
    if (row.secondBy && row.secondBy !== '—') {
      const second = touch(row.secondBy)
      second.secondVisits += 1
      second.sites.add(row.id)
    }
  })

  return [...map.values()]
    .map((row) => ({
      label: row.label,
      firstVisits: row.firstVisits,
      secondVisits: row.secondVisits,
      sites: row.sites.size,
    }))
    .sort((a, b) => b.sites - a.sites || a.label.localeCompare(b.label))
}

export const filterUlaDashboardRows = (rows, filters) => {
  const query = String(filters.q || '').trim().toLowerCase()
  return rows.filter((row) => {
    if (filters.district && row.district !== filters.district) return false
    if (filters.block && row.block !== filters.block) return false
    if (filters.panchayat && row.panchayat !== filters.panchayat) return false
    if (filters.approval !== '' && filters.approval != null && Number(row.approvalStatus) !== Number(filters.approval)) {
      return false
    }
    if (filters.visit && row.visitKey !== filters.visit) return false
    if (filters.surveyor && row.firstBy !== filters.surveyor && row.secondBy !== filters.surveyor) {
      return false
    }
    if (filters.from && (!row.surveyDay || row.surveyDay < filters.from)) return false
    if (filters.to && (!row.surveyDay || row.surveyDay > filters.to)) return false
    if (!query) return true
    const hay = [
      row.caNumber,
      row.caName,
      row.contact,
      row.district,
      row.block,
      row.panchayat,
      row.village,
      row.firstBy,
      row.secondBy,
      row.panel1,
      row.panel2,
      row.inverter,
      row.approvalRemarks,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(query)
  })
}

export const summarizeUlaRows = (rows) => {
  const summary = blankBucket('All sites')
  rows.forEach((row) => addRowToBucket(summary, row))
  summary.withGps = rows.filter((row) => row.latitude && row.longitude).length
  summary.districts = new Set(rows.map((row) => row.district).filter(Boolean)).size
  summary.surveyors = new Set(
    rows.flatMap((row) => [row.firstBy, row.secondBy].filter((name) => name && name !== '—'))
  ).size
  return summary
}

const bucketCells = (row) => [
  row.label,
  row.total,
  row.incomplete,
  row.secondPending,
  row.completeFirst,
  row.completeSecond,
  row.pending,
  row.approved,
  row.rejected,
]

export const reportTableFor = (reportId, rows) => {
  if (reportId === 'district') {
    return {
      title: 'District report',
      headers: GROUP_HEADERS,
      rows: groupUlaRows(rows, (row) => row.district).map(bucketCells),
    }
  }
  if (reportId === 'block') {
    return {
      title: 'Block report',
      headers: ['District', 'Block', ...GROUP_HEADERS.slice(1)],
      rows: groupUlaRows(rows, (row) => `${row.district || 'Not set'}|||${row.block || 'Not set'}`).map(
        (row) => {
          const [district, block] = row.label.split('|||')
          return [district, block, ...bucketCells({ ...row, label: block }).slice(1)]
        }
      ),
    }
  }
  if (reportId === 'panchayat') {
    return {
      title: 'Panchayat report',
      headers: ['District', 'Block', 'Panchayat', ...GROUP_HEADERS.slice(1)],
      rows: groupUlaRows(
        rows,
        (row) =>
          `${row.district || 'Not set'}|||${row.block || 'Not set'}|||${row.panchayat || 'Not set'}`
      ).map((row) => {
        const [district, block, panchayat] = row.label.split('|||')
        return [district, block, panchayat, ...bucketCells(row).slice(1)]
      }),
    }
  }
  if (reportId === 'surveyor') {
    return {
      title: 'Surveyor report',
      headers: ['Surveyor', 'Sites', '1st visits', '2nd visits'],
      rows: buildSurveyorReport(rows).map((row) => [
        row.label,
        row.sites,
        row.firstVisits,
        row.secondVisits,
      ]),
    }
  }
  if (reportId === 'daily') {
    return {
      title: 'Daily report',
      headers: GROUP_HEADERS,
      rows: groupUlaRows(rows, (row) => row.surveyDay || 'No date')
        .sort((a, b) => String(b.label).localeCompare(String(a.label)))
        .map(bucketCells),
    }
  }
  if (reportId === 'monthly') {
    return {
      title: 'Monthly report',
      headers: GROUP_HEADERS,
      rows: groupUlaRows(rows, (row) => (row.surveyDay ? row.surveyDay.slice(0, 7) : 'No date'))
        .sort((a, b) => String(b.label).localeCompare(String(a.label)))
        .map(bucketCells),
    }
  }
  if (reportId === 'approval') {
    return {
      title: 'Approval report',
      headers: ['CA number', 'CA name', 'District', 'Visit', 'Approval', 'Remarks', 'Approved / rejected by'],
      rows: [...rows]
        .sort((a, b) => Number(a.approvalStatus) - Number(b.approvalStatus) || String(a.caNumber).localeCompare(String(b.caNumber)))
        .map((row) => [
          row.caNumber,
          row.caName,
          row.district,
          row.visitLabel,
          getAmcApprovalLabel(row.approvalStatus),
          row.approvalRemarks,
          row.approvalBy,
        ]),
    }
  }

  return {
    title: reportId === 'overview' ? 'ULA overview sites' : 'Site register',
    headers: [
      'ID',
      'CA number',
      'CA name',
      'Contact',
      'District',
      'Block',
      'Panchayat',
      'Village',
      'Survey date',
      '1st visit by',
      '2nd visit by',
      'Visit status',
      'Approval',
      'Remarks',
      'Decision by',
      'Photos',
      'Panel 1',
      'Panel 2',
      'Inverter',
      'Latitude',
      'Longitude',
    ],
    rows: rows.map((row) => [
      row.id,
      row.caNumber,
      row.caName,
      row.contact,
      row.district,
      row.block,
      row.panchayat,
      row.village,
      row.surveyDay,
      row.firstBy,
      row.secondBy,
      row.visitLabel,
      getAmcApprovalLabel(row.approvalStatus),
      row.approvalRemarks,
      row.approvalBy,
      row.photos,
      row.panel1,
      row.panel2,
      row.inverter,
      row.latitude,
      row.longitude,
    ]),
  }
}

const escapeCsv = (value) => {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export const tableToCsv = (table) => {
  const lines = [table.headers, ...table.rows].map((row) => row.map(escapeCsv).join(','))
  return `\uFEFF${lines.join('\n')}`
}

export const tableToExcelHtml = (table) => {
  const head = table.headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')
  const body = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><h3>${escapeHtml(table.title)}</h3><table border="1"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
}

export const downloadTextFile = (filename, content, type) => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const slugFilePart = (value) =>
  String(value || 'ula-report')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'ula-report'
