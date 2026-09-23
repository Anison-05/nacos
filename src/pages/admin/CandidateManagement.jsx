import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { auditService } from '../../services/auditService';
import { validateCandidateImage, optimizeCandidateImage } from '../../lib/imageOptimizer';
import {
  Users2,
  Plus,
  Edit2,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  X,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert
} from 'lucide-react';

export function CandidateManagement() {
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCand, setEditingCand] = useState(null);

  // Filter & Search
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation Modal State
  const [candToDelete, setCandToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    position_id: '',
    full_name: '',
    matric_number: '',
    manifesto: '',
    image_url: '',
    is_active: true,
    display_order: 1
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeEl = await electionService.getActiveElection();
      setElection(activeEl);

      if (activeEl?.id) {
        const [posList, candList] = await Promise.all([
          electionService.getPositions(activeEl.id),
          electionService.getCandidates(activeEl.id)
        ]);
        setPositions(posList || []);
        setCandidates(candList || []);
      }
    } catch (err) {
      console.error('Failed to load candidate data:', err);
      showNotification('danger', 'Failed to load candidates list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (cand = null) => {
    setImageError('');
    setSelectedFile(null);

    if (cand) {
      setEditingCand(cand);
      setFormData({
        position_id: cand.position_id,
        full_name: cand.full_name,
        matric_number: cand.matric_number,
        manifesto: cand.manifesto || '',
        image_url: cand.image_url || '',
        is_active: cand.is_active,
        display_order: cand.display_order || 1
      });
      setImagePreview(cand.image_url || '');
    } else {
      setEditingCand(null);
      setFormData({
        position_id: positions[0]?.id || '',
        full_name: '',
        matric_number: '',
        manifesto: '',
        image_url: '',
        is_active: true,
        display_order: candidates.length + 1
      });
      setImagePreview('');
    }
    setShowModal(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageError('');
    // Client-side validation: 3MB max, JPG/PNG/WEBP
    const validation = validateCandidateImage(file);
    if (!validation.valid) {
      setImageError(validation.error);
      setSelectedFile(null);
      return;
    }

    try {
      const optimized = await optimizeCandidateImage(file, 1000, 0.85);
      setSelectedFile(file);
      setImagePreview(optimized.previewUrl);
    } catch (err) {
      setImageError(err.message || 'Image processing error.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!election) {
      alert('No active election found.');
      return;
    }

    if (!formData.position_id) {
      alert('Please select an election position for this candidate.');
      return;
    }

    if (!formData.full_name.trim()) {
      alert('Candidate full name is required.');
      return;
    }

    try {
      let finalImageUrl = formData.image_url;

      // Upload image to Supabase Storage if a new file was chosen
      if (selectedFile) {
        setUploadingImage(true);
        const uploadedUrl = await electionService.uploadCandidateImage(
          selectedFile,
          election.id,
          editingCand?.id || Date.now().toString()
        );
        finalImageUrl = uploadedUrl;
      }

      const payload = {
        election_id: election.id,
        position_id: formData.position_id,
        full_name: formData.full_name.trim().toUpperCase(),
        matric_number: formData.matric_number.trim().toUpperCase(),
        manifesto: formData.manifesto.trim(),
        image_url: finalImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
        is_active: formData.is_active,
        display_order: Number(formData.display_order) || 1
      };

      if (editingCand) {
        await electionService.updateCandidate(editingCand.id, payload);
        await auditService.recordLog('EDIT_CANDIDATE', 'candidate', editingCand.id, payload);
        showNotification('success', `Candidate "${payload.full_name}" updated successfully.`);
      } else {
        const created = await electionService.createCandidate(payload);
        await auditService.recordLog('CREATE_CANDIDATE', 'candidate', created?.id, payload);
        showNotification('success', `Candidate "${payload.full_name}" added successfully.`);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      showNotification('danger', err.message || 'Failed to save candidate.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Quick toggle active / inactive status
  const handleToggleStatus = async (cand) => {
    try {
      const nextStatus = !cand.is_active;
      await electionService.updateCandidate(cand.id, { is_active: nextStatus });
      await auditService.recordLog('TOGGLE_CANDIDATE_STATUS', 'candidate', cand.id, { is_active: nextStatus });
      setCandidates((prev) =>
        prev.map((c) => (c.id === cand.id ? { ...c, is_active: nextStatus } : c))
      );
      showNotification('info', `Candidate status updated to ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`);
    } catch (err) {
      showNotification('danger', 'Failed to toggle status: ' + err.message);
    }
  };

  // Trigger custom confirmation modal
  const promptDelete = (cand) => {
    setCandToDelete(cand);
  };

  // Confirm delete execution
  const executeDelete = async () => {
    if (!candToDelete) return;
    setDeleting(true);

    try {
      await electionService.deleteCandidate(candToDelete.id);
      await auditService.recordLog('DELETE_CANDIDATE', 'candidate', candToDelete.id, {
        name: candToDelete.full_name,
        position: candToDelete.positions?.title
      });
      showNotification('success', `Candidate "${candToDelete.full_name}" was successfully removed.`);
      setCandToDelete(null);
      if (showModal) setShowModal(false);
      loadData();
    } catch (err) {
      showNotification('danger', err.message || 'Failed to delete candidate.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesPosition =
      selectedPositionFilter === 'ALL' || c.position_id === selectedPositionFilter;
    const matchesSearch =
      !searchQuery ||
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.matric_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.manifesto && c.manifesto.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPosition && matchesSearch;
  });

  return (
    <div className="container-fluid p-0">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`alert alert-${notification.type} shadow-lg border-0 d-flex align-items-center gap-2 mb-4 py-3 px-4 rounded-3`}
          role="alert"
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={20} className="text-success flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0" />
          )}
          <span className="fw-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Candidate Management</h2>
          <p className="text-secondary small mb-0">
            Overall controller center: Add, edit, photo-optimize, or permanently delete election candidates
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
            title="Reload Candidates"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-nacos-primary rounded-pill d-flex align-items-center gap-2 px-3 fw-bold shadow-sm"
          >
            <Plus size={18} />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Controller Filter & Search Bar */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Box */}
            <div className="col-12 col-md-6 col-lg-7">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <Search size={16} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search candidate name, matriculation number, manifesto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Position Filter */}
            <div className="col-12 col-md-6 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <Filter size={16} className="text-muted" />
                </span>
                <select
                  className="form-select bg-light border-start-0"
                  value={selectedPositionFilter}
                  onChange={(e) => setSelectedPositionFilter(e.target.value)}
                >
                  <option value="ALL">All Contested Positions ({candidates.length} candidates)</option>
                  {positions.map((pos) => {
                    const count = candidates.filter((c) => c.position_id === pos.id).length;
                    return (
                      <option key={pos.id} value={pos.id}>
                        {pos.title} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4">Candidate & Campaign Photo</th>
                <th>Position</th>
                <th>Matriculation</th>
                <th>Ballot Order</th>
                <th>Status</th>
                <th className="text-end pe-4">Controller Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
                    <span className="text-muted">Loading candidate registry...</span>
                  </td>
                </tr>
              ) : filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    {searchQuery || selectedPositionFilter !== 'ALL'
                      ? 'No candidates match your search filter.'
                      : 'No candidates registered yet. Click "Add Candidate" above.'}
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((cand) => (
                  <tr key={cand.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={cand.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={cand.full_name}
                          className="rounded-3 object-fit-cover border shadow-sm"
                          style={{ width: '52px', height: '52px' }}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div>
                          <span className="fw-bold text-dark d-block fs-6">{cand.full_name}</span>
                          <span
                            className="text-muted small text-truncate d-inline-block"
                            style={{ maxWidth: '280px' }}
                            title={cand.manifesto}
                          >
                            {cand.manifesto ? `"${cand.manifesto}"` : 'No manifesto provided'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-emerald-subtle text-success border px-2 py-1 fw-bold">
                        {cand.positions?.title || 'Unassigned Position'}
                      </span>
                    </td>
                    <td>
                      <span className="font-monospace small bg-light p-1 rounded border">
                        {cand.matric_number}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        #{cand.display_order || 1}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(cand)}
                        className={`btn btn-sm rounded-pill px-2 py-0 border fw-bold ${
                          cand.is_active
                            ? 'btn-outline-success'
                            : 'btn-outline-secondary'
                        }`}
                        title="Click to toggle candidate active/inactive state"
                      >
                        {cand.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-end pe-4">
                      <div className="d-inline-flex gap-1">
                        <button
                          onClick={() => handleOpenModal(cand)}
                          className="btn btn-outline-secondary btn-sm rounded-pill px-2 d-inline-flex align-items-center gap-1"
                          title="Edit Candidate"
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => promptDelete(cand)}
                          className="btn btn-outline-danger btn-sm rounded-pill px-2 d-inline-flex align-items-center gap-1"
                          title="Permanently Delete Candidate"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
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

      {/* Add / Edit Candidate Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="p-2 bg-success-subtle text-success rounded-3">
                    {editingCand ? <Edit2 size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold text-dark mb-0">
                      {editingCand ? 'Edit Candidate Details' : 'Register New Candidate'}
                    </h5>
                    <p className="text-muted small mb-0">
                      Configure candidate identity, contested position, and campaign photo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  disabled={uploadingImage}
                />
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Left Column: Details */}
                    <div className="col-12 col-md-7">
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">Contested Position *</label>
                        <select
                          className="form-select"
                          value={formData.position_id}
                          onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                          required
                        >
                          <option value="">Select an election position...</option>
                          {positions.map((p) => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">Candidate Full Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. ADEWALE BABATUNDE EMMANUEL"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">Candidate Matriculation Number *</label>
                        <input
                          type="text"
                          className="form-control font-monospace"
                          placeholder="e.g. FPA/CS/24/1-0005"
                          value={formData.matric_number}
                          onChange={(e) => setFormData({ ...formData, matric_number: e.target.value })}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">Manifesto / Campaign Description</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Brief summary of candidate objectives and campaign commitments..."
                          value={formData.manifesto}
                          onChange={(e) => setFormData({ ...formData, manifesto: e.target.value })}
                        />
                      </div>

                      <div className="row g-2">
                        <div className="col-6">
                          <label className="form-label small fw-bold text-dark">Ballot Order</label>
                          <input
                            type="number"
                            min="1"
                            className="form-control"
                            value={formData.display_order}
                            onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                          />
                        </div>
                        <div className="col-6 d-flex align-items-end">
                          <div className="form-check form-switch mb-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="cand_is_active_modal"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <label className="form-check-label small fw-bold text-dark" htmlFor="cand_is_active_modal">
                              Active Candidate
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Photo Upload */}
                    <div className="col-12 col-md-5">
                      <label className="form-label small fw-bold text-dark d-block">
                        Candidate Campaign Photo
                      </label>

                      <div className="border border-2 border-dashed rounded-3 p-3 text-center bg-light">
                        {imagePreview ? (
                          <div className="position-relative mb-2">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="img-fluid rounded-3 shadow-sm object-fit-cover"
                              style={{ maxHeight: '180px', width: '100%' }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImagePreview('');
                                setSelectedFile(null);
                                setFormData({ ...formData, image_url: '' });
                              }}
                              className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle p-1"
                              title="Remove photo"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="py-4 text-muted">
                            <ImageIcon size={44} className="mb-2 text-secondary opacity-50" />
                            <div className="small fw-semibold">Upload candidate portrait</div>
                            <div className="text-secondary" style={{ fontSize: '0.72rem' }}>JPG, PNG or WebP</div>
                          </div>
                        )}

                        <input
                          type="file"
                          id="candidate_image_file"
                          className="form-control form-control-sm mt-2"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={handleFileChange}
                        />

                        <div className="mt-2 text-start">
                          <label className="form-label text-muted" style={{ fontSize: '0.72rem' }}>
                            Or paste image URL directly:
                          </label>
                          <input
                            type="url"
                            className="form-control form-control-sm"
                            placeholder="https://..."
                            value={formData.image_url}
                            onChange={(e) => {
                              setFormData({ ...formData, image_url: e.target.value });
                              if (!selectedFile) setImagePreview(e.target.value);
                            }}
                          />
                        </div>

                        {imageError && (
                          <div className="alert alert-danger py-1 px-2 small mt-2 text-start mb-0">
                            {imageError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer p-3 bg-light d-flex justify-content-between">
                  <div>
                    {editingCand && (
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm rounded-pill px-3"
                        onClick={() => promptDelete(editingCand)}
                        disabled={uploadingImage}
                      >
                        <Trash2 size={14} className="me-1" />
                        <span>Delete Candidate</span>
                      </button>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary rounded-pill px-4"
                      onClick={() => setShowModal(false)}
                      disabled={uploadingImage}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-nacos-primary rounded-pill px-4 fw-bold shadow-sm"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? 'Uploading Image & Saving...' : 'Save Candidate'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {candToDelete && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div className="modal-content border-0 shadow-lg text-center p-3" style={{ borderRadius: '20px' }}>
              <div className="card-body p-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', color: '#dc2626' }}
                >
                  <ShieldAlert size={36} />
                </div>

                <h5 className="fw-bold text-dark mb-1">Delete Candidate?</h5>
                <p className="text-secondary small mb-3">
                  Are you sure you want to permanently delete candidate{' '}
                  <strong className="text-dark">{candToDelete.full_name}</strong>?
                </p>

                <div className="bg-light p-3 rounded-3 mb-3 text-start small border">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <img
                      src={candToDelete.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'}
                      alt={candToDelete.full_name}
                      className="rounded border object-fit-cover"
                      style={{ width: '36px', height: '36px' }}
                    />
                    <div>
                      <div className="fw-bold text-dark">{candToDelete.full_name}</div>
                      <div className="text-muted font-monospace">{candToDelete.matric_number}</div>
                    </div>
                  </div>
                  <div className="text-secondary">
                    <strong>Contesting for:</strong> {candToDelete.positions?.title || 'Position'}
                  </div>
                </div>

                <div className="alert alert-warning py-2 px-3 small text-start mb-3 border-0 bg-warning-subtle text-dark">
                  <strong>Warning:</strong> This will remove the candidate from the electronic ballot. Any votes cast for this candidate will be purged.
                </div>

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill w-50 fw-bold"
                    onClick={() => setCandToDelete(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger rounded-pill w-50 fw-bold d-flex align-items-center justify-content-center gap-1 shadow-sm"
                    onClick={executeDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Delete Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
