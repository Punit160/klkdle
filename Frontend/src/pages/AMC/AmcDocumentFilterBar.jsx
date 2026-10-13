import { amcDocumentDistricts, summarizeAmcDocuments } from './amcDocFilters'
import '../../styles/AMC/amc-table-filters.css'

const AmcDocumentFilterBar = ({ rows, approvalFilter, statusFilter, districtFilter, onApply }) => {

  const stats = summarizeAmcDocuments(rows)
  const districts = amcDocumentDistricts(rows)
  return (
    <>
      <div className="amc-stat-grid">
        <button
          type="button"
          className={`amc-stat-card${approvalFilter === 'pending' && !statusFilter ? ' is-active' : ''}`}
          onClick={() => onApply({ approval: 'pending', status: '' })}
        >
          <div className="amc-stat-value text-warning">{stats.pending}</div>
          <div className="amc-stat-label">Pending approval</div>
        </button>
        <button
          type="button"
          className={`amc-stat-card${approvalFilter === 'approved' ? ' is-active' : ''}`}
          onClick={() => onApply({ approval: 'approved' })}
        >
          <div className="amc-stat-value text-success">{stats.approved}</div>
          <div className="amc-stat-label">Approved</div>
        </button>
        <button
          type="button"
          className={`amc-stat-card${approvalFilter === 'rejected' ? ' is-active' : ''}`}
          onClick={() => onApply({ approval: 'rejected' })}
        >
          <div className="amc-stat-value text-danger">{stats.rejected}</div>
          <div className="amc-stat-label">Rejected</div>
        </button>
        <button
          type="button"
          className={`amc-stat-card${approvalFilter === 'all' && !statusFilter && !districtFilter ? ' is-active' : ''}`}
          onClick={() => onApply({ approval: 'all', status: '', district: '' })}
        >
          <div className="amc-stat-value">{stats.total}</div>
          <div className="amc-stat-label">All records</div>
        </button>
        <button
          type="button"
          className={`amc-stat-card${statusFilter === 'pending' ? ' is-active' : ''}`}
          onClick={() => onApply({ status: statusFilter === 'pending' ? '' : 'pending' })}
        >
          <div className="amc-stat-value text-primary">{stats.lightsPending}</div>
          <div className="amc-stat-label">Lights pending</div>
        </button>
        <button
          type="button"
          className={`amc-stat-card${statusFilter === 'completed' ? ' is-active' : ''}`}
          onClick={() => onApply({ status: statusFilter === 'completed' ? '' : 'completed' })}
        >
          <div className="amc-stat-value text-success">{stats.complete}</div>
          <div className="amc-stat-label">Documentation complete</div>
        </button>
      </div>
      <div className="amc-toolbar">
        <select
          value={approvalFilter}
          onChange={(event) => onApply({ approval: event.target.value })}
          aria-label="Filter by approval"
        >
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All approvals</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => onApply({ status: event.target.value })}
          aria-label="Filter by documentation progress"
        >
          <option value="">All progress</option>
          <option value="pending">Lights pending</option>
          <option value="completed">Documentation complete</option>
        </select>
        <select
          value={districtFilter}
          onChange={(event) => onApply({ district: event.target.value })}
          aria-label="Filter by district"
        >
          <option value="">All districts</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={() => onApply({ approval: 'pending', status: '', district: '' })}
        >
          Reset
        </button>
      </div>
    </>
  )
}

export default AmcDocumentFilterBar
