import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { auditService } from '../../services/auditService';
import { Calendar, Plus, Edit2, Play, Square, CheckCircle, Clock } from 'lucide-react';

export function ElectionManagement() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingElection, setEditingElection] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    session: '2025/2026 Academic Session',
    description: '',
    status: 'DRAFT',
    start_time: '',
    end_time: '',
    results_published: false
  });

  const loadElections = async () => {
    setLoading(true);
    try {
      const data = await electionService.getAllElections();
      setElections(data || []);
    } catch (err) {
      console.error('Failed to load elections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadElections();
  }, []);

  const handleOpenModal = (el = null) => {
    if (el) {
      setEditingElection(el);
      setFormData({
        title: el.title,
        session: el.session,
        description: el.description || '',
        status: el.status,
        start_time: el.start_time ? el.start_time.substring(0, 16) : '',
        end_time: el.end_time ? el.end_time.substring(0, 16) : '',
        results_published: el.results_published
      });
    } else {
      setEditingElection(null);
      setFormData({
        title: 'NACOS Central Executive Council Elections',
        session: '2025/2026 Academic Session',
        description: 'General election for student executive leadership.',
        status: 'OPEN',
        start_time: '',
        end_time: '',
        results_published: false
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title.trim(),
        session: formData.session.trim(),
        description: formData.description.trim(),
        status: formData.status,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        results_published: formData.results_published
      };

      if (editingElection) {
        await electionService.updateElection(editingElection.id, payload);
        await auditService.recordLog('EDIT_ELECTION', 'election', editingElection.id, payload);
      } else {
        const created = await electionService.createElection(payload);
        await auditService.recordLog('CREATE_ELECTION', 'election', created?.id, payload);
      }

      setShowModal(false);
      loadElections();
    } catch (err) {
      alert(err.message || 'Failed to save election configuration.');
    }
  };

  const handleToggleStatus = async (el) => {
    const nextStatus = el.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await electionService.updateElection(el.id, { status: nextStatus });
      await auditService.recordLog(
        nextStatus === 'OPEN' ? 'OPEN_ELECTION' : 'CLOSE_ELECTION',
        'election',
        el.id,
        { previous: el.status, current: nextStatus }
      );
      loadElections();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleToggleResults = async (el) => {
    const nextState = !el.results_published;
    try {
      await electionService.updateElection(el.id, { results_published: nextState });
      await auditService.recordLog('TOGGLE_RESULTS_PUBLISH', 'election', el.id, { results_published: nextState });
      loadElections();
    } catch (err) {
      alert(err.message || 'Failed to update results publish flag.');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Election Management</h2>
          <p className="text-secondary small mb-0">
            Create, schedule, open, or close election sessions
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-nacos-primary rounded-pill d-flex align-items-center gap-2 px-3 fw-bold"
        >
          <Plus size={18} />
          <span>New Election</span>
        </button>
      </div>

      {/* Elections Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4">Election Title</th>
                <th>Academic Session</th>
                <th>Status</th>
                <th>Public Results</th>
                <th>Schedule</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {elections.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No elections found. Create your first election above.
                  </td>
                </tr>
              ) : (
                elections.map((el) => (
                  <tr key={el.id}>
                    <td className="ps-4">
                      <span className="fw-bold text-dark d-block">{el.title}</span>
                      <span className="text-muted small">{el.description}</span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border font-monospace">
                        {el.session}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${el.status === 'OPEN' ? 'bg-success' : el.status === 'CLOSED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                        {el.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleResults(el)}
                        className={`btn btn-xs rounded-pill px-2 py-1 small ${el.results_published ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.78rem' }}
                      >
                        {el.results_published ? 'Published to Voters' : 'Confidential (Admin Only)'}
                      </button>
                    </td>
                    <td className="small text-secondary">
                      {el.start_time ? new Date(el.start_time).toLocaleDateString() : 'Immediate'}
                      {' - '}
                      {el.end_time ? new Date(el.end_time).toLocaleDateString() : 'Indefinite'}
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group">
                        <button
                          onClick={() => handleToggleStatus(el)}
                          className={`btn btn-sm ${el.status === 'OPEN' ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill me-1`}
                          title={el.status === 'OPEN' ? 'Close Election' : 'Open Election'}
                        >
                          {el.status === 'OPEN' ? <Square size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => handleOpenModal(el)}
                          className="btn btn-outline-secondary btn-sm rounded-pill"
                          title="Edit Settings"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <h5 className="modal-title fw-bold">
                  {editingElection ? 'Edit Election Settings' : 'Create New Election'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Election Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Academic Session</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="e.g. 2025/2026 Academic Session"
                      value={formData.session}
                      onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-dark">Start Date / Time</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-bold text-dark">End Date / Time</label>
                      <input
                        type="datetime-local"
                        className="form-control form-control-sm"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Election Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="DRAFT">DRAFT (Testing only)</option>
                      <option value="OPEN">OPEN (Accepting votes)</option>
                      <option value="CLOSED">CLOSED (Voting concluded)</option>
                    </select>
                  </div>
                  <div className="form-check form-switch mt-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="publish_results_toggle"
                      checked={formData.results_published}
                      onChange={(e) => setFormData({ ...formData, results_published: e.target.checked })}
                    />
                    <label className="form-check-label small fw-bold text-dark" htmlFor="publish_results_toggle">
                      Make Results Public to Students
                    </label>
                  </div>
                </div>
                <div className="modal-footer p-3 bg-light d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-nacos-primary rounded-pill px-4 fw-bold">
                    Save Election
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
