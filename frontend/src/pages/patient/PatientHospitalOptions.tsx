import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Ambulance, Building2, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck, MapPin } from 'lucide-react'

import { api } from '../../services/api.js'
import { useLocalState } from '../../hooks/useLocalState.js'
import { subscribeToTable } from '../../services/realtime.js'

const STATUS_BADGE = {
  PENDING: { label: 'Awaiting Response', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  ACCEPTED: { label: 'ACCEPTED & READY', bg: '#ecfdf5', color: '#059669', border: '#6ee7b7' },
  DECLINED: { label: 'Capacity Full / Declined', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  WITHDRAWN: { label: 'Withdrawn', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
  EXPIRED: { label: 'Timeout', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
}

export default function PatientHospitalOptions() {
  const [searchParams] = useSearchParams()
  const [localRequestId] = useLocalState('demo.requestId', null)
  const requestId = searchParams.get('request_id') || localRequestId

  const [requestData, setRequestData] = useState(null)
  const [realtimeStatus, setRealtimeStatus] = useState('UNCONFIGURED')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState(null)
  const navigate = useNavigate()

  async function refresh() {
    if (!requestId) return
    try {
      const data = await api.getPatientRequest(requestId)
      setRequestData(data)
      if (data.status === 'MATCHED') {
        navigate('/patient/journey')
      }
    } catch (err) {
      setError('Could not load request status')
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 3000)
    const unsubscribe = subscribeToTable({
      table: 'patient_request_responses',
      filter: `request_id=eq.${requestId}`,
      onChange: refresh,
      onStatusChange: setRealtimeStatus,
    })
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Direct hospital selection - no transport modal per requirements
  async function handleSelectHospital(hospitalId) {
    setSelectedHospitalId(hospitalId)
    setError(null)
    setBusy(true)
    try {
      const res = await api.selectHospital(requestId, hospitalId)
      const targetJourneyId = res?.journey_id || requestData?.journey_id
      if (targetJourneyId) {
        localStorage.setItem('demo.journeyId', JSON.stringify(targetJourneyId))
      }
      await refresh()
      // Navigates directly to journey tracking & handoff with explicit journey_id
      if (targetJourneyId) {
        navigate(`/patient/journey?journey_id=${targetJourneyId}`)
      } else {
        navigate('/patient/journey')
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Selection failed. The hospital slot may have expired.')
    } finally {
      setBusy(false)
    }
  }

  if (!requestId) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>No active request found</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>Please submit your symptoms first to search for matching hospitals.</p>
        <button
          onClick={() => navigate('/patient/assessment')}
          style={{
            background: '#4f46e5',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Enter Symptoms
        </button>
      </div>
    )
  }

  if (!requestData) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Connecting to hospital response network…</div>
      </div>
    )
  }

  const responses = requestData.responses || []
  // Sort so ACCEPTED hospitals appear first, then PENDING, then DECLINED
  const sortedResponses = [...responses].sort((a, b) => {
    const order = { ACCEPTED: 0, PENDING: 1, DECLINED: 2, WITHDRAWN: 3, EXPIRED: 4 }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
  })

  const acceptedCount = responses.filter((r) => r.status === 'ACCEPTED').length

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
      {/* Top Header with 108 Emergency Dispatch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            HOSPITAL BROADCAST &amp; SELECTION
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
            Matching Hospitals ({responses.length} Contacted)
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Requests broadcast to 10 top-matched facilities. Select an accepting hospital to automatically transmit your intake profile.
          </div>
        </div>

        {/* 108 Emergency Dispatch button on top right */}
        <Link
          to="/patient/emergency-status"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '12px',
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

      {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Broadcast Status Banner */}
      <div
        style={{
          background: acceptedCount > 0 ? '#ecfdf5' : '#f0f9ff',
          border: `1.5px solid ${acceptedCount > 0 ? '#a7f3d0' : '#bae6fd'}`,
          borderRadius: '14px',
          padding: '18px 24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: acceptedCount > 0 ? '#d1fae5' : '#e0f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: acceptedCount > 0 ? '#059669' : '#0284c7',
            }}
          >
            {acceptedCount > 0 ? <CheckCircle2 size={24} /> : <Clock size={24} />}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: acceptedCount > 0 ? '#065f46' : '#075985' }}>
              {acceptedCount > 0
                ? `${acceptedCount} Hospital${acceptedCount > 1 ? 's have' : ' has'} ACCEPTED your emergency intake`
                : 'Awaiting Hospital Responses (Polling Live Network…)'}
            </div>
            <div style={{ fontSize: '12px', color: acceptedCount > 0 ? '#047857' : '#0369a1' }}>
              {acceptedCount > 0
                ? 'Review the accepting hospitals below and choose your preferred destination. Your medical dossier will be linked immediately.'
                : 'Candidate emergency centers are currently reviewing your symptoms, triage score, and bed capacity.'}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Request ID</div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
            {requestId.slice(0, 13)}…
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sortedResponses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            No hospitals were within range for this request. Please call 108 immediately.
          </div>
        )}

        {sortedResponses.map((r, index) => {
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.PENDING
          const isAccepted = r.status === 'ACCEPTED'
          const isSelected = requestData.selected_hospital_id_optional === r.hospital_id

          return (
            <div
              key={r.id}
              style={{
                background: isAccepted ? '#ffffff' : '#f8fafc',
                border: isAccepted ? '2px solid #10b981' : '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '20px 24px',
                boxShadow: isAccepted ? '0 4px 16px rgba(16, 185, 129, 0.12)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: isAccepted ? '#ecfdf5' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isAccepted ? '#059669' : '#64748b',
                  }}
                >
                  <Building2 size={24} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {r.hospital_name}
                    </h3>
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '13px', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="#6366f1" />
                      {r.travel_seconds_optional != null
                        ? `~${Math.round(r.travel_seconds_optional / 60)} mins travel ETA`
                        : 'ETA calculating…'}
                    </span>
                    <span>·</span>
                    <span>Rank #{index + 1} Candidate</span>
                    {isAccepted && (
                      <>
                        <span>·</span>
                        <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <ShieldCheck size={14} /> Capacity &amp; Specialist Confirmed
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isAccepted && !isSelected && (
                  <button
                    disabled={busy}
                    onClick={() => handleSelectHospital(r.hospital_id)}
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      color: 'white',
                      padding: '12px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    }}
                  >
                    <span>Choose This Hospital</span>
                    <ArrowRight size={16} />
                  </button>
                )}

                {isSelected && (
                  <div
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Selected — Directing to Handoff</span>
                  </div>
                )}

                {r.status === 'PENDING' && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Reviewing request…
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
