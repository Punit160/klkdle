import { useEffect, useMemo, useState } from 'react'
import CardHeader from '@/components/shared/CardHeader'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import Pagination from '@/components/shared/Pagination'
import CardLoader from '@/components/shared/CardLoader'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import externalApi from '../../../../api/externalApi'
import { external } from '../../../../api/routes'
import { getCompanyId } from '../../../../utils/auth'
import {
  filterExternalListByUser,
  getDleAmcUserId,
} from '../../../../utils/externalApiUser'

const PER_PAGE = 20

const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (data?.message) return data.message
  if (data?.error) return typeof data.error === 'string' ? data.error : fallback
  return fallback
}

const parseAssignedSites = (payload) => {
  const root = payload?.data ?? payload

  if (Array.isArray(root)) return root
  if (Array.isArray(root?.assignedsite)) return root.assignedsite
  if (Array.isArray(root?.assigned_site)) return root.assigned_site
  if (Array.isArray(root?.assignedSite)) return root.assignedSite
  if (Array.isArray(root?.data)) return root.data

  return []
}

const cellValue = (row, ...keys) => {
  for (const key of keys) {
    const value = row?.[key]
    if (value != null && String(value).trim() !== '') {
      return String(value)
    }
  }
  return '—'
}

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const AssignAmc = () => {
  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions()

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchAssignments = async () => {
    setLoading(true)
    setError('')

    const companyId = getCompanyId()
    const userId = getDleAmcUserId()

    if (!companyId) {
      setError('Company information missing. Please login again.')
      setLoading(false)
      return
    }

    if (!userId) {
      setError('User information missing. Please login again.')
      setLoading(false)
      return
    }

    try {
      const res = await externalApi.get(external.ssl.assign('bihar'), {
        params: {
          company_id: companyId,
          user_id: userId,
        },
      })

      const list = filterExternalListByUser(parseAssignedSites(res?.data))
      setRows(list)
      setCurrentPage(1)
    } catch (err) {
      setRows([])
      setError(getErrorMessage(err, 'Failed to load assigned AMC sites.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignments()
  }, [refreshKey])

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return rows.slice(start, start + PER_PAGE)
  }, [rows, currentPage])

  if (isRemoved) return null

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
              <CardHeader
                title="Assign AMC"
                refresh={handleRefresh}
                remove={handleDelete}
                expanded={handleExpand}
              />
              <div className="card-body custom-card-action p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Assign Date</th>
                        <th>Start Date</th>
                        <th>State</th>
                        <th>District</th>
                        <th>Block</th>
                        <th>Panchayat</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-muted">
                            Loading assigned AMC sites...
                          </td>
                        </tr>
                      )}
                      {!loading && error && (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-danger">
                            {error}
                          </td>
                        </tr>
                      )}
                      {!loading && !error && rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-4 text-muted">
                            No assigned AMC sites found for your account.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        !error &&
                        pagedRows.map((row, index) => (
                          <tr key={row.id ?? `${index}-${cellValue(row, 'district', 'block')}`}>
                            <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>
                            <td>{formatDate(row.created_at ?? row.createdAt)}</td>
                            <td>{formatDate(row.start_date ?? row.sdate ?? row.startDate)}</td>
                            <td>{cellValue(row, 'state')}</td>
                            <td>{cellValue(row, 'district')}</td>
                            <td>{cellValue(row, 'block')}</td>
                            <td>{cellValue(row, 'panchyat', 'panchayat')}</td>
                            <td className="text-break">{cellValue(row, 'remarks', 'remark')}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <CardLoader refreshKey={refreshKey} />
              </div>
              {rows.length > PER_PAGE && (
                <div className="card-footer">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(rows.length / PER_PAGE)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AssignAmc
