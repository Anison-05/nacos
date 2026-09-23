import React, { useState, useEffect } from 'react';
import { electionService } from '../../services/electionService';
import { studentService } from '../../services/studentService';
import { StatCard } from '../../components/StatCard';
import { TurnoutGauge } from '../../components/TurnoutChart';
import {
  Users,
  CheckCircle,
  Vote,
  Clock,
  Layers,
  UserCheck,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Eye
} from 'lucide-react';

export function AdminDashboard({ onSelectTab }) {
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState(null);
  const [stats, setStats] = useState({
    totalRegistered: 0,
    totalVerified: 0,
    totalEligible: 0,
    totalVoted: 0,
    totalUnvoted: 0,
    turnoutPct: 0,
    positionsCount: 0,
    candidatesCount: 0
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const activeEl = await electionService.getActiveElection();
      setElection(activeEl);

      const students = await studentService.getStudents();
      const registered = students.length;
      const verified = students.filter((s) => s.email_verified).length;
      const eligible = students.filter((s) => s.eligible_to_vote).length;
      const voted = students.filter((s) => s.has_voted).length;
      const unvoted = eligible - voted;
      const turnout = eligible > 0 ? ((voted / eligible) * 100).toFixed(2) : 0;

      let posCount = 0;
      let candCount = 0;
      if (activeEl?.id) {
        const positions = await electionService.getPositions(activeEl.id);
        posCount = positions.length;
        const candidates = await electionService.getCandidates(activeEl.id);
        candCount = candidates.length;
      }

      setStats({
        totalRegistered: registered,
        totalVerified: verified,
        totalEligible: eligible,
        totalVoted: voted,
        totalUnvoted: unvoted,
        turnoutPct: turnout,
        positionsCount: posCount,
        candidatesCount: candCount
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleStatus = async () => {
    if (!election) return;
    const nextStatus = election.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    const confirmMsg = nextStatus === 'OPEN'
      ? 'Open the election for student ballot submission?'
      : 'Close the election? Students will immediately be prevented from submitting votes.';

    if (!window.confirm(confirmMsg)) return;

    try {
      await electionService.updateElection(election.id, { status: nextStatus });
      setElection((prev) => ({ ...prev, status: nextStatus }));
      loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update election status.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1">Electoral Commission Command Center</h2>
          <p className="text-secondary small mb-0">
            Real-time voter turnout monitoring, ballot status, and administrative operations
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 rounded-pill px-3"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Data</span>
          </button>

          {election && (
            <button
              onClick={handleToggleStatus}
              className={`btn btn-sm ${election.status === 'OPEN' ? 'btn-danger' : 'btn-success'} d-flex align-items-center gap-1 rounded-pill px-3 fw-bold`}
            >
              {election.status === 'OPEN' ? (
                <>
                  <Square size={14} />
                  <span>Close Election</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Open Election</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Election Banner */}
      <div className="card border-0 shadow-sm mb-4 p-4" style={{ borderRadius: '16px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge ${election?.status === 'OPEN' ? 'bg-success' : 'bg-danger'} py-1 px-2`}>
                STATUS: {election?.status || 'NO ACTIVE ELECTION'}
              </span>
              <span className="text-muted small">&bull; Session: {election?.session || '2025/2026'}</span>
            </div>
            <h4 className="fw-bold text-dark mb-0">{election?.title || 'NACOS CEC General Elections'}</h4>
          </div>

          <div className="d-flex gap-2">
            <button
              onClick={() => onSelectTab('admin-results')}
              className="btn btn-outline-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-1 fw-semibold"
            >
              <Eye size={15} />
              <span>Live Tally</span>
            </button>
            <button
              onClick={() => onSelectTab('admin-elections')}
              className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold"
            >
              Configure Election
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Registered Students"
            value={stats.totalRegistered}
            subtitle="Uploaded to voter database"
            icon={Users}
            color="primary"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Verified Students"
            value={stats.totalVerified}
            subtitle="Email confirmation validated"
            icon={CheckCircle}
            color="info"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Eligible Voters"
            value={stats.totalEligible}
            subtitle="Permitted to access ballot"
            icon={UserCheck}
            color="emerald"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Votes Cast"
            value={stats.totalVoted}
            subtitle={`Turnout: ${stats.turnoutPct}%`}
            icon={Vote}
            color="success"
            badgeText={`${stats.turnoutPct}%`}
          />
        </div>
      </div>

      {/* Turnout Gauge & Breakdown */}
      <div className="row g-4 mb-4">
        {/* Turnout Card */}
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
            <h5 className="fw-bold text-dark mb-3">Voter Turnout Metric</h5>
            <TurnoutGauge
              percentage={Number(stats.turnoutPct)}
              votedCount={stats.totalVoted}
              totalEligible={stats.totalEligible}
            />
            <div className="d-flex justify-content-around text-center pt-3 border-top mt-2">
              <div>
                <span className="text-muted small d-block">Voted</span>
                <span className="fw-bold text-success fs-5">{stats.totalVoted}</span>
              </div>
              <div>
                <span className="text-muted small d-block">Remaining</span>
                <span className="fw-bold text-warning fs-5">{stats.totalUnvoted}</span>
              </div>
              <div>
                <span className="text-muted small d-block">Turnout</span>
                <span className="fw-bold text-primary fs-5">{stats.turnoutPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Structure & Quick Links */}
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '16px' }}>
            <h5 className="fw-bold text-dark mb-3">Ballot Structure & Configuration</h5>
            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Layers size={20} className="text-primary" />
                    <span className="fw-bold text-dark">Positions</span>
                  </div>
                  <h3 className="fw-bold text-dark mb-1">{stats.positionsCount}</h3>
                  <p className="text-muted small mb-2">Contested executive offices</p>
                  <button
                    onClick={() => onSelectTab('admin-positions')}
                    className="btn btn-outline-secondary btn-sm rounded-pill w-100"
                  >
                    Manage Positions
                  </button>
                </div>
              </div>

              <div className="col-6">
                <div className="p-3 bg-light rounded-3 border">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <Users size={20} className="text-success" />
                    <span className="fw-bold text-dark">Candidates</span>
                  </div>
                  <h3 className="fw-bold text-dark mb-1">{stats.candidatesCount}</h3>
                  <p className="text-muted small mb-2">Vetted candidates registered</p>
                  <button
                    onClick={() => onSelectTab('admin-candidates')}
                    className="btn btn-outline-secondary btn-sm rounded-pill w-100"
                  >
                    Manage Candidates
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-top">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                <span className="small text-secondary">
                  Need to update admin login credentials or manage voter list?
                </span>
                <div className="d-flex gap-2">
                  <button
                    onClick={() => onSelectTab('admin-settings')}
                    className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-bold"
                  >
                    Admin Settings
                  </button>
                  <button
                    onClick={() => onSelectTab('admin-students')}
                    className="btn btn-nacos-primary btn-sm rounded-pill px-3 fw-bold"
                  >
                    Student Registry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
