import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  AlertTriangle,
  Ambulance,
  Heart,
  FileText,
  Phone,
  Shield,
  Activity,
  CheckCircle2,
  Calendar,
  Clock,
  Stethoscope,
  Layers,
  GitBranch,
  RotateCcw,
  ArrowRight,
  ChevronRight,
  Building2,
  MapPin
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import EmergencyButton from '../../components/EmergencyButton'
import { api } from '../../services/api'

export default function PatientDashboard() {
  const { user } = useAuth()
  const p = user.details || {}

  const [consent, setConsent] = useState(true)
  const [activeJourney, setActiveJourney] = useState<any>(null)

  React.useEffect(() => {
    if (user?.id) {
      api.getPatientActiveJourney(user.id).then((j) => {
        if (j && !j.error) setActiveJourney(j)
      }).catch(console.error)
    }
  }, [user?.id])

  const steps = [
    {
      num: 1,
      name: 'Self-Triage',
      desc: 'AI preliminary symptom & severity assessment',
      link: '/patient/assessment',
      icon: Stethoscope,
      color: '#4f46e5',
      bg: '#eef2ff',
    },
    {
      num: 2,
      name: 'Priority Matching',
      desc: 'Matches hospitals with capacity, specialty & equipment',
      link: '/patient/options',
      icon: Layers,
      color: '#0284c7',
      bg: '#f0f9ff',
    },
    {
      num: 3,
      name: 'Broadcast & Accept',
      desc: 'Hospital actively accepts before patient leaves home',
      link: '/patient/options',
      icon: Building2,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      num: 4,
      name: 'Transport & Handoff',
      desc: 'Live ambulance tracking & pre-arrival clinical handoff',
      link: '/patient/journey',
      icon: Ambulance,
      color: '#d97706',
      bg: '#fffbeb',
    },
    {
      num: 5,
      name: 'Referral Loop',
      desc: 'Patient receives doctor notes & finds higher-tier tertiary care',
      link: '/patient/referral',
      icon: RotateCcw,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
  ]

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            BHARATMEDLINK · PATIENT PORTAL
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
            Welcome, {user.display_name}
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            UHID: {p.uhid || 'NA'} · Age: {p.age ? `${p.age} Yrs` : 'NA'} · Sex: {p.gender || p.sex || 'NA'} · Blood Group: <strong style={{ color: p.blood_group ? '#dc2626' : '#64748b' }}>{p.blood_group || 'NA'}</strong>
          </div>
        </div>

        {/* 108 Emergency Dispatch Callout - Always accessible on top right */}
        <Link
          to="/patient/emergency-status"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
          }}
        >
          <Ambulance size={18} />
          <span>108 EMERGENCY DISPATCH</span>
        </Link>
      </div>


      {/* Main Two-Column Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Action Hub & Active Request Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Action Hub: 2 Core Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Card 1: Enter Symptoms */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1.5px solid #e0e7ff',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <Stethoscope size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Enter Symptoms</h3>
                    <div style={{ fontSize: '11px', color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Emergency Routing</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Enter your symptoms for AI-assisted clinical triage and immediate matching with top-ranked emergency hospitals.
                </p>
              </div>

              <Link
                to="/patient/assessment"
                style={{
                  background: '#4f46e5',
                  color: 'white',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                }}
              >
                <span>Enter Symptoms</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Card 2: Find Higher-tier Hospital */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '24px',
                border: '1.5px solid #fae8ff',
                boxShadow: '0 4px 14px rgba(168, 85, 247, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                    <RotateCcw size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Find Higher-tier Hospital</h3>
                    <div style={{ fontSize: '11px', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Referral Loop</div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 18px' }}>
                  Received doctor's treatment notes or transfer advice from your hospital? Search and route to advanced tertiary care centers.
                </p>
              </div>

              <Link
                to="/patient/referral"
                style={{
                  background: '#9333ea',
                  color: 'white',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(147, 51, 234, 0.25)',
                }}
              >
                <span>Find Higher-tier Hospital</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>


          {/* Active Coordination Status Panel */}
          <div className="bml-card-panel">
            <div className="bml-panel-title-row">
              <h2 className="bml-panel-title">Active Emergency Status &amp; Tracking</h2>
              <Link to="/patient/journey" style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
                Open Live Map →
              </Link>
            </div>

            {activeJourney || p.active_transfer ? (
              <div
                style={{
                  border: '1.5px solid #a7f3d0',
                  background: '#f0fdf4',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#065f46' }}>
                      {activeJourney?.stage2_hospital?.name || activeJourney?.stage1_hospital?.name || p.active_transfer?.hospital || 'Assigned Hospital'}
                    </span>
                    <span className="pill-accepted">
                      {(activeJourney?.current_status || 'ACCEPTED').replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                    Emergency coordination active · Live navigation and route tracking ready
                  </div>
                </div>
                <Link
                  to={activeJourney ? `/patient/journey?journey_id=${activeJourney.journey_id}` : '/patient/journey'}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 16px', background: '#059669', color: 'white', border: 'none', textDecoration: 'none' }}
                >
                  Live GPS Track
                </Link>
              </div>
            ) : (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  No Active Emergency Request Underway
                </div>
                <div style={{ fontSize: '12px', maxWidth: '420px', margin: '0 auto' }}>
                  When you start Self-Triage, your priority matching, hospital broadcast acceptance, and live transport tracking will stream here in real time.
                </div>
                <Link
                  to="/patient/assessment"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4f46e5',
                    textDecoration: 'none',
                  }}
                >
                  <span>Start a preliminary symptom assessment</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {/* Clinical Profile Card */}
          <div className="bml-card-panel">
            <h2 className="bml-panel-title" style={{ marginBottom: '18px' }}>
              Patient Clinical History &amp; Vitals Baseline
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Known Allergies
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: p.allergies ? '#dc2626' : '#64748b', marginTop: '4px' }}>
                  {p.allergies || 'NA'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Existing Conditions
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  {p.medical_history || 'NA'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Current Medications
              </div>
              <div style={{ fontSize: '13px', color: '#334155', fontWeight: 600, background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                {p.current_medications || 'NA'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Emergency Contact
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                <Phone size={15} color="#4f46e5" />
                <span>
                  {p.emergency_contact_name
                    ? `${p.emergency_contact_name} (${p.emergency_contact_phone || 'No phone'})`
                    : 'No emergency contact on file'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Privacy, Quick Navigation & Help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Medical Data Consent & Privacy (Requirement 7) */}
          <div className="bml-card-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Shield size={18} color="#4f46e5" />
              <h2 className="bml-panel-title" style={{ fontSize: '15px' }}>
                Data Sharing &amp; Consent
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 14px' }}>
              Your clinical history is shared with candidate receiving hospitals strictly on a <strong>need-to-know basis</strong> only when an emergency intake or transfer is requested.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="patientConsent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="patientConsent" style={{ fontSize: '12px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                Authorized for Emergency Referral Routing
              </label>
            </div>
          </div>

          {/* Quick Step Navigation */}
          <div className="bml-card-panel">
            <h2 className="bml-panel-title" style={{ fontSize: '15px', marginBottom: '14px' }}>
              5-Step Quick Jump
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                to="/patient/assessment"
                style={{
                  padding: '9px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#4f46e5',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Step 1: AI Self-Triage</span>
                <ChevronRight size={14} />
              </Link>

              <Link
                to="/patient/options"
                style={{
                  padding: '9px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#0284c7',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Steps 2 &amp; 3: Matching &amp; Broadcast</span>
                <ChevronRight size={14} />
              </Link>

              <Link
                to="/patient/journey"
                style={{
                  padding: '9px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#d97706',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Step 4: Live Transport Tracking</span>
                <ChevronRight size={14} />
              </Link>

              <Link
                to="/patient/referral"
                style={{
                  padding: '9px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#7c3aed',
                  textDecoration: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Step 5: Referral Loop (Tertiary)</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
