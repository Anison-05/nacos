import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { auditService } from '../../services/auditService';
import { Layers, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export function PositionManagement() {
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPos, setEditingPos] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    display_order: 1,
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const activeEl = await electionService.getActiveElection();
      setElection(activeEl);

      if (activeEl?.id) {
        const posList = await electionService.getPositions(activeEl.id);
        setPositions(posList || []);
      }
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (pos = null) => {
    if (pos) {
      setEditingPos(pos);
      setFormData({
        title: pos.title,
        description: pos.description || '',
        display_order: pos.display_order || 1,
        is_active: pos.is_active
      });
    } else {
      setEditingPos(null);
      setFormData({
        title: '',
        description: '',
        display_order: positions.length + 1,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!election) {
      alert('Please create or select an active election first.');
      return;
    }

    try {
      const payload = {
        election_id: election.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        display_order: Number(formData.display_order) || 1,
        is_active: formData.is_active
      };

      if (editingPos) {
        await electionService.updatePosition(editingPos.id, payload);
        await auditService.recordLog('EDIT_POSITION', 'position', editingPos.id, payload);
      } else {
        const created = await electionService.createPosition(payload);
        await auditService.recordLog('CREATE_POSITION', 'position', created?.id, payload);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save position.');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete position "${title}"? Any linked candidates will also be deleted.`)) return;

    try {
      await electionService.deletePosition(id);
      await auditService.recordLog('DELETE_POSITION', 'position', id, { title });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete position.');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Election Positions</h2>
          <p className="text-secondary small mb-0">
            Define dynamic executive positions, display order, and contested offices
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-nacos-primary rounded-pill d-flex align-items-center gap-2 px-3 fw-bold"
        >
          <Plus size={18} />
          <span>Add Position</span>
        </button>
      </div>

      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4" style={{ width: '80px' }}>Order</th>
                <th>Position Title</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No positions created yet. Add dynamic positions like "President", "Vice President", etc.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos.id}>
                    <td className="ps-4">
                      <span className="badge bg-secondary font-monospace">#{pos.display_order}</span>
                    </td>
                    <td>
                      <span className="fw-bold text-dark fs-6">{pos.title}</span>
                    </td>
                    <td className="text-muted small">
                      {pos.description || 'No description provided'}
                    </td>
                    <td>
                      {pos.is_active ? (
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge bg-secondary d-inline-flex align-items-center gap-1">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group">
                        <button
                          onClick={() => handleOpenModal(pos)}
                          className="btn btn-outline-secondary btn-sm rounded-pill me-1"
                          title="Edit Position"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(pos.id, pos.title)}
                          className="btn btn-outline-danger btn-sm rounded-pill"
                          title="Delete Position"
                        >
                          <Trash2 size={14} />
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
                  {editingPos ? 'Edit Position' : 'Create Dynamic Position'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Position Title</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. President, Vice President, Director of Socials"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Description / Responsibilities</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Brief summary of duties"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-bold text-dark">Display Order</label>
                      <input
                        type="number"
                        min="1"
                        className="form-control"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6 d-flex align-items-end">
                      <div className="form-check form-switch mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="pos_is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label className="form-check-label small fw-bold text-dark" htmlFor="pos_is_active">
                          Active on Ballot
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer p-3 bg-light d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-nacos-primary rounded-pill px-4 fw-bold">
                    Save Position
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
