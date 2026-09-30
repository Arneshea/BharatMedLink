import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  Clock,
  Phone,
  Send,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Radio,
  Car
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HospitalMatching() {
  const { referralId } = useParams<{ referralId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [sentRequests, setSentRequests] = useState<Record<string, string>>({})
  const [referral, setReferral] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])

  useEffect(() => {
    if (referralId && referralId !== 'matching-demo') {
      loadReferral()
    } else {
      api.listHospitals().then((hosps) => setCandidates(hosps)).catch(console.error)
    }
  }, [referralId])

  const loadReferral = async () => {
    try {
      const data = await api.getReferral(referralId!)
      setReferral(data)
      const reqMap: Record<string, string> = {}
      if (data.responses) {
        data.responses.forEach((resp: any) => {
          reqMap[resp.hospital_id] = resp.status
        })
      }
      setSentRequests(reqMap)

      if (data.evaluations && data.evaluations.length > 0) {
        setCandidates(data.evaluations)
      } else {
        const hosps = await api.listHospitals()
        const filtered = hosps.filter((h: any) => h.id !== data.referring_hospital_id)
        setCandidates(filtered)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSendRequest = async (hospitalId: string) => {
    setSentRequests((prev) => ({ ...prev, [hospitalId]: 'PENDING' }))
    if (referralId && referralId !== 'matching-demo') {
      try {
        await api.sendReferralRequest(referralId, hospitalId)
        loadReferral()
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleInitiateTransfer = async (hospitalId?: string) => {
    const targetHospId = hospitalId || referral?.responses?.find((r: any) => r.status === 'ACCEPTED')?.hospital_id
    if (referralId && referralId !== 'matching-demo' && targetHospId) {
      try {
        await api.acceptReferral(referralId, targetHospId)
        navigate(`/referral/${referralId}/handoff`)
      } catch (e) {
        console.error(e)
        navigate(`/referral/${referralId}/handoff`)
      }
    } else {
      navigate(referralId ? `/referral/${referralId}/handoff` : '/referral/handoff-demo')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc', paddingBottom: '100px' }}>
      {/* Top Bar matching Image 3 */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Hospital Matching &amp; Request Center
          </h1>
          <span
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            LIVE SEARCH
          </span>
        </div>

        <span
          style={{
            background: '#ecfdf5',
            color: '#047857',
            border: '1px solid #a7f3d0',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ● {candidates.length} Candidate Facilities
        </span>
      </header>

      <main className="bml-page-content">
        <div className="bml-two-col-layout">
          {/* Left Column: Top Matching Hospitals */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                Top Matching Hospitals
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Based on specialty ({referral?.emergency_category || 'Cardiac'}), ICU availability, and travel time.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {candidates.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                  No candidate hospitals found in range.
                </div>
              ) : (
                candidates.map((h, idx) => {
                  const hospId = h.id || h.candidate_hospital_id
                  const hospName = h.name || h.hospital_name
                  const isVerified = h.is_verified || h.trust_status === 'VERIFIED'
                  const reqStatus = sentRequests[hospId]
                  const isPending = reqStatus === 'PENDING'
                  const isAccepted = reqStatus === 'ACCEPTED'
                  const availableBeds = h.bed_capacity_total != null ? Math.max(0, h.bed_capacity_total - (h.bed_capacity_occupied || 0)) : null

                  return (
                    <div
                      key={hospId || idx}
                      style={{
                        background: '#ffffff',
                        border: idx === 0 ? '2px solid #6366f1' : '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '22px',
                        boxShadow: idx === 0 ? '0 4px 16px rgba(99, 102, 241, 0.08)' : '0 2px 8px rgba(15, 23, 42, 0.03)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '14px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: idx === 0 ? '#4f46e5' : '#64748b',
                            }}
                          >
                            <Building2 size={24} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                              {hospName}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#64748b' }}>
                              <span>📍 {h.address || 'Network Hospital'}</span>
                              <span>•</span>
                              <span style={{ fontWeight: 700, color: '#4f46e5' }}>
                                🚗 {h.eta_minutes ? `${h.eta_minutes} mins travel` : '~15 mins travel'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {idx === 0 && (
                            <span
                              style={{
                                background: '#4f46e5',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                letterSpacing: '0.04em',
                              }}
                            >
                              RECOMMENDED
                            </span>
                          )}
                          <span
                            style={{
                              color: isVerified ? '#059669' : '#d97706',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            {isVerified ? '✓ REGISTERED' : '⚠ UNREGISTERED'}
                          </span>
                        </div>
                      </div>

                      {/* Stat Boxes */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Specialty
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            {referral?.emergency_category || 'Cardiac Hub'}
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Available Beds
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: availableBeds != null ? '#059669' : '#64748b', marginTop: '2px' }}>
                            {availableBeds != null ? `${availableBeds} Available` : 'NA'}
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Cath Lab
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            Standby
                          </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Specialist
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                            On-Call
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleSendRequest(hospId)}
                          disabled={Boolean(reqStatus)}
                          className={idx === 0 ? "btn-primary-purple" : "btn-secondary"}
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            background: isAccepted ? '#10b981' : isPending ? '#e2e8f0' : undefined,
                            color: isAccepted ? '#ffffff' : isPending ? '#64748b' : undefined,
                            cursor: reqStatus ? 'default' : 'pointer'
                          }}
                        >
                          <Send size={15} />
                          <span>
                            {isAccepted
                              ? 'REQUEST ACCEPTED'
                              : isPending
                              ? 'REQUEST DISPATCHED'
                              : 'SEND REFERRAL REQUEST'}
                          </span>
                        </button>
                        {h.phone && (
                          <a
                            href={`tel:${h.phone}`}
                            className="btn-secondary"
                            style={{ padding: '0 14px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
                          >
                            <Phone size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Sent Requests (Tracking live responses) */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                Sent Requests
              </h2>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Tracking live responses for {referral?.patient_name || 'Emergency Patient'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(!referral?.responses || referral.responses.length === 0) ? (
                <div style={{ padding: '32px 18px', textAlign: 'center', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <Clock size={28} color="#94a3b8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                    No Requests Dispatched
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Select an eligible hospital from the left and click "SEND REFERRAL REQUEST" to dispatch for triage.
                  </div>
                </div>
              ) : (
                referral.responses.map((resp: any) => {
                  const isAccepted = resp.status === 'ACCEPTED'
                  const isDeclined = resp.status === 'DECLINED'
                  return (
                    <div
                      key={resp.id || resp.hospital_id}
                      style={{
                        background: '#ffffff',
                        border: isAccepted ? '1.5px solid #a7f3d0' : isDeclined ? '1px solid #fecaca' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '18px',
                        boxShadow: isAccepted ? '0 2px 10px rgba(16, 185, 129, 0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: resp.response_reason ? '10px' : '0' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                          {resp.hospital_name || 'Partner Facility'}
                        </h3>
                        <span
                          className={isAccepted ? 'pill-accepted' : isDeclined ? 'pill-rejected' : ''}
                          style={!isAccepted && !isDeclined ? { fontSize: '11px', fontWeight: 700, color: '#94a3b8' } : undefined}
                        >
                          {isAccepted ? 'ACCEPTED' : isDeclined ? 'DECLINED' : 'AWAITING RESPONSE'}
                        </span>
                      </div>

                      {resp.response_reason && (
                        <div
                          style={{
                            background: isAccepted ? '#f0fdf4' : '#fef2f2',
                            border: isAccepted ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '12px',
                            color: isAccepted ? '#15803d' : '#dc2626',
                            marginBottom: isAccepted ? '14px' : '0',
                            fontStyle: isAccepted ? 'italic' : 'normal',
                          }}
                        >
                          "{resp.response_reason}"
                        </div>
                      )}

                      {isAccepted && (
                        <button
                          onClick={() => handleInitiateTransfer(resp.hospital_id)}
                          style={{
                            width: '100%',
                            height: '42px',
                            borderRadius: '10px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <span>INITIATE TRANSFER</span>
                          <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Sticky Patient Vitals Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '72px',
          right: 0,
          height: '76px',
          background: '#0b1120',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 36px',
          color: 'white',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            {referral?.patient_name ? referral.patient_name[0] : 'PT'}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{referral?.patient_name || 'Emergency Patient'}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {referral?.age ? `${referral.age}${referral.sex ? ' · ' + referral.sex : ''} — ` : ''}{referral?.emergency_category || 'Emergency'} Referral
            </div>
          </div>
        </div>

        {/* Live Vitals Pills */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>HR</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f87171' }}>
              {referral?.patient_vitals?.hr || 108}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>BP</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fbbf24' }}>
              {referral?.patient_vitals?.bp || '120/80'}
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '6px 14px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>SPO2</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#60a5fa' }}>
              {referral?.patient_vitals?.spo2 ? `${referral.patient_vitals.spo2}%` : '96%'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
