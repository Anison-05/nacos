import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { auditService } from '../../services/auditService';
import { downloadCsv, formatElectionResultsForCsv } from '../../utils/exportCsv';
import { CandidateProgressBar } from '../../components/TurnoutChart';
import {
  BarChart3,
  Download,
  Share2,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function Results() {
  const [election, setElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const activeEl = await electionService.getActiveElection();
      setElection(activeEl);

      if (activeEl?.id) {
        const resData = await electionService.getResults(activeEl.id);
        setResults(resData);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
      setError(err.message || 'Unable to retrieve election results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleTogglePublish = async () => {
    if (!election) return;
    const nextState = !election.results_published;
    const confirmMsg = nextState
      ? 'Release official results to all registered student voters?'
      : 'Revoke public results and make them confidential to administrators only?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await electionService.updateElection(election.id, { results_published: nextState });
      await auditService.recordLog('TOGGLE_RESULTS_PUBLISH', 'election', election.id, { results_published: nextState });
      setElection((prev) => ({ ...prev, results_published: nextState }));
      loadResults();
    } catch (err) {
      alert('Failed to update publication status.');
    }
  };

  const handleExportCsv = () => {
    if (!results) return;
    const rows = formatElectionResultsForCsv(results);
    const filename = `nacos_election_results_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(rows, filename);
  };

  return (
    <div>
      {/* Title & Actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Official Election Results & Tally</h2>
          <p className="text-secondary small mb-0">
            Real-time candidate ballots, YES/NO vote percentages, and certified audit counts
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            onClick={loadResults}
            className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center gap-1 px-3"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Tally</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn btn-outline-primary btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-semibold"
            disabled={!results}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {election && (
            <button
              onClick={handleTogglePublish}
              className={`btn btn-sm rounded-pill d-flex align-items-center gap-1 px-3 fw-bold ${
                election.results_published ? 'btn-danger' : 'btn-success'
              }`}
            >
              {election.results_published ? (
                <>
                  <EyeOff size={14} />
                  <span>Unpublish Results</span>
                </>
              ) : (
                <>
                  <Eye size={14} />
                  <span>Release Results to Voters</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}

      {/* Summary KPI Strip */}
      {results?.summary && (
        <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '16px' }}>
          <div className="row g-3 text-center">
            <div className="col-6 col-md-3 border-end">
              <span className="text-muted small d-block">Eligible Voters</span>
              <h3 className="fw-bold text-dark mb-0">{results.summary.total_eligible}</h3>
            </div>
            <div className="col-6 col-md-3 border-end">
              <span className="text-muted small d-block">Votes Cast</span>
              <h3 className="fw-bold text-success mb-0">{results.summary.total_voted}</h3>
            </div>
            <div className="col-6 col-md-3 border-end">
              <span className="text-muted small d-block">Remaining Voters</span>
              <h3 className="fw-bold text-warning mb-0">{results.summary.total_unvoted}</h3>
            </div>
            <div className="col-6 col-md-3">
              <span className="text-muted small d-block">Total Turnout</span>
              <h3 className="fw-bold text-primary mb-0">{results.summary.turnout_percentage}%</h3>
            </div>
          </div>
        </div>
      )}

      {/* Results Grouped by Position */}
      {(!results || !results.positions || results.positions.length === 0) ? (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm p-4">
          <p className="text-secondary mb-0">No position tallies or candidate responses recorded yet.</p>
        </div>
      ) : (
        results.positions.map((pos) => (
          <div key={pos.position_id} className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0 text-uppercase">
                  {pos.title}
                </h5>
                {pos.description && (
                  <span className="text-muted small">{pos.description}</span>
                )}
              </div>
              <span className="badge bg-secondary">
                {pos.candidates?.length || 0} Candidate(s)
              </span>
            </div>

            <div className="card-body p-4">
              {(!pos.candidates || pos.candidates.length === 0) ? (
                <div className="text-muted small">No candidates in this position.</div>
              ) : (
                <div className="row g-4">
                  {/* Visual Progress Bars */}
                  <div className="col-12 col-lg-6">
                    <h6 className="fw-bold text-secondary text-uppercase small mb-3">
                      Visual Distribution
                    </h6>
                    {pos.candidates.map((cand) => (
                      <CandidateProgressBar
                        key={cand.candidate_id}
                        candidateName={cand.full_name}
                        yesVotes={cand.yes_votes}
                        noVotes={cand.no_votes}
                        totalVotes={cand.total_votes}
                        yesPct={cand.yes_pct}
                        noPct={cand.no_pct}
                      />
                    ))}
                  </div>

                  {/* Certified Numbers Table */}
                  <div className="col-12 col-lg-6">
                    <h6 className="fw-bold text-secondary text-uppercase small mb-3">
                      Tabular Audit Ledger
                    </h6>
                    <div className="table-responsive border rounded-3">
                      <table className="table table-sm table-striped align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>Candidate</th>
                            <th className="text-center text-success">YES</th>
                            <th className="text-center text-danger">NO</th>
                            <th className="text-center">Total</th>
                            <th className="text-end">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pos.candidates.map((cand) => (
                            <tr key={cand.candidate_id}>
                              <td>
                                <strong className="d-block text-dark">{cand.full_name}</strong>
                                <span className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                                  {cand.matric_number}
                                </span>
                              </td>
                              <td className="text-center fw-bold text-success">
                                {cand.yes_votes} ({cand.yes_pct}%)
                              </td>
                              <td className="text-center fw-bold text-danger">
                                {cand.no_votes} ({cand.no_pct}%)
                              </td>
                              <td className="text-center fw-bold">
                                {cand.total_votes}
                              </td>
                              <td className="text-end">
                                {cand.yes_pct >= 50 ? (
                                  <span className="badge bg-success">Affirmed</span>
                                ) : (
                                  <span className="badge bg-secondary">Rejected</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
