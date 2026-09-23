import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { auditService } from '../../services/auditService';
import { validateCandidateImage, optimizeCandidateImage } from '../../lib/imageOptimizer';
import { Users2, Plus, Edit2, Trash2, Upload, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export function CandidateManagement() {
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCand, setEditingCand] = useState(null);

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
      // Generate instant preview via canvas optimizer
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
      alert('Please select a position for this candidate.');
      return;
    }

    try {
      let finalImageUrl = formData.image_url;

      // Upload image to Supabase Storage if new file selected
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
        image_url: finalImageUrl,
        is_active: formData.is_active,
        display_order: Number(formData.display_order) || 1
      };

      if (editingCand) {
        await electionService.updateCandidate(editingCand.id, payload);
        await auditService.recordLog('EDIT_CANDIDATE', 'candidate', editingCand.id, payload);
      } else {
        const created = await electionService.createCandidate(payload);
        await auditService.recordLog('CREATE_CANDIDATE', 'candidate', created?.id, payload);
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save candidate.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete candidate "${name}"?`)) return;

    try {
      await electionService.deleteCandidate(id);
      await auditService.recordLog('DELETE_CANDIDATE', 'candidate', id, { name });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete candidate.');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Candidate Management</h2>
          <p className="text-secondary small mb-0">
            Register vetted candidates, assign positions, and manage campaign photos & manifestos
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-nacos-primary rounded-pill d-flex align-items-center gap-2 px-3 fw-bold"
        >
          <Plus size={18} />
          <span>Add Candidate</span>
        </button>
      </div>

      {/* Candidates Grid / Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4">Candidate Photo & Name</th>
                <th>Position</th>
                <th>Matriculation</th>
                <th>Status</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No candidates registered yet. Click "Add Candidate" above.
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => (
                  <tr key={cand.id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center gap-3">
                        <img
                          src={cand.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={cand.full_name}
                          className="rounded-3 object-fit-cover border shadow-sm"
                          style={{ width: '52px', height: '52px' }}
                        />
                        <div>
                          <span className="fw-bold text-dark d-block fs-6">{cand.full_name}</span>
                          <span className="text-muted small text-truncate d-inline-block" style={{ maxWidth: '280px' }}>
                            {cand.manifesto ? `"${cand.manifesto}"` : 'No manifesto'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-emerald-subtle text-success border px-2 py-1 fw-bold">
                        {cand.positions?.title || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      <span className="font-monospace small bg-light p-1 rounded border">
                        {cand.matric_number}
                      </span>
                    </td>
                    <td>
                      {cand.is_active ? (
                        <span className="badge bg-success">Active</span>
                      ) : (
                        <span className="badge bg-secondary">Inactive</span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group">
                        <button
                          onClick={() => handleOpenModal(cand)}
                          className="btn btn-outline-secondary btn-sm rounded-pill me-1"
                          title="Edit Candidate"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cand.id, cand.full_name)}
                          className="btn btn-outline-danger btn-sm rounded-pill"
                          title="Delete Candidate"
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
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <h5 className="modal-title fw-bold">
                  {editingCand ? 'Edit Candidate Details' : 'Register New Candidate'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    {/* Left Column: Fields */}
                    <div className="col-12 col-md-7">
                      <div className="mb-3">
                        <label className="form-label small fw-bold text-dark">Contested Position</label>
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
                        <label className="form-label small fw-bold text-dark">Candidate Full Name</label>
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
                        <label className="form-label small fw-bold text-dark">Candidate Matriculation Number</label>
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
                          placeholder="Enter summary of candidate key objectives"
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
                              id="cand_is_active"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <label className="form-check-label small fw-bold text-dark" htmlFor="cand_is_active">
                              Active Candidate
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Photo Upload & 3MB Validation */}
                    <div className="col-12 col-md-5">
                      <label className="form-label small fw-bold text-dark d-block">
                        Candidate Photo
                      </label>

                      <div className="border border-2 border-dashed rounded-3 p-3 text-center bg-light">
                        {imagePreview ? (
                          <div className="position-relative mb-2">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="img-fluid rounded-3 shadow-sm object-fit-cover"
                              style={{ maxHeight: '200px', width: '100%' }}
                            />
                          </div>
                        ) : (
                          <div className="py-4 text-muted">
                            <ImageIcon size={48} className="mb-2 text-secondary opacity-50" />
                            <div className="small">No photo uploaded</div>
                          </div>
                        )}

                        <input
                          type="file"
                          id="candidate_image_file"
                          className="form-control form-control-sm mt-2"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={handleFileChange}
                        />

                        <div className="form-text small text-start mt-2" style={{ fontSize: '0.75rem' }}>
                          &bull; Max file size: <strong>3 MB</strong><br />
                          &bull; Accepted: JPG, JPEG, PNG, WEBP<br />
                          &bull; Auto-resized & compressed for web
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
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowModal(false)} disabled={uploadingImage}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-nacos-primary rounded-pill px-4 fw-bold" disabled={uploadingImage}>
                    {uploadingImage ? 'Uploading Image & Saving...' : 'Save Candidate'}
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
