import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { electionService } from '../../services/electionService';
import { parseStudentCsv } from '../../utils/csvParser';
import { validateMatricNumber } from '../../lib/matricValidator';
import { downloadCsv } from '../../utils/exportCsv';
import { ResetConfirmModal } from '../../components/ResetConfirmModal';
import {
  GraduationCap,
  Upload,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit2,
  Trash2,
  Filter,
  Download,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('ALL');
  const [filterVoted, setFilterVoted] = useState('ALL');

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Manual Form
  const [manualForm, setManualForm] = useState({
    matric_number: '',
    full_name: '',
    email: '',
    eligible_to_vote: true
  });
  const [manualError, setManualError] = useState('');

  // CSV State
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, activeEl] = await Promise.all([
        studentService.getStudents({
          search: searchTerm,
          filterEligibility,
          filterVoted
        }),
        electionService.getActiveElection()
      ]);
      setStudents(studentsData || []);
      setElection(activeEl);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterEligibility, filterVoted]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  // CSV File Selection & Parse
  const handleCsvSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setCsvParsing(true);
    try {
      const parsed = await parseStudentCsv(file);
      setCsvPreview(parsed);
    } catch (err) {
      alert(`CSV Parse Error: ${err.message}`);
      setCsvPreview(null);
    } finally {
      setCsvParsing(false);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreview || !csvPreview.validStudents.length) return;

    setCsvImporting(true);
    try {
      const result = await studentService.importStudents(csvPreview.validStudents);
      alert(`Successfully imported ${result.imported} students!`);
      setShowCsvModal(false);
      setCsvPreview(null);
      setCsvFile(null);
      loadData();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setCsvImporting(false);
    }
  };

  // Manual Add / Edit
  const handleOpenManual = (s = null) => {
    setManualError('');
    if (s) {
      setEditingStudent(s);
      setManualForm({
        matric_number: s.matric_number,
        full_name: s.full_name,
        email: s.email,
        eligible_to_vote: s.eligible_to_vote
      });
    } else {
      setEditingStudent(null);
      setManualForm({
        matric_number: '',
        full_name: '',
        email: '',
        eligible_to_vote: true
      });
    }
    setShowManualModal(true);
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    setManualError('');

    // Validate matric number
    const validation = validateMatricNumber(manualForm.matric_number);
    if (!validation.isValid) {
      setManualError(validation.error);
      return;
    }

    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, {
          matric_number: validation.normalized,
          full_name: manualForm.full_name.trim(),
          email: manualForm.email.trim().toLowerCase(),
          eligible_to_vote: manualForm.eligible_to_vote
        });
      } else {
        await studentService.addStudentManual({
          matric_number: validation.normalized,
          full_name: manualForm.full_name.trim(),
          email: manualForm.email.trim().toLowerCase(),
          eligible_to_vote: manualForm.eligible_to_vote
        });
      }

      setShowManualModal(false);
      loadData();
    } catch (err) {
      setManualError(err.message || 'Failed to save student.');
    }
  };

  const handleToggleEligibility = async (s) => {
    try {
      await studentService.updateStudent(s.id, { eligible_to_vote: !s.eligible_to_vote });
      loadData();
    } catch (err) {
      alert('Failed to update voter eligibility.');
    }
  };

  const handleMarkVerified = async (s) => {
    try {
      await studentService.updateStudent(s.id, { email_verified: true });
      loadData();
    } catch (err) {
      alert('Failed to verify email.');
    }
  };

  // Reset Voter Workflow
  const handleOpenReset = (s) => {
    setSelectedStudentForReset(s);
    setShowResetModal(true);
  };

  const handleConfirmReset = async ({ reason }) => {
    if (!selectedStudentForReset) return;

    try {
      await studentService.resetVoter(selectedStudentForReset.id, election?.id, reason);
      alert(`Voting status for ${selectedStudentForReset.full_name} has been reset.`);
      setShowResetModal(false);
      setSelectedStudentForReset(null);
      loadData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Export List
  const handleExportRoster = () => {
    const data = students.map((s) => ({
      'Matric Number': s.matric_number,
      'Full Name': s.full_name,
      'Email': s.email,
      'Verified': s.email_verified ? 'YES' : 'NO',
      'Eligible': s.eligible_to_vote ? 'YES' : 'NO',
      'Voted': s.has_voted ? 'YES' : 'NO'
    }));
    downloadCsv(data, 'nacos_student_voter_roster.csv');
  };

  return (
    <div>
      {/* Title & Actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Student & Voter Registry</h2>
          <p className="text-secondary small mb-0">
            Cohort management, CSV bulk import, voter eligibility, and status resets
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            onClick={handleExportRoster}
            className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
            title="Export CSV"
          >
            <Download size={15} />
            <span>Export Roster</span>
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="btn btn-outline-success btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-semibold"
          >
            <Upload size={15} />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => handleOpenManual()}
            className="btn btn-nacos-primary btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-bold"
          >
            <Plus size={15} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '14px' }}>
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <form onSubmit={handleSearch} className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <Search size={15} className="text-secondary" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by matric, full name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="btn btn-dark">Search</button>
            </form>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              value={filterEligibility}
              onChange={(e) => setFilterEligibility(e.target.value)}
            >
              <option value="ALL">Eligibility: All</option>
              <option value="ELIGIBLE">Eligible Only</option>
              <option value="INELIGIBLE">Ineligible Only</option>
            </select>
          </div>

          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-sm"
              value={filterVoted}
              onChange={(e) => setFilterVoted(e.target.value)}
            >
              <option value="ALL">Voted Status: All</option>
              <option value="VOTED">Has Voted</option>
              <option value="NOT_VOTED">Not Voted</option>
            </select>
          </div>

          <div className="col-12 col-md-1 text-md-end">
            <button
              onClick={loadData}
              className="btn btn-light btn-sm border w-100"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4">Matric Number</th>
                <th>Student Full Name</th>
                <th>Registered Email</th>
                <th>Email Verified</th>
                <th>Eligibility</th>
                <th>Vote Cast</th>
                <th className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No student records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td className="ps-4">
                      <span className="font-monospace fw-bold text-dark fs-6">
                        {s.matric_number}
                      </span>
                    </td>
                    <td>
                      <span className="fw-semibold text-dark">{s.full_name}</span>
                    </td>
                    <td className="small text-secondary font-monospace">
                      {s.email}
                    </td>
                    <td>
                      {s.email_verified ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMarkVerified(s)}
                          className="btn btn-xs btn-outline-warning rounded-pill py-0 px-2 small"
                          title="Click to manually verify email"
                          style={{ fontSize: '0.74rem' }}
                        >
                          Unverified (Verify)
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleEligibility(s)}
                        className={`btn btn-xs rounded-pill py-0 px-2 small ${
                          s.eligible_to_vote ? 'btn-success' : 'btn-danger'
                        }`}
                        style={{ fontSize: '0.74rem' }}
                        title="Click to toggle voting permission"
                      >
                        {s.eligible_to_vote ? 'Eligible' : 'Blocked'}
                      </button>
                    </td>
                    <td>
                      {s.has_voted ? (
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> Yes
                        </span>
                      ) : (
                        <span className="badge bg-secondary">No</span>
                      )}
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group">
                        {s.has_voted && (
                          <button
                            onClick={() => handleOpenReset(s)}
                            className="btn btn-outline-warning btn-sm rounded-pill me-1"
                            title="Reset voting status"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenManual(s)}
                          className="btn btn-outline-secondary btn-sm rounded-pill me-1"
                          title="Edit Student"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Delete student "${s.full_name}"?`)) {
                              await studentService.deleteStudent(s.id);
                              loadData();
                            }
                          }}
                          className="btn btn-outline-danger btn-sm rounded-pill"
                          title="Delete Student"
                        >
                          <Trash2 size={13} />
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

      {/* Manual Add / Edit Modal */}
      {showManualModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <h5 className="modal-title fw-bold">
                  {editingStudent ? 'Edit Student Record' : 'Add Student to Registry'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowManualModal(false)} />
              </div>
              <form onSubmit={handleSaveManual}>
                <div className="modal-body p-4">
                  {manualError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {manualError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Matriculation Number</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="e.g. FPA/CS/24/1-0025"
                      value={manualForm.matric_number}
                      onChange={(e) => setManualForm({ ...manualForm, matric_number: e.target.value.toUpperCase() })}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: '0.75rem' }}>
                      Valid ranges: Group 1 (24/1-0001 to 0084) & Group 2 (25/1-0001 to 0142)
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. OLUWATOYIN BLESSING ADEBAYO"
                      value={manualForm.full_name}
                      onChange={(e) => setManualForm({ ...manualForm, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">Registered Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="student@student.nacos.edu"
                      value={manualForm.email}
                      onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-check form-switch mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="manual_eligible"
                      checked={manualForm.eligible_to_vote}
                      onChange={(e) => setManualForm({ ...manualForm, eligible_to_vote: e.target.checked })}
                    />
                    <label className="form-check-label small fw-bold text-dark" htmlFor="manual_eligible">
                      Eligible to vote in election
                    </label>
                  </div>
                </div>

                <div className="modal-footer p-3 bg-light d-flex justify-content-between">
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowManualModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-nacos-primary rounded-pill px-4 fw-bold">
                    Save Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <FileSpreadsheet className="text-success" size={24} />
                  <h5 className="modal-title fw-bold mb-0">Import Students from CSV</h5>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowCsvModal(false)} disabled={csvImporting} />
              </div>

              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">Select CSV File</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".csv"
                    onChange={handleCsvSelect}
                    disabled={csvParsing || csvImporting}
                  />
                  <div className="form-text small mt-1">
                    Columns supported: <code>matric_number</code>, <code>full_name</code>, <code>email</code>
                  </div>
                </div>

                {csvParsing && (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm me-2" />
                    <span>Parsing and validating student records...</span>
                  </div>
                )}

                {csvPreview && (
                  <div>
                    <div className="row g-2 mb-3">
                      <div className="col-4">
                        <div className="p-2 bg-success bg-opacity-10 border border-success rounded text-center">
                          <span className="small text-success d-block fw-bold">Valid Students</span>
                          <span className="fs-5 fw-bold text-success">{csvPreview.validStudents.length}</span>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 bg-danger bg-opacity-10 border border-danger rounded text-center">
                          <span className="small text-danger d-block fw-bold">Invalid / Out of Range</span>
                          <span className="fs-5 fw-bold text-danger">{csvPreview.invalidRows.length}</span>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="p-2 bg-warning bg-opacity-10 border border-warning rounded text-center">
                          <span className="small text-dark d-block fw-bold">Duplicate Rows</span>
                          <span className="fs-5 fw-bold text-dark">{csvPreview.duplicateCount}</span>
                        </div>
                      </div>
                    </div>

                    {csvPreview.invalidRows.length > 0 && (
                      <div className="alert alert-warning small py-2 mb-3" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                        <strong>Validation Warnings:</strong>
                        <ul className="mb-0 ps-3">
                          {csvPreview.invalidRows.slice(0, 5).map((inv, idx) => (
                            <li key={idx}>Line {inv.row}: {inv.reason}</li>
                          ))}
                          {csvPreview.invalidRows.length > 5 && (
                            <li>...and {csvPreview.invalidRows.length - 5} more issues</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <table className="table table-sm table-striped small mb-0 font-monospace">
                        <thead>
                          <tr>
                            <th>Matric Number</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Cohort</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.validStudents.slice(0, 10).map((vs, idx) => (
                            <tr key={idx}>
                              <td>{vs.matric_number}</td>
                              <td>{vs.full_name}</td>
                              <td>{vs.email}</td>
                              <td><span className="badge bg-secondary">{vs.group || 'OK'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer p-3 bg-light d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={() => setShowCsvModal(false)}
                  disabled={csvImporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success rounded-pill px-4 fw-bold"
                  onClick={handleCommitCsv}
                  disabled={!csvPreview || !csvPreview.validStudents.length || csvImporting}
                >
                  {csvImporting ? 'Importing Students...' : `Commit Import (${csvPreview?.validStudents?.length || 0})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Voter Modal */}
      <ResetConfirmModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmReset}
        type="SINGLE_VOTER"
        targetName={`${selectedStudentForReset?.full_name} (${selectedStudentForReset?.matric_number})`}
      />
    </div>
  );
}
