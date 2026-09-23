import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VotingProvider } from './context/VotingContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Student Pages
import { Login } from './pages/Login';
import { EmailVerification } from './pages/EmailVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { Welcome } from './pages/Welcome';
import { VotingPage } from './pages/VotingPage';
import { VoteReview } from './pages/VoteReview';
import { VoteSuccess } from './pages/VoteSuccess';

// Admin Pages & Layout
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ElectionManagement } from './pages/admin/ElectionManagement';
import { PositionManagement } from './pages/admin/PositionManagement';
import { CandidateManagement } from './pages/admin/CandidateManagement';
import { StudentManagement } from './pages/admin/StudentManagement';
import { Results } from './pages/admin/Results';
import { AuditLogs } from './pages/admin/AuditLogs';
import { DangerZone } from './pages/admin/DangerZone';

function AppContent() {
  const { currentUser, userRole, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('welcome');
  const [pageParams, setPageParams] = useState({});

  // Sync initial page with authentication status
  useEffect(() => {
    if (!loading) {
      if (userRole === 'admin') {
        if (!currentPage.startsWith('admin-') || currentPage === 'admin-login') {
          setCurrentPage('admin-dashboard');
        }
      } else if (userRole === 'student') {
        if (currentPage === 'login' || currentPage.startsWith('admin-')) {
          setCurrentPage('welcome');
        }
      } else {
        // Not logged in
        if (currentPage !== 'admin-login' && currentPage !== 'forgot-password' && currentPage !== 'verify-email') {
          setCurrentPage('login');
        }
      }
    }
  }, [userRole, loading]);

  const handleNavigate = (page, params = {}) => {
    setPageParams(params);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <div className="spinner-border text-success mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <h5 className="fw-bold text-dark mb-1">NACOS Electoral Commission</h5>
        <p className="text-secondary small">Initializing secure voter terminal...</p>
      </div>
    );
  }

  // Handle Admin Dashboard Tabs
  const renderAdminView = () => {
    switch (currentPage) {
      case 'admin-elections':
        return <ElectionManagement />;
      case 'admin-positions':
        return <PositionManagement />;
      case 'admin-candidates':
        return <CandidateManagement />;
      case 'admin-students':
        return <StudentManagement />;
      case 'admin-results':
        return <Results />;
      case 'admin-audit-logs':
        return <AuditLogs />;
      case 'admin-danger-zone':
        return <DangerZone />;
      case 'admin-dashboard':
      default:
        return <AdminDashboard onSelectTab={handleNavigate} />;
    }
  };

  // Handle Current Page Routing
  const renderCurrentView = () => {
    // Admin login
    if (currentPage === 'admin-login') {
      return <AdminLogin onNavigate={handleNavigate} />;
    }

    // Admin views inside AdminLayout
    if (currentPage.startsWith('admin-')) {
      if (userRole !== 'admin') {
        return <AdminLogin onNavigate={handleNavigate} />;
      }
      return (
        <AdminLayout currentTab={currentPage} onSelectTab={handleNavigate}>
          {renderAdminView()}
        </AdminLayout>
      );
    }

    // Student Views
    switch (currentPage) {
      case 'login':
        return <Login onNavigate={handleNavigate} />;
      case 'verify-email':
        return <EmailVerification onNavigate={handleNavigate} email={pageParams.email} matric={pageParams.matric} />;
      case 'forgot-password':
        return <ForgotPassword onNavigate={handleNavigate} />;
      case 'vote':
        if (!currentUser) return <Login onNavigate={handleNavigate} />;
        return <VotingPage onNavigate={handleNavigate} />;
      case 'vote-review':
        if (!currentUser) return <Login onNavigate={handleNavigate} />;
        return <VoteReview onNavigate={handleNavigate} />;
      case 'vote-success':
        return <VoteSuccess onNavigate={handleNavigate} />;
      case 'welcome':
      default:
        if (!currentUser) return <Login onNavigate={handleNavigate} />;
        return <Welcome onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar onNavigate={handleNavigate} currentPage={currentPage} />
      <div className="flex-grow-1 d-flex flex-column">
        {renderCurrentView()}
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <VotingProvider>
        <AppContent />
      </VotingProvider>
    </AuthProvider>
  );
}
