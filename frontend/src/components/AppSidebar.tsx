import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  GitBranch,
  Building2,
  ShieldCheck,
  Bell,
  LogOut,
  User,
  HeartPulse,
  Ambulance,
  PlusCircle,
  Clock,
  Layers,
  Stethoscope,
  RotateCcw,
  LayoutDashboard
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const AppSidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const isActive = (path: string) => {
    if (path === '/hospital' && (location.pathname === '/' || location.pathname === '/hospital')) return true
    return location.pathname.startsWith(path) && path !== '/'
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = user?.role || 'HOSPITAL_STAFF'

  return (
    <aside className="bml-sidebar" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        {/* Logo */}
        <Link
          to={role === 'PATIENT' ? '/patient' : role === 'NETWORK_ADMIN' ? '/admin' : '/hospital'}
          className="bml-sidebar-logo"
          title="BharatMedLink Home"
        >
          <HeartPulse size={24} />
        </Link>

        {/* Role-Specific Navigation Items */}
        <nav className="bml-nav-items">
          {/* ================= PATIENT TABS: 5-STEP EMERGENCY WORKFLOW ================= */}
          {role === 'PATIENT' && (
            <>
              <Link
                to="/patient"
                className={`bml-nav-btn ${location.pathname === '/patient' ? 'active' : ''}`}
                title="Patient Dashboard & Profile"
              >
                <LayoutDashboard size={20} />
              </Link>

              <Link
                to="/patient/assessment"
                className={`bml-nav-btn ${location.pathname === '/patient/assessment' ? 'active' : ''}`}
                title="Enter Symptoms & AI Triage"
              >
                <Stethoscope size={20} />
              </Link>

              <Link
                to="/patient/options"
                className={`bml-nav-btn ${location.pathname === '/patient/options' ? 'active' : ''}`}
                title="Matching Hospitals & Acceptance"
              >
                <Layers size={20} />
              </Link>

              <Link
                to="/patient/journey"
                className={`bml-nav-btn ${location.pathname === '/patient/journey' ? 'active' : ''}`}
                title="Transport & Live Tracking"
              >
                <GitBranch size={20} />
              </Link>

              <Link
                to="/patient/referral"
                className={`bml-nav-btn ${location.pathname === '/patient/referral' ? 'active' : ''}`}
                title="Find Higher-tier Hospital"
              >
                <RotateCcw size={20} />
              </Link>

              <Link
                to="/patient/emergency-status"
                className={`bml-nav-btn ${location.pathname.startsWith('/patient/emergency') ? 'active' : ''}`}
                title="108 Emergency Dispatch"
              >
                <Ambulance size={20} />
              </Link>
            </>

          )}

          {/* ================= DOCTOR / HOSPITAL STAFF TABS ONLY ================= */}
          {role === 'HOSPITAL_STAFF' && (
            <>
              <Link
                to="/hospital"
                className={`bml-nav-btn ${isActive('/hospital') && !location.pathname.includes('/referral') ? 'active' : ''}`}
                title="Emergency Operations Board"
              >
                <Activity size={20} />
              </Link>

              <Link
                to="/referral/new"
                className={`bml-nav-btn ${location.pathname.startsWith('/referral') ? 'active' : ''}`}
                title="Initiate Emergency Referral"
              >
                <PlusCircle size={20} />
              </Link>
            </>
          )}

          {/* ================= NETWORK ADMIN TABS ONLY ================= */}
          {role === 'NETWORK_ADMIN' && (
            <>
              <Link
                to="/admin"
                className={`bml-nav-btn ${location.pathname === '/admin' ? 'active' : ''}`}
                title="Network Operations & Verification Queue"
              >
                <Building2 size={20} />
              </Link>

              <Link
                to="/admin/events"
                className={`bml-nav-btn ${location.pathname === '/admin/events' ? 'active' : ''}`}
                title="System Audit Events & Compliance"
              >
                <ShieldCheck size={20} />
              </Link>
            </>
          )}

          {/* Common Modern Notifications Tab */}
          <Link
            to="/notifications"
            className={`bml-nav-btn ${location.pathname === '/notifications' ? 'active' : ''}`}
            title="Notifications & Alerts"
            style={{ position: 'relative' }}
          >
            <Bell size={20} />
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid #0f172a',
              }}
            />
          </Link>
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="bml-sidebar-footer">
        {user && (
          <div
            className="bml-avatar-btn"
            title={`${user.display_name} (${user.role.replace('_', ' ')})`}
            style={{ cursor: 'default' }}
          >
            {getInitials(user.display_name)}
          </div>
        )}

        <button
          className="bml-nav-btn"
          title="Log Out"
          onClick={handleLogout}
          style={{ color: '#ef4444' }}
        >
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  )
}
