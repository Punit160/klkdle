import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiEye,
  FiPlus,
  FiDownload,
  FiMapPin,
  FiCamera,
  FiSearch,
  FiRefreshCw,
} from 'react-icons/fi'
import PageHeader from '@/components/shared/pageHeader/PageHeader'
import CardHeader from '@/components/shared/CardHeader'
import CardLoader from '@/components/shared/CardLoader'
import Pagination from '@/components/shared/Pagination'
import useCardTitleActions from '@/hooks/useCardTitleActions'
import { pages } from '../../../api/routes'
import {
  fetchUlaSurveys,
  formatSurveyDateDisplay,
  formatSurveyDateTimeDisplay,
  downloadUlaImagesZip,
  buildMapsUrl,
  formatGpsPair,
  countUlaSurveyPhotos,
  expectedFirstVisitPhotoCount,
  resolveUlaSurveyorDisplayName,
  resolveUlaSecondVisitAt,
} from './ulaHelpers'
import '../../../styles/bihar-ula.css'

const PER_PAGE = 15

const BiharUlaList = () => {
  const navigate = useNavigate()
  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions()

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [zipDownloadingId, setZipDownloadingId] = useState(null)
  const [listError, setListError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setListError('')
    fetchUlaSurveys()
      .then((rows) => {
        if (!cancelled) {
          setRecords(
            rows.map((row) => {
              const secondBy = resolveUlaSurveyorDisplayName(row, {
                userIdField: 'user_id2',
                nameField: 'user_name2',
              })
              return {
              id: row.id,
              caNumber: row.ca_no,
              caName: row.ca_name,
              district: row.district,
              block: row.block,
              panchayat: row.panchayat,
              village: row.village,
              dateTime: row.survey_date,
              createdAt: row.created_at,
              createdByName: resolveUlaSurveyorDisplayName(row),
              secondVisitByName: secondBy === '—' ? null : secondBy,
              secondVisitAt: resolveUlaSecondVisitAt(row),
              latitude: row.latitude,
              longitude: row.longitude,
              latitude2: row.latitude2,
              longitude2: row.longitude2,
              solarMeterOnFirst: Boolean(row.solar_meter_img),
              secondVisitComplete: Boolean(row.second_visit_complete),
              firstVisitComplete: Boolean(row.first_visit_complete),
              visitType: row.second_visit_complete
                ? 'Complete'
                : row.first_visit_complete
                  ? '1st done'
                  : 'Draft',
              secondVisitPending:
                row.first_visit_complete && !row.second_visit_complete,
              imagesCount: countUlaSurveyPhotos(row),
              expectedPhotoCount:
                expectedFirstVisitPhotoCount(row) +
                (row.second_visit_complete ? 2 : 0),
            }})
          )
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRecords([])
          setListError(
            err?.response?.data?.message ||
              'Could not load your ULA records. Try logging in again.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const stats = useMemo(() => {
    const total = records.length
    const secondComplete = records.filter((r) => r.secondVisitComplete).length
    const pendingSecond = records.filter((r) => r.secondVisitPending).length
    const firstOnly = records.filter(
      (r) => r.firstVisitComplete && !r.secondVisitComplete
    ).length
    return { total, secondComplete, pendingSecond, firstOnly }
  }, [records])

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return records
    return records.filter((r) => {
      const hay = [
        r.caNumber,
        r.caName,
        r.district,
        r.block,
        r.panchayat,
        r.village,
        r.createdByName,
        r.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [records, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE
    return filteredRecords.slice(start, start + PER_PAGE)
  }, [filteredRecords, currentPage])

  const totalPages = Math.ceil(filteredRecords.length / PER_PAGE) || 1

  const openSecondVisit = (id) => {
    navigate(`${pages.bihar.ulaForm}?visit=2&id=${id}`)
  }

  const handleDownloadZip = async (row) => {
    if (!row?.id || zipDownloadingId) return
    setZipDownloadingId(row.id)
    try {
      await downloadUlaImagesZip(row.id, row.caNumber)
    } catch {
      alert('Could not download images ZIP. Check login and that photos exist for this CA.')
    } finally {
      setZipDownloadingId(null)
    }
  }

  const handleExportCSV = () => {
    if (!filteredRecords.length) {
      alert('No records to export.')
      return
    }

    const headers = [
      'ID',
      'CA Number',
      'CA Name',
      'District',
      'Block',
      'Panchayat',
      'Village',
      'Survey Date',
      'Survey by',
      'Latitude',
      'Longitude',
      'Status',
      'Photos Count',
    ]

    const rows = filteredRecords.map((r) => [
      r.id,
      r.caNumber,
      `"${(r.caName || '').replace(/"/g, '""')}"`,
      r.district,
      `"${r.block || ''}"`,
      `"${r.panchayat || ''}"`,
      `"${r.village || ''}"`,
      `"${formatSurveyDateDisplay(r.dateTime)}"`,
      `"${(r.createdByName || '').replace(/"/g, '""')}"`,
      r.latitude || '',
      r.longitude || '',
      r.secondVisitComplete ? '2nd complete' : r.firstVisitComplete ? '1st complete' : 'Draft',
      r.imagesCount,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `Bihar_ULA_Records_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const visitPillClass = (row) => {
    if (row.secondVisitComplete) return 'ula-visit-pill ula-visit-pill--complete'
    if (row.secondVisitPending) return 'ula-visit-pill ula-visit-pill--pending'
    return 'ula-visit-pill ula-visit-pill--first'
  }

  const visitPillLabel = (row) => {
    if (row.secondVisitComplete) return '2nd visit done'
    if (row.secondVisitPending) return '2nd visit pending'
    if (row.firstVisitComplete) return '1st visit done'
    return 'Draft'
  }

  if (isRemoved) return null

  return (
    <>
      <PageHeader />
      <div className="main-content">
        <div className="row">
          <div className="col-lg-12">
            <div className={`card stretch stretch-full ${isExpanded ? 'card-fullscreen' : ''}`}>
              <CardHeader
                title="Bihar ULA — Solar Rooftop Surveys"
                refresh={handleRefresh}
                remove={handleDelete}
                expanded={handleExpand}
              />
              <div className="card-body custom-card-action p-0">
                <div className="ula-stat-grid">
                  <div className="ula-stat-card">
                    <div className="ula-stat-value">{stats.total}</div>
                    <div className="ula-stat-label">Total records</div>
                  </div>
                  <div className="ula-stat-card">
                    <div className="ula-stat-value text-primary">{stats.firstOnly}</div>
                    <div className="ula-stat-label">Awaiting 2nd visit</div>
                  </div>
                  <div className="ula-stat-card">
                    <div className="ula-stat-value text-warning">{stats.pendingSecond}</div>
                    <div className="ula-stat-label">2nd visit pending</div>
                  </div>
                  <div className="ula-stat-card">
                    <div className="ula-stat-value text-success">{stats.secondComplete}</div>
                    <div className="ula-stat-label">Fully complete</div>
                  </div>
                </div>

                {listError && (
                  <div className="alert alert-warning mx-3 mt-3 mb-0 py-2 fs-13">{listError}</div>
                )}

                <div className="ula-toolbar">
                  <div className="ula-search-wrap">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-white">
                        <FiSearch size={14} />
                      </span>
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search CA, name, district, village…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-sm btn-light d-inline-flex align-items-center gap-1"
                      onClick={handleRefresh}
                    >
                      <FiRefreshCw size={13} /> Refresh
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                      onClick={handleExportCSV}
                    >
                      <FiDownload size={13} /> Export CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1"
                      onClick={() => navigate(pages.bihar.ulaForm || '/bihar/ula/form')}
                    >
                      <FiPlus size={14} /> New 1st visit
                    </button>
                  </div>
                </div>

                <div className="table-responsive ula-table-wrapper">
                  <table className="table table-hover mb-0 ula-table">
                    <thead>
                      <tr>
                        <th style={{ width: '56px' }}>#</th>
                        <th>Consumer (CA)</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Survey by</th>
                        <th>Visit date & time</th>
                        <th>GPS</th>
                        <th>Photos</th>
                        <th className="text-end ula-actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={9} className="text-center py-5 text-muted">
                            Loading ULA records…
                          </td>
                        </tr>
                      )}
                      {!loading && paginatedRecords.length === 0 && (
                        <tr>
                          <td colSpan={9} className="text-center py-5">
                            <div className="text-muted mb-2">No records found.</div>
                            {!search && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => navigate(pages.bihar.ulaForm || '/bihar/ula/form')}
                              >
                                Start first visit
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        paginatedRecords.map((row, idx) => {
                          const photoCount = row.imagesCount ?? 0
                          return (
                            <tr key={row.id}>
                              <td className="text-muted fs-12">
                                {(currentPage - 1) * PER_PAGE + idx + 1}
                              </td>
                              <td className="ula-ca-cell">
                                <div className="ula-ca-no">{row.caNumber || '—'}</div>
                                <div className="ula-ca-name">{row.caName || '—'}</div>
                              </td>
                              <td className="ula-location-cell">
                                <div className="ula-village">{row.village || row.panchayat || '—'}</div>
                                <div className="ula-hierarchy">
                                  {[row.panchayat, row.block, row.district]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                </div>
                              </td>
                              <td>
                                <span className={visitPillClass(row)}>{visitPillLabel(row)}</span>
                              </td>
                              <td className="ula-surveyor-cell">
                                <div className="ula-surveyor-name">{row.createdByName || '—'}</div>
                                {row.secondVisitByName &&
                                  row.secondVisitByName !== row.createdByName && (
                                    <div className="ula-surveyor-second fs-11 text-muted">
                                      2nd: {row.secondVisitByName}
                                    </div>
                                  )}
                              </td>
                              <td className="fs-12 text-muted ula-survey-dates">
                                <div className="ula-visit-datetime-line">
                                  <span className="ula-visit-datetime-label">1st:</span>{' '}
                                  {row.createdAt
                                    ? formatSurveyDateTimeDisplay(row.createdAt)
                                    : formatSurveyDateDisplay(row.dateTime)}
                                </div>
                                <div className="ula-visit-datetime-line ula-second-visit-date">
                                  <span className="ula-visit-datetime-label">2nd:</span>{' '}
                                  {row.secondVisitAt
                                    ? formatSurveyDateTimeDisplay(row.secondVisitAt)
                                    : '—'}
                                </div>
                              </td>
                              <td className="fs-11 text-muted ula-gps-cell">
                                {(() => {
                                  const firstLabel = formatGpsPair(row.latitude, row.longitude)
                                  const firstMap = buildMapsUrl(row.latitude, row.longitude)
                                  const secondLabel = formatGpsPair(row.latitude2, row.longitude2)
                                  const secondMap = buildMapsUrl(row.latitude2, row.longitude2)
                                  if (!firstLabel && !secondLabel) return '—'
                                  return (
                                    <div className="d-flex flex-column gap-1">
                                      {firstLabel && firstMap && (
                                        <a
                                          href={firstMap}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ula-gps-link d-inline-flex align-items-center gap-1"
                                          title="Open 1st visit location in Google Maps"
                                        >
                                          <FiMapPin size={11} className="text-primary" />
                                          <span>{firstLabel}</span>
                                        </a>
                                      )}
                                      {secondLabel && secondMap && (
                                        <a
                                          href={secondMap}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="ula-gps-link ula-gps-link--second d-inline-flex align-items-center gap-1"
                                          title="Open 2nd visit location in Google Maps"
                                        >
                                          <FiMapPin size={11} />
                                          <span>{secondLabel}</span>
                                        </a>
                                      )}
                                    </div>
                                  )
                                })()}
                              </td>
                              <td className="ula-photos-col">
                                <button
                                  type="button"
                                  className={`ula-photos-pill ${
                                    photoCount >= (row.expectedPhotoCount ?? 7)
                                      ? 'ula-photos-pill--complete'
                                      : 'ula-photos-pill--partial'
                                  }`}
                                  disabled={
                                    photoCount === 0 || zipDownloadingId === row.id
                                  }
                                  onClick={() => handleDownloadZip(row)}
                                  title={
                                    photoCount === 0
                                      ? 'No photos saved yet'
                                      : `Download ${photoCount} photo(s) as ${row.caNumber || 'CA'}.zip`
                                  }
                                  aria-label={`Download ${photoCount} images for CA ${row.caNumber || row.id}`}
                                >
                                  <FiCamera size={12} aria-hidden />
                                  <span className="ula-photos-count">{photoCount}</span>
                                  {zipDownloadingId === row.id ? (
                                    <span className="ula-photos-spinner" aria-hidden>
                                      …
                                    </span>
                                  ) : (
                                    <FiDownload size={13} className="ula-photos-dl-icon" aria-hidden />
                                  )}
                                </button>
                              </td>
                              <td className="text-end ula-actions-col">
                                <div className="ula-action-group">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-light border d-inline-flex align-items-center gap-1"
                                    onClick={() =>
                                      navigate(
                                        `${pages.bihar.ulaDetails || '/bihar/ula/details'}?id=${row.id}`,
                                        { state: { row } }
                                      )
                                    }
                                    title="View full record"
                                  >
                                    <FiEye size={14} aria-hidden />
                                    <span>View</span>
                                  </button>
                                  {row.secondVisitPending && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary text-nowrap"
                                      onClick={() => openSecondVisit(row.id)}
                                      title="Complete 2nd visit"
                                    >
                                      2nd visit
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                <CardLoader refreshKey={refreshKey} />

                {filteredRecords.length > 0 && (
                  <div className="d-flex justify-content-between align-items-center px-3 py-3 flex-wrap gap-2 border-top">
                    <span className="fs-12 text-muted">
                      Showing {(currentPage - 1) * PER_PAGE + 1}–
                      {Math.min(currentPage * PER_PAGE, filteredRecords.length)} of{' '}
                      {filteredRecords.length}
                      {search ? ` (filtered from ${records.length})` : ''}
                    </span>
                    {filteredRecords.length > PER_PAGE && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default BiharUlaList
