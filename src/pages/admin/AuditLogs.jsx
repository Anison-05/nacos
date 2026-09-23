import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/auditService';
import { ScrollText, RefreshCw, Search, ShieldCheck } from 'lucide-react';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getAuditLogs(100);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.action?.toLowerCase().includes(term) ||
      log.admin_email?.toLowerCase().includes(term) ||
      log.target_type?.toLowerCase().includes(term) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Administrative Audit Trail</h2>
          <p className="text-secondary small mb-0">
            Immutable log of administrative logins, voter resets, election status changes, and configurations
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter */}
      <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '14px' }}>
        <div className="input-group input-group-sm">
          <span className="input-group-text bg-light border-end-0">
            <Search size={15} className="text-secondary" />
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Search audit trail by action, admin email, or target..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 font-monospace small">
            <thead className="table-light text-uppercase fw-bold text-secondary font-sans-serif">
              <tr>
                <th className="ps-4">Timestamp</th>
                <th>Administrator</th>
                <th>Action</th>
                <th>Target</th>
                <th>Audit Context / Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="ps-4 text-nowrap text-secondary">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="fw-semibold text-dark text-nowrap">
                      {log.admin_email || 'System'}
                    </td>
                    <td>
                      <span className={`badge ${
                        log.action.includes('RESET') ? 'bg-danger' :
                        log.action.includes('OPEN') ? 'bg-success' :
                        log.action.includes('CLOSE') ? 'bg-warning text-dark' :
                        'bg-secondary'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {log.target_type || 'N/A'}: {log.target_id || ''}
                      </span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: '300px' }}>
                      <span className="text-truncate d-block" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
