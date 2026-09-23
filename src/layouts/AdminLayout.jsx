import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users2,
  GraduationCap,
  BarChart3,
  ScrollText,
  AlertOctagon,
  LogOut,
  ShieldCheck,
  KeyRound
} from 'lucide-react';

export function AdminLayout({ currentTab, onSelectTab, children }) {
  const { adminProfile, logout } = useAuth();

  const navItems = [
    { id: 'admin-dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'admin-elections', label: 'Elections', icon: Calendar },
    { id: 'admin-positions', label: 'Positions', icon: Layers },
    { id: 'admin-candidates', label: 'Candidates', icon: Users2 },
    { id: 'admin-students', label: 'Students / Voters', icon: GraduationCap },
    { id: 'admin-results', label: 'Results & Tally', icon: BarChart3 },
    { id: 'admin-audit-logs', label: 'Audit Trail', icon: ScrollText },
    { id: 'admin-settings', label: 'Admin Settings', icon: KeyRound },
    { id: 'admin-danger-zone', label: 'Danger Zone', icon: AlertOctagon, danger: true }
  ];

  return (
    <div className="container-fluid flex-grow-1 p-0">
      <div className="row g-0">
        {/* Admin Sidebar */}
        <aside className="col-12 col-md-3 col-xl-2 admin-sidebar p-3 d-flex flex-column">
          <div className="d-flex align-items-center gap-2 mb-4 px-2 pt-2">
            <div className="rounded-circle p-1 d-flex align-items-center justify-content-center shadow-sm border" style={{ width: '38px', height: '38px' }}>
              <img src="/nacos-logo.png" alt="NACOS Logo" className="img-fluid rounded-circle" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <span className="fw-bold text-dark d-block" style={{ fontSize: '0.92rem' }}>
                ADMIN CONSOLE
              </span>
              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                {adminProfile?.role || 'Super Admin'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="nav flex-column gap-1 flex-grow-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav_${item.id}`}
                  className={`admin-nav-item border-0 w-100 text-start ${isActive ? 'active' : ''} ${item.danger ? 'text-danger' : ''}`}
                  onClick={() => onSelectTab(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-3 border-top mt-auto">
            <button
              onClick={logout}
              className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 rounded-3"
            >
              <LogOut size={16} />
              <span>Log Out Admin</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="col-12 col-md-9 col-xl-10 p-3 p-md-4 bg-light">
          {children}
        </main>
      </div>
    </div>
  );
}
