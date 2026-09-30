import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Ambulance,
  Bed,
  Clock,
  Check,
  X,
  Search,
  Download,
  ShieldCheck,
  Activity,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function NetworkOverview() {
  const { user } = useAuth()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [pendingQueue, setPendingQueue] = useState<any[]>([])
  const [systemEvents, setSystemEvents] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const hospList = await api.listHospitals()
      setHospitals(hospList)
      const pending = hospList
        .filter((h: any) => !h.is_verified || h.verification_status === 'PENDING')
        .map((h: any) => ({
          id: h.id,
          name: h.name,
          details: `${h.city_region || h.address || 'Regional Facility'} · ${h.type || 'Hospital'}`,
          license: h.license_number || `REG-${h.id.slice(0, 8).toUpperCase()}`,
        }))
      setPendingQueue(pending)

      try {
        const events = await api.getAuditEvents()
        if (events && events.length > 0) {
          setSystemEvents(
            events.map((e: any) => ({
              timestamp: e.created_at ? e.created_at.replace('T', ' ').slice(0, 19) : '',
              event: e.action ? e.action.replace(/_/g, ' ') : 'System Action',
              source: e.actor_role || 'System',
              action: `${e.entity_type || 'Event'} #${(e.entity_id || '').slice(0, 8)}`,
              status: e.action?.includes('REJECT') ? 'ALERT' : e.action?.includes('VERIF') ? 'SUCCESS' : 'INFO',
            }))
          )
        } else {
          setSystemEvents([])
        }
      } catch (err) {
        console.error(err)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleVerify = async (id: string, name: string) => {
    setPendingQueue((prev) => prev.filter((item) => item.id !== id))
    setSystemEvents((prev) => [
      {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        event: 'Hospital Verified',
        source: name,
        action: 'License Approved & Activated',
        status: 'SUCCESS',
      },
      ...prev,
    ])
    try {
      await api.verifyHospital(id, 'VERIFIED')
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async (id: string, name: string) => {
    setPendingQueue((prev) => prev.filter((item) => item.id !== id))
    setSystemEvents((prev) => [
      {
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        event: 'Verification Rejected',
        source: name,
        action: 'Deficient documentation returned',
        status: 'INFO',
      },
      ...prev,
    ])
    try {
      await api.verifyHospital(id, 'REJECTED')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header matching Image 5 */}
      <header
        style={{
          height: '64px',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Network Infrastructure Overview
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span
            style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ● Network Healthy
          </span>

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <Search size={16} />
          </div>
        </div>
      </header>

      <main className="bml-page-content">
        {/* 4 Metric Cards (Image 5) */}
        <div className="bml-metrics-grid">
          {/* Card 1: TOTAL HOSPITALS */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL HOSPITALS</span>
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>+12% vs LY</span>
            </div>
            <div className="bml-metric-value">142</div>
            <div className="bml-metric-caption" style={{ color: '#4f46e5', fontWeight: 700 }}>
              98 Verified · 4 Pending
            </div>
          </div>

          {/* Card 2: ACTIVE REFERRALS */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ACTIVE REFERRALS</span>
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>High Volume</span>
            </div>
            <div className="bml-metric-value">48</div>
            <div className="bml-metric-caption">Inter-facility transfers live</div>
          </div>

          {/* Card 3: ICU OCCUPANCY */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ICU OCCUPANCY</span>
              <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '12px' }}>Critical</span>
            </div>
            <div className="bml-metric-value">88.4%</div>
            <div className="bml-metric-caption">Regional threshold exceeded</div>
          </div>

          {/* Card 4: AVG. MATCH TIME */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AVG. MATCH TIME</span>
              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>-2m Target</span>
            </div>
            <div className="bml-metric-value">4m 12s</div>
            <div className="bml-metric-caption">Automated requirement routing</div>
          </div>
        </div>

        {/* 2 Columns: Pending Verifications & Regional Capacity */}
        <div className="bml-two-col-layout" style={{ marginBottom: '28px' }}>
          {/* Left: Pending Hospital Verifications */}
          <div className="bml-card-panel">
            <div className="bml-panel-title-row">
              <h2 className="bml-panel-title" style={{ fontSize: '16px' }}>
                Pending Hospital Verifications
              </h2>
              <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>
                View All Queue ({pendingQueue.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingQueue.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{item.details}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleVerify(item.id, item.name)}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      VERIFY
                    </button>
                    <button
                      onClick={() => handleReject(item.id, item.name)}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))}

              {pendingQueue.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#10b981', fontWeight: 700 }}>
                  ✓ All verification requests have been processed!
                </div>
              )}
            </div>
          </div>

          {/* Right: Regional Capacity Status */}
          <div className="bml-card-panel">
            <h2 className="bml-panel-title" style={{ fontSize: '16px', marginBottom: '18px' }}>
              Regional Capacity Status
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Delhi NCR</span>
                  <span style={{ color: '#ef4444' }}>94% Capacity</span>
                </div>
                <div className="bml-metric-progress-track">
                  <div className="bml-metric-progress-fill" style={{ width: '94%', background: '#ef4444' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Mumbai</span>
                  <span style={{ color: '#f59e0b' }}>82% Capacity</span>
                </div>
                <div className="bml-metric-progress-track">
                  <div className="bml-metric-progress-fill" style={{ width: '82%', background: '#f59e0b' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Bangalore</span>
                  <span style={{ color: '#10b981' }}>65% Capacity</span>
                </div>
                <div className="bml-metric-progress-track">
                  <div className="bml-metric-progress-fill" style={{ width: '65%', background: '#10b981' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Hyderabad</span>
                  <span style={{ color: '#0d9488' }}>58% Capacity</span>
                </div>
                <div className="bml-metric-progress-track">
                  <div className="bml-metric-progress-fill" style={{ width: '58%', background: '#0d9488' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table: Recent System Events (Image 5) */}
        <div className="bml-card-panel">
          <div className="bml-panel-title-row">
            <h2 className="bml-panel-title" style={{ fontSize: '16px' }}>
              Recent System Events
            </h2>
            <button className="btn-secondary" style={{ fontSize: '12px' }}>
              <Download size={14} />
              <span>Export Logs</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>TIMESTAMP</th>
                  <th style={{ padding: '12px 16px' }}>EVENT</th>
                  <th style={{ padding: '12px 16px' }}>SOURCE</th>
                  <th style={{ padding: '12px 16px' }}>ACTION</th>
                  <th style={{ padding: '12px 16px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {systemEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
                      No audit events recorded yet. System activity will appear here in real time.
                    </td>
                  </tr>
                ) : (
                  systemEvents.map((evt, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b' }}>
                      {evt.timestamp}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                      {evt.event}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {evt.source}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#0f172a' }}>
                      {evt.action}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: 800,
                          background:
                            evt.status === 'SUCCESS'
                              ? '#ecfdf5'
                              : evt.status === 'INFO'
                              ? '#eff6ff'
                              : '#fef3c7',
                          color:
                            evt.status === 'SUCCESS'
                              ? '#047857'
                              : evt.status === 'INFO'
                              ? '#1d4ed8'
                              : '#b45309',
                        }}
                      >
                        {evt.status}
                      </span>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
