import React, { useState, useEffect } from 'react';
import { studentService } from '../../services/studentService';
import { electionService } from '../../services/electionService';
import { parseStudentDocument } from '../../utils/documentParser';
import { validateMatricNumber, getStudentCohort } from '../../lib/matricValidator';
import { downloadStudentTemplate, exportStudentsCustom } from '../../utils/exportCsv';
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
  FileSpreadsheet,
  FileText,
  Layers,
  Mail,
  User,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCohort, setFilterCohort] = useState('ALL');
  const [filterEmailStatus, setFilterEmailStatus] = useState('ALL');
  const [filterEligibility, setFilterEligibility] = useState('ALL');
  const [filterVoted, setFilterVoted] = useState('ALL');

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    matric_number: '',
    full_name: '',
    email: '',
    eligible_to_vote: true
  });
  const [manualValidation, setManualValidation] = useState(null);
  const [manualError, setManualError] = useState('');
  const [manualSaving, setManualSaving] = useState(false);

  // Document Import State (Supports CSV, Excel .xlsx/.xls, Word .docx/.doc, PDF .pdf)
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [selectedImportType, setSelectedImportType] = useState('AUTO'); // 'AUTO' | 'MATRIC_NAME' | 'MATRIC_EMAIL' | 'MATRIC_NAME_EMAIL'
  const [importError, setImportError] = useState(null);
  const [importStatusMessage, setImportStatusMessage] = useState(null);

  // Dropdown menus
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsData, activeEl] = await Promise.all([
        studentService.getStudents({
          search: searchTerm,
          filterCohort,
          filterEmailStatus,
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
  }, [filterCohort, filterEmailStatus, filterEligibility, filterVoted]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowTemplateMenu(false);
      setShowExportMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Document File Selection & Parse (Supports CSV, Excel .xlsx/.xls, Word .docx/.doc, PDF .pdf)
  const handleDocumentSelect = async (e, forcedType = null) => {
    const file = e?.target?.files ? e.target.files[0] : csvFile;
    if (!file) return;

    const typeToUse = forcedType || selectedImportType;
    setCsvFile(file);
    setCsvParsing(true);
    setImportError(null);
    setImportStatusMessage(null);
    try {
      const parsed = await parseStudentDocument(file, typeToUse);

      // Cross-reference with existing in-memory students to show "Will Update" vs "Will Insert"
      const existingMatricSet = new Set(students.map((s) => s.matric_number.toUpperCase()));
      let willUpdateCount = 0;
      let willInsertCount = 0;

      parsed.validStudents.forEach((vs) => {
        if (existingMatricSet.has(vs.matric_number.toUpperCase())) {
          willUpdateCount++;
        } else {
          willInsertCount++;
        }
      });

      setCsvPreview({
        ...parsed,
        willUpdateCount,
        willInsertCount
      });
    } catch (err) {
      console.warn('Document parse error:', err);
      setImportError(err.message || 'Failed to extract student records from document.');
      setCsvPreview(null);
    } finally {
      setCsvParsing(false);
    }
  };

  const handleImportTypeChange = (newType) => {
    setSelectedImportType(newType);
    if (csvFile) {
      handleDocumentSelect(null, newType);
    }
  };

  const handleCommitCsv = async () => {
    if (!csvPreview || !csvPreview.validStudents.length) return;

    setCsvImporting(true);
    setImportStatusMessage(null);
    try {
      const result = await studentService.importStudents(csvPreview.validStudents);
      const inserted = result.inserted || 0;
      const updated = result.updated || 0;
      const total = result.total || inserted + updated;

      alert(`Import Successful!\n- New records added: ${inserted}\n- Existing records updated: ${updated}\n- Total processed: ${total}`);
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
        full_name: s.full_name || '',
        email: s.email || '',
        eligible_to_vote: s.eligible_to_vote
      });
      setManualValidation(validateMatricNumber(s.matric_number));
    } else {
      setEditingStudent(null);
      setManualForm({
        matric_number: '',
        full_name: '',
        email: '',
        eligible_to_vote: true
      });
      setManualValidation(null);
    }
    setShowManualModal(true);
  };

  const handleManualMatricChange = (val) => {
    const updated = val.toUpperCase();
    setManualForm({ ...manualForm, matric_number: updated });
    setManualError('');
    if (updated.length >= 8) {
      setManualValidation(validateMatricNumber(updated));
    } else {
      setManualValidation(null);
    }
  };

  const handleSaveManual = async (e) => {
    e.preventDefault();
    setManualError('');

    const validation = validateMatricNumber(manualForm.matric_number);
    if (!validation.isValid) {
      setManualError(validation.error || 'Invalid matriculation number format or cohort range.');
      return;
    }

    if (!manualForm.full_name.trim() && !manualForm.email.trim()) {
      setManualError('Please provide at least a Full Name or Email address.');
      return;
    }

    setManualSaving(true);
    try {
      if (editingStudent) {
        await studentService.updateStudent(editingStudent.id, {
          matric_number: validation.normalized,
          full_name: manualForm.full_name.trim() || null,
          email: manualForm.email.trim().toLowerCase() || null,
          eligible_to_vote: manualForm.eligible_to_vote
        });
      } else {
        await studentService.addStudentManual({
          matric_number: validation.normalized,
          full_name: manualForm.full_name.trim() || null,
          email: manualForm.email.trim().toLowerCase() || null,
          eligible_to_vote: manualForm.eligible_to_vote
        });
      }

      setShowManualModal(false);
      loadData();
    } catch (err) {
      setManualError(err.message || 'Failed to save student record.');
    } finally {
      setManualSaving(false);
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
    if (!s.email) {
      alert('Cannot verify email: Student has no registered email. Please edit student and add an email first.');
      return;
    }
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
      alert(`Voting status for ${selectedStudentForReset.full_name || selectedStudentForReset.matric_number} has been reset.`);
      setShowResetModal(false);
      setSelectedStudentForReset(null);
      loadData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Compute Registry Statistics
  const totalCount = students.length;
  const nd1Count = students.filter((s) => s.cohort === 'ND1').length;
  const nd2Count = students.filter((s) => s.cohort === 'ND2').length;
  const hasEmailCount = students.filter((s) => s.email && s.email.trim() !== '').length;
  const missingEmailCount = totalCount - hasEmailCount;
  const votedCount = students.filter((s) => s.has_voted).length;

  return (
    <div className="container-fluid p-0">
      {/* Top Header & Actions Bar */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Student & Voter Registry</h2>
          <p className="text-secondary small mb-0">
            Multi-mode CSV imports, automatic ND1/ND2 detection, non-destructive updates, and voter status tracking
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Download Templates Dropdown */}
          <div className="dropdown position-relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowTemplateMenu(!showTemplateMenu);
                setShowExportMenu(false);
              }}
              className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
              type="button"
            >
              <FileSpreadsheet size={15} />
              <span>CSV Templates</span>
              <ChevronDown size={13} />
            </button>
            {showTemplateMenu && (
              <div className="dropdown-menu show shadow border-0 mt-1 py-1" style={{ position: 'absolute', zIndex: 1050 }}>
                <button
                  className="dropdown-item small py-2 d-flex flex-column"
                  onClick={() => {
                    downloadStudentTemplate('MATRIC_NAME');
                    setShowTemplateMenu(false);
                  }}
                >
                  <span className="fw-bold text-dark">Option 1: Matric + Name</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Headers: matric_number, full_name</span>
                </button>
                <button
                  className="dropdown-item small py-2 d-flex flex-column"
                  onClick={() => {
                    downloadStudentTemplate('MATRIC_EMAIL');
                    setShowTemplateMenu(false);
                  }}
                >
                  <span className="fw-bold text-dark">Option 2: Matric + Email</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Headers: matric_number, email</span>
                </button>
                <div className="dropdown-divider my-1" />
                <button
                  className="dropdown-item small py-2 d-flex flex-column"
                  onClick={() => {
                    downloadStudentTemplate('COMPLETE');
                    setShowTemplateMenu(false);
                  }}
                >
                  <span className="fw-bold text-success">Option 3: Matric + Name + Email</span>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>Headers: matric_number, full_name, email</span>
                </button>
              </div>
            )}
          </div>

          {/* Export Roster Dropdown */}
          <div className="dropdown position-relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowTemplateMenu(false);
              }}
              className="btn btn-outline-dark btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
              type="button"
            >
              <Download size={15} />
              <span>Export Roster</span>
              <ChevronDown size={13} />
            </button>
            {showExportMenu && (
              <div className="dropdown-menu show shadow border-0 mt-1 py-1" style={{ position: 'absolute', zIndex: 1050 }}>
                <button
                  className="dropdown-item small py-2"
                  onClick={() => {
                    exportStudentsCustom(students, 'MATRIC_NAME');
                    setShowExportMenu(false);
                  }}
                >
                  Export Matric + Name
                </button>
                <button
                  className="dropdown-item small py-2"
                  onClick={() => {
                    exportStudentsCustom(students, 'MATRIC_EMAIL');
                    setShowExportMenu(false);
                  }}
                >
                  Export Matric + Email
                </button>
                <div className="dropdown-divider my-1" />
                <button
                  className="dropdown-item small py-2 fw-bold text-dark"
                  onClick={() => {
                    exportStudentsCustom(students, 'COMPLETE');
                    setShowExportMenu(false);
                  }}
                >
                  Export Complete Voter Roster (All Details)
                </button>
              </div>
            )}
          </div>

          {/* Import Student Roster Button */}
          <button
            onClick={() => {
              setImportError(null);
              setShowCsvModal(true);
            }}
            className="btn btn-outline-success btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-semibold shadow-sm"
          >
            <Upload size={15} />
            <span>Import Student Roster</span>
          </button>

          {/* Manual Add Student Button */}
          <button
            onClick={() => handleOpenManual()}
            className="btn btn-nacos-primary btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-bold shadow-sm"
          >
            <Plus size={15} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Cohort & Registry Metrics Bar */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
            <span className="small text-muted d-block mb-1">Total Registered</span>
            <h4 className="fw-bold text-dark mb-0">{totalCount}</h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm p-3 h-100 border-start border-primary border-4" style={{ borderRadius: '12px' }}>
            <span className="small text-muted d-block mb-1">ND1 Cohort (2025)</span>
            <h4 className="fw-bold text-primary mb-0">{nd1Count} <span className="fs-6 text-muted fw-normal">/ 142</span></h4>
          </div>
        </div>
        <div className="col-6 col-md-2">
          <div className="card border-0 shadow-sm p-3 h-100 border-start border-success border-4" style={{ borderRadius: '12px' }}>
            <span className="small text-muted d-block mb-1">ND2 Cohort (2024)</span>
            <h4 className="fw-bold text-success mb-0">{nd2Count} <span className="fs-6 text-muted fw-normal">/ 84</span></h4>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
            <span className="small text-muted d-block mb-1">Email Status</span>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                {hasEmailCount} with Email
              </span>
              {missingEmailCount > 0 && (
                <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                  {missingEmailCount} Missing
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
            <span className="small text-muted d-block mb-1">Voting Turnout</span>
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-dark fs-5">{votedCount} Voted</span>
              <span className="text-muted small">({totalCount ? Math.round((votedCount / totalCount) * 100) : 0}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Search & Filtering Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '14px' }}>
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-lg-4">
            <form onSubmit={handleSearch} className="input-group input-group-sm">
              <span className="input-group-text bg-light border-end-0">
                <Search size={15} className="text-secondary" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by matric, name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="btn btn-dark">Search</button>
            </form>
          </div>

          {/* Cohort Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={filterCohort}
              onChange={(e) => setFilterCohort(e.target.value)}
            >
              <option value="ALL">All Cohorts (ND1 + ND2)</option>
              <option value="ND1">ND1 (2025 Entry)</option>
              <option value="ND2">ND2 (2024 Entry)</option>
            </select>
          </div>

          {/* Email Status Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={filterEmailStatus}
              onChange={(e) => setFilterEmailStatus(e.target.value)}
            >
              <option value="ALL">All Email Status</option>
              <option value="HAS_EMAIL">Email Registered</option>
              <option value="MISSING_EMAIL">Missing Email</option>
            </select>
          </div>

          {/* Eligibility Filter */}
          <div className="col-6 col-md-2">
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

          {/* Voting Status Filter */}
          <div className="col-5 col-md-1">
            <select
              className="form-select form-select-sm"
              value={filterVoted}
              onChange={(e) => setFilterVoted(e.target.value)}
            >
              <option value="ALL">Votes: All</option>
              <option value="VOTED">Voted</option>
              <option value="NOT_VOTED">Not Voted</option>
            </select>
          </div>

          {/* Refresh Button */}
          <div className="col-1 text-end">
            <button
              onClick={loadData}
              className="btn btn-light btn-sm border w-100 d-flex align-items-center justify-content-center"
              title="Refresh Roster"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light small text-uppercase fw-bold text-secondary">
              <tr>
                <th className="ps-4">Matric Number</th>
                <th>Level</th>
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
                  <td colSpan="8" className="text-center py-5 text-muted">
                    {loading ? (
                      <div className="py-3">
                        <span className="spinner-border spinner-border-sm me-2 text-success" />
                        <span>Loading voter registry records...</span>
                      </div>
                    ) : (
                      'No student records found matching the filter criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    {/* Matric Number */}
                    <td className="ps-4">
                      <span className="font-monospace fw-bold text-dark fs-6">
                        {s.matric_number}
                      </span>
                    </td>

                    {/* Level / Cohort Badge */}
                    <td>
                      {s.cohort === 'ND1' ? (
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                          ND1
                        </span>
                      ) : s.cohort === 'ND2' ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                          ND2
                        </span>
                      ) : (
                        <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                          {s.cohort}
                        </span>
                      )}
                    </td>

                    {/* Full Name */}
                    <td>
                      {s.full_name ? (
                        <span className="fw-semibold text-dark">{s.full_name}</span>
                      ) : (
                        <span className="text-muted fst-italic small">Name Not Provided</span>
                      )}
                    </td>

                    {/* Email */}
                    <td>
                      {s.email ? (
                        <span className="small text-secondary font-monospace">
                          {s.email}
                        </span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                          No Email Added
                        </span>
                      )}
                    </td>

                    {/* Email Verified */}
                    <td>
                      {s.email ? (
                        s.email_verified ? (
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
                        )
                      ) : (
                        <span className="text-muted small">&mdash;</span>
                      )}
                    </td>

                    {/* Eligibility Toggle */}
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

                    {/* Has Voted */}
                    <td>
                      {s.has_voted ? (
                        <span className="badge bg-success d-inline-flex align-items-center gap-1">
                          <CheckCircle2 size={12} /> Yes
                        </span>
                      ) : (
                        <span className="badge bg-secondary">No</span>
                      )}
                    </td>

                    {/* Actions */}
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
                            if (window.confirm(`Delete student "${s.full_name || s.matric_number}"?`)) {
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

                  {/* Matric Number */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label small fw-bold text-dark mb-0">Matriculation Number</label>
                      {manualValidation?.isValid && (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Valid {manualValidation.cohort}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      className={`form-control font-monospace ${
                        manualValidation ? (manualValidation.isValid ? 'is-valid' : 'is-invalid') : ''
                      }`}
                      placeholder="e.g. FPA/CS/24/1-0025 or FPA/CS/25/1-0042"
                      value={manualForm.matric_number}
                      onChange={(e) => handleManualMatricChange(e.target.value)}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: '0.74rem' }}>
                      Recognized ranges: ND2 (<code>FPA/CS/24/1-0001</code> to <code>0084</code>) & ND1 (<code>FPA/CS/25/1-0001</code> to <code>0142</code>)
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">
                      Student Full Name <span className="text-muted fw-normal">(Optional if Email is provided)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. OLUWATOYIN BLESSING ADEBAYO"
                      value={manualForm.full_name}
                      onChange={(e) => setManualForm({ ...manualForm, full_name: e.target.value })}
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-dark">
                      Registered Email <span className="text-muted fw-normal">(Optional if Name is provided)</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="student@student.nacos.edu"
                      value={manualForm.email}
                      onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    />
                    <div className="form-text small" style={{ fontSize: '0.74rem' }}>
                      Can be imported or added later without losing student record.
                    </div>
                  </div>

                  {/* Eligibility Toggle */}
                  <div className="form-check form-switch mt-3">
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
                  <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setShowManualModal(false)} disabled={manualSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-nacos-primary rounded-pill px-4 fw-bold" disabled={manualSaving}>
                    {manualSaving ? 'Saving...' : editingStudent ? 'Update Record' : 'Save Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Document Import Modal (CSV, Excel, Word, PDF) */}
      {showCsvModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
              <div className="modal-header p-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <FileSpreadsheet className="text-success" size={24} />
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Import Student Roster</h5>
                    <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                      Supports CSV, Excel (.xlsx/.xls), Word (.docx), and PDF (.pdf) &bull; Non-destructive upsert
                    </span>
                  </div>
                </div>
                <button type="button" className="btn-close" onClick={() => setShowCsvModal(false)} disabled={csvImporting} />
              </div>

              <div className="modal-body p-4">
                {/* Import Type Selector */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark d-block mb-1">
                    Select Target Import Type:
                  </label>
                  <div className="btn-group w-100" role="group" aria-label="Import Type">
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedImportType === 'AUTO' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => handleImportTypeChange('AUTO')}
                    >
                      Auto Detect
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedImportType === 'MATRIC_NAME' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => handleImportTypeChange('MATRIC_NAME')}
                    >
                      1. Matric + Name
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedImportType === 'MATRIC_EMAIL' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => handleImportTypeChange('MATRIC_EMAIL')}
                    >
                      2. Matric + Email
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${selectedImportType === 'MATRIC_NAME_EMAIL' ? 'btn-success fw-bold' : 'btn-outline-secondary'}`}
                      onClick={() => handleImportTypeChange('MATRIC_NAME_EMAIL')}
                    >
                      3. Full (Matric+Name+Email)
                    </button>
                  </div>
                  <div className="form-text small mt-1 text-muted" style={{ fontSize: '0.78rem' }}>
                    {selectedImportType === 'MATRIC_NAME' && 'Only Matric Number and Full Name are required. Email is optional and will not be overwritten.'}
                    {selectedImportType === 'MATRIC_EMAIL' && 'Only Matric Number and Email are required. Full Name is optional and will not be overwritten.'}
                    {selectedImportType === 'MATRIC_NAME_EMAIL' && 'Requires Matric Number, Full Name, and Email.'}
                    {selectedImportType === 'AUTO' && 'Automatically detects available fields from headers and data.'}
                  </div>
                </div>

                {/* File Input */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-dark">
                    Upload Document (CSV, Excel, Word, or PDF)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".csv, .xlsx, .xls, .docx, .doc, .pdf"
                    onChange={handleDocumentSelect}
                    disabled={csvParsing || csvImporting}
                  />
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="badge bg-light text-dark border">.csv</span>
                    <span className="badge bg-light text-dark border">.xlsx / .xls</span>
                    <span className="badge bg-light text-dark border">.docx</span>
                    <span className="badge bg-light text-dark border">.pdf</span>
                    <span className="text-muted small ms-auto" style={{ fontSize: '0.75rem' }}>
                      Recognizes Matric (e.g. FPA/CS/24/1-XXXX), Name, and Email
                    </span>
                  </div>
                </div>

                {/* Parsing Spinner */}
                {csvParsing && (
                  <div className="text-center py-4 bg-light rounded-3 my-3">
                    <span className="spinner-border spinner-border-sm me-2 text-success" />
                    <span className="small text-secondary fw-semibold">Extracting and validating student data...</span>
                  </div>
                )}

                {/* Parse Error Alert */}
                {importError && (
                  <div className="alert alert-danger d-flex align-items-start gap-2 py-3 px-3 my-3 small" role="alert">
                    <AlertTriangle size={18} className="flex-shrink-0 mt-1" />
                    <div>
                      <strong>Document Extraction Notice:</strong>
                      <div>{importError}</div>
                      <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                        Make sure the file contains clearly formatted student rows with matriculation numbers (e.g., FPA/CS/24/1-0001).
                      </div>
                    </div>
                  </div>
                )}

                {/* Preview Section */}
                {csvPreview && (
                  <div className="mt-3">
                    {/* Header Summary Bar */}
                    <div className="d-flex align-items-center justify-content-between p-2 mb-3 bg-dark text-white rounded-3 px-3">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {csvPreview.fileType && (
                          <span className="badge bg-info text-dark font-monospace">{csvPreview.fileType}</span>
                        )}
                        <span className="badge bg-success">Mode: {csvPreview.modeLabel}</span>
                      </div>
                      <span className="small text-secondary">
                        {csvPreview.totalProcessed} total entries extracted
                      </span>
                    </div>

                    {/* Stats Tiles */}
                    <div className="row g-2 mb-3">
                      <div className="col-3">
                        <div className="p-2 bg-success bg-opacity-10 border border-success rounded text-center">
                          <span className="small text-success d-block fw-bold">Valid Records</span>
                          <span className="fs-5 fw-bold text-success">{csvPreview.validStudents.length}</span>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 bg-primary bg-opacity-10 border border-primary rounded text-center">
                          <span className="small text-primary d-block fw-bold">Cohort Breakdown</span>
                          <span className="small text-dark fw-bold d-block">
                            ND1: {csvPreview.nd1Count} &bull; ND2: {csvPreview.nd2Count}
                          </span>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 bg-info bg-opacity-10 border border-info rounded text-center">
                          <span className="small text-info-emphasis d-block fw-bold">Will Update / Insert</span>
                          <span className="small text-dark fw-bold d-block">
                            {csvPreview.willUpdateCount} Update &bull; {csvPreview.willInsertCount} New
                          </span>
                        </div>
                      </div>
                      <div className="col-3">
                        <div className="p-2 bg-danger bg-opacity-10 border border-danger rounded text-center">
                          <span className="small text-danger d-block fw-bold">Invalid / Skipped</span>
                          <span className="fs-5 fw-bold text-danger">
                            {csvPreview.invalidRows.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Validation Warnings List */}
                    {csvPreview.invalidRows.length > 0 && (
                      <div className="alert alert-warning small py-2 mb-3" style={{ maxHeight: '130px', overflowY: 'auto' }}>
                        <strong>Validation Warnings & Skipped Rows:</strong>
                        <ul className="mb-0 ps-3">
                          {csvPreview.invalidRows.slice(0, 6).map((inv, idx) => (
                            <li key={idx}>Row {inv.row}: {inv.reason}</li>
                          ))}
                          {csvPreview.invalidRows.length > 6 && (
                            <li>...and {csvPreview.invalidRows.length - 6} more skipped rows</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Preview Table */}
                    <div className="border rounded p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="table table-sm table-striped small mb-0 font-monospace">
                        <thead>
                          <tr>
                            <th>Matric Number</th>
                            <th>Cohort</th>
                            <th>Full Name</th>
                            <th>Email Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.validStudents.slice(0, 15).map((vs, idx) => (
                            <tr key={idx}>
                              <td className="fw-bold">{vs.matric_number}</td>
                              <td>
                                <span className={`badge ${vs.cohort === 'ND1' ? 'bg-primary' : 'bg-success'}`}>
                                  {vs.cohort}
                                </span>
                              </td>
                              <td>{vs.full_name || <span className="text-muted fst-italic">Omitted</span>}</td>
                              <td>{vs.email || <span className="text-muted fst-italic">Omitted</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvPreview.validStudents.length > 15 && (
                        <div className="text-center small text-muted py-1 border-top">
                          Showing first 15 of {csvPreview.validStudents.length} valid students
                        </div>
                      )}
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
                  {csvImporting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      <span>Merging Records...</span>
                    </>
                  ) : (
                    `Commit Import (${csvPreview?.validStudents?.length || 0} Records)`
                  )}
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
        targetName={`${selectedStudentForReset?.full_name || selectedStudentForReset?.matric_number}`}
      />
    </div>
  );
}
