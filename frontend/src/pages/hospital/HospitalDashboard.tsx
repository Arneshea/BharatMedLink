import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bed,
  Heart,
  Users,
  Inbox,
  Check,
  X,
  Eye,
  Activity,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  Building
} from 'lucide-react'
import { AppTopHeader } from '../../components/AppTopHeader'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function HospitalDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [boardData, setBoardData] = useState<any>(null)
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Matching'>('All')
  const [loading, setLoading] = useState(true)
  const [streamList, setStreamList] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])

  useEffect(() => {
    loadBoard()
  }, [user?.hospital_id])

  const loadBoard = async () => {
    try {
      setLoading(true)
      if (user?.hospital_id) {
        const data = await api.getOperationsBoard(user.hospital_id)
        setBoardData(data)
        setStreamList(data.active_stream || [])
        setIncomingRequests(data.incoming_requests || [])
      } else {
        const hospitals = await api.listHospitals()
        const firstId = hospitals?.[0]?.id
        if (firstId) {
          const data = await api.getOperationsBoard(firstId)
          setBoardData(data)
          setStreamList(data.active_stream || [])
          setIncomingRequests(data.incoming_requests || [])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptRequest = async (id: string, origin: string, isPatientRequest?: boolean, referralId?: string) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id))
    try {
      if (isPatientRequest) {
        await api.acceptResponse(id)
      } else if (referralId && user?.hospital_id) {
        await api.acceptReferral(referralId, user.hospital_id)
      }
    } catch (e) {
      console.error(e)
    }
    setStreamList((prev) => [
      {
        id: `stream-${Date.now()}`,
        patient_name: `Patient intake accepted`,
        urgency: 'Critical',
        specialty: 'Emergency Intake',
        origin: origin,
        status: `Accepted · ${user?.display_name || 'Dr. on call'}`,
      },
      ...prev,
    ])
  }

  const handleDeclineRequest = async (id: string, isPatientRequest?: boolean, referralId?: string) => {
    setIncomingRequests((prev) => prev.filter((r) => r.id !== id))
    try {
      if (isPatientRequest) {
        await api.declineResponse(id, 'CAPACITY_UNAVAILABLE')
      } else if (referralId && user?.hospital_id) {
        await api.declineReferral(referralId, user.hospital_id, 'CAPACITY_UNAVAILABLE')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredStream = streamList.filter((item) => {
    if (filter === 'Critical') return item.urgency === 'Critical'
    if (filter === 'Matching') return item.status.includes('Matching')
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
      <AppTopHeader />

      <main className="bml-page-content">
        {/* Title & Live Status Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                Emergency Operations Board
              </h1>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Live referral routing · {boardData?.connected_facilities ?? 10} partner facilities connected
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="pill-critical">● Critical: {boardData?.counts?.critical ?? 0}</span>
              <span className="pill-urgent" style={{ background: '#fef3c7', color: '#b45309' }}>
                ● Matching: {boardData?.counts?.matching ?? 0}
              </span>
              <span className="pill-routine" style={{ background: '#dbeafe', color: '#1e40af' }}>
                ● Accepted: {boardData?.counts?.accepted ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Top Metric Cards */}
        <div className="bml-metrics-grid">
          {/* Card 1: Bed Capacity */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span>Bed Capacity</span>
              <Bed size={18} color="#64748b" />
            </div>
            <div>
              <div className="bml-metric-value">
                {boardData?.metrics?.bed_capacity?.total != null ? (
                  <>
                    {boardData.metrics.bed_capacity.occupied ?? 0}
                    <span style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 600 }}>
                      /{boardData.metrics.bed_capacity.total}
                    </span>
                  </>
                ) : (
                  <span>NA</span>
                )}
              </div>
              <div className="bml-metric-progress-track">
                <div
                  className="bml-metric-progress-fill"
                  style={{ width: `${boardData?.metrics?.bed_capacity?.percent ?? 0}%`, background: '#4f46e5' }}
                />
              </div>
            </div>
            <div className="bml-metric-caption">
              {boardData?.metrics?.bed_capacity?.total != null
                ? `${boardData.metrics.bed_capacity.percent ?? 0}% occupied · ${boardData.metrics.bed_capacity.available ?? 0} available`
                : 'Capacity details: NA'}
            </div>
          </div>

          {/* Card 2: ICU Status */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span>ICU Status</span>
              <Activity size={18} color={(boardData?.metrics?.icu_status?.occupied_pct ?? 0) > 85 ? '#ef4444' : '#10b981'} />
            </div>
            <div>
              <div className="bml-metric-value" style={{ color: (boardData?.metrics?.icu_status?.occupied_pct ?? 0) > 85 ? '#ef4444' : '#10b981' }}>
                {boardData?.metrics?.icu_status?.status !== 'NA' ? (boardData?.metrics?.icu_status?.status || 'Operational') : 'NA'}
              </div>
              <div className="bml-metric-progress-track">
                <div
                  className="bml-metric-progress-fill"
                  style={{
                    width: `${boardData?.metrics?.icu_status?.occupied_pct ?? 0}%`,
                    background: (boardData?.metrics?.icu_status?.occupied_pct ?? 0) > 85 ? '#ef4444' : '#10b981',
                  }}
                />
              </div>
            </div>
            <div className="bml-metric-caption">
              {boardData?.metrics?.icu_status?.occupied_pct != null
                ? `${boardData.metrics.icu_status.occupied_pct}% full · ${boardData.metrics.icu_status.beds_left ?? 0} beds left`
                : 'ICU details: NA'}
            </div>
          </div>

          {/* Card 3: On-call Specialists */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span>On-call Specialists</span>
              <Users size={18} color="#64748b" />
            </div>
            <div>
              <div className="bml-metric-value">
                {boardData?.metrics?.on_call_specialists?.count > 0 ? (
                  <>
                    {boardData.metrics.on_call_specialists.count}{' '}
                    <span style={{ fontSize: '15px', color: '#10b981', fontWeight: 700 }}>available</span>
                  </>
                ) : (
                  <span>NA</span>
                )}
              </div>
              <div style={{ height: '6px', margin: '10px 0 6px' }} />
            </div>
            <div className="bml-metric-caption">
              {boardData?.metrics?.on_call_specialists?.domains?.length > 0
                ? boardData.metrics.on_call_specialists.domains.join(', ')
                : 'Specialist roster: NA'}
            </div>
          </div>

          {/* Card 4: Active Requests */}
          <div className="bml-metric-card">
            <div className="bml-metric-card-header">
              <span>Active Requests</span>
              <Inbox size={18} color="#64748b" />
            </div>
            <div>
              <div className="bml-metric-value">
                {boardData?.metrics?.active_requests?.count ?? incomingRequests.length}{' '}
                <span style={{ fontSize: '14px', color: '#b45309', fontWeight: 700 }}>
                  {boardData?.metrics?.active_requests?.label || 'awaiting triage'}
                </span>
              </div>
              <div style={{ height: '6px', margin: '10px 0 6px' }} />
            </div>
            <div className="bml-metric-caption">
              {boardData?.metrics?.active_requests?.sublabel || (incomingRequests.length > 0 ? `${incomingRequests.length} pending triage` : 'All clear')}
            </div>
          </div>
        </div>

        {/* 2-Column Board */}
        <div className="bml-two-col-layout">
          {/* Left Column: Active Referral Stream & Incoming Transfer Requests */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Active Referral Stream */}
            <div className="bml-card-panel">
              <div className="bml-panel-title-row">
                <h2 className="bml-panel-title">Active Referral Stream</h2>
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  {(['All', 'Critical', 'Matching'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilter(tab)}
                      style={{
                        padding: '4px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: filter === tab ? '#ffffff' : 'transparent',
                        color: filter === tab ? '#0f172a' : '#64748b',
                        boxShadow: filter === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredStream.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <Activity size={32} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      No Active Referrals in Stream
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '380px', margin: '0 auto' }}>
                      Emergency referrals created by your team or routed to your facility will stream here in real time.
                    </div>
                  </div>
                ) : (
                  filteredStream.map((item, idx) => {
                  const isAccepted = item.status.includes('Accepted')
                  const isMatching = item.status.includes('Matching')
                  const isHandoff = item.status.includes('Handoff')

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #f1f5f9',
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                          }}
                        >
                          {item.patient_name[0]}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                              {item.patient_name}
                            </span>
                            <span className={item.urgency === 'Critical' ? 'pill-critical' : item.urgency === 'Urgent' ? 'pill-urgent' : 'pill-routine'}>
                              ● {item.urgency}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {item.specialty} — transferred from <strong>{item.origin}</strong>
                            {item.eta ? ` · ETA ${item.eta}` : item.notes ? ` · ${item.notes}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: isAccepted ? '#ecfdf5' : isMatching ? '#fffbeb' : '#e0e7ff',
                            color: isAccepted ? '#047857' : isMatching ? '#b45309' : '#3730a3',
                          }}
                        >
                          ● {item.status}
                        </span>

                        {isMatching ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => {
                                setStreamList((prev) =>
                                  prev.map((s) =>
                                    s.id === item.id ? { ...s, status: `Accepted · ${user.display_name}` } : s
                                  )
                                )
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#10b981',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="Accept into facility"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setStreamList((prev) => prev.filter((s) => s.id !== item.id))
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              title="Decline"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => navigate('/referral/handoff-demo')}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#4f46e5',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            title="View Digital Handoff"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }))}
              </div>
            </div>

            {/* Incoming Transfer Requests */}
            <div className="bml-card-panel">
              <div className="bml-panel-title-row">
                <div>
                  <h2 className="bml-panel-title">Incoming Transfer Requests</h2>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>From partner facilities</div>
                </div>
                <Link
                  to="/referral/new"
                  style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}
                >
                  Create New Request +
                </Link>
              </div>

              {incomingRequests.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Inbox size={32} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Triage Queue Clear
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    No pending incoming transfer requests from partner facilities.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                  {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building size={16} color="#4f46e5" />
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{req.patient_name || req.origin}</span>
                        </div>
                        <span className={req.urgency === 'Critical' ? 'pill-critical' : 'pill-urgent'} style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {req.urgency || 'Critical'}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#312e81', background: '#eef2ff', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px', fontWeight: 600 }}>
                        <div>Patient: <strong>{req.patient_name || 'Patient'}</strong> · Age: {req.age ? `${req.age} Yrs` : 'NA'} · Sex: {req.sex || 'NA'} · Blood Group: {req.blood_group || 'NA'}</div>
                        {req.allergies && <div style={{ marginTop: '3px', color: '#b91c1c' }}>Allergies: {req.allergies}</div>}
                        {req.medical_history && <div style={{ marginTop: '2px', color: '#475569' }}>History: {req.medical_history}</div>}
                      </div>

                      <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.4 }}>
                        <strong>Symptoms:</strong> {req.summary}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', marginBottom: '12px', fontWeight: 700 }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                        <span>Capacity Check: Emergency Bay Available</span>
                      </div>
                    </div>


                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.origin, req.is_patient_request, req.referral_id)}
                        style={{
                          flex: 1,
                          height: '34px',
                          borderRadius: '8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id, req.is_patient_request, req.referral_id)}
                        style={{
                          flex: 1,
                          height: '34px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Right Column: Hospital Capacity & Specialist Availability */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Hospital Capacity Panel */}
            <div className="bml-card-panel">
              <h2 className="bml-panel-title" style={{ marginBottom: '18px' }}>
                Hospital Capacity
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ICU */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>🫁 ICU</span>
                    <span style={{ color: '#ef4444' }}>92%</span>
                  </div>
                  <div className="bml-metric-progress-track">
                    <div className="bml-metric-progress-fill" style={{ width: '92%', background: '#ef4444' }} />
                  </div>
                </div>

                {/* PICU */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>👶 PICU</span>
                    <span style={{ color: '#f59e0b' }}>68%</span>
                  </div>
                  <div className="bml-metric-progress-track">
                    <div className="bml-metric-progress-fill" style={{ width: '68%', background: '#f59e0b' }} />
                  </div>
                </div>

                {/* NICU */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>🍼 NICU</span>
                    <span style={{ color: '#10b981' }}>41%</span>
                  </div>
                  <div className="bml-metric-progress-track">
                    <div className="bml-metric-progress-fill" style={{ width: '41%', background: '#10b981' }} />
                  </div>
                </div>

                {/* Ventilators */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                    <span>💨 Ventilators</span>
                    <span style={{ color: '#4f46e5' }}>7/10</span>
                  </div>
                  <div className="bml-metric-progress-track">
                    <div className="bml-metric-progress-fill" style={{ width: '70%', background: '#4f46e5' }} />
                  </div>
                </div>

                {/* CT / MRI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>🩻 CT / MRI</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981' }}>Available</span>
                </div>

                {/* Blood Bank */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>🩸 Blood Bank</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>O- 4 units</span>
                </div>
              </div>
            </div>

            {/* Specialist Availability Panel */}
            <div className="bml-card-panel">
              <h2 className="bml-panel-title" style={{ marginBottom: '18px' }}>
                Specialist Availability
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(boardData?.specialists || [
                  { specialty: 'Cardiology', doctor: 'Dr. Okonkwo', status: 'On call', color: 'green' },
                  { specialty: 'Trauma Surgery', doctor: 'Dr. Hayes', status: 'In OR', color: 'orange' },
                  { specialty: 'Neurology', doctor: 'Dr. Almeida', status: 'On call', color: 'green' },
                  { specialty: 'Pediatrics', doctor: 'Dr. Chen', status: 'En route', color: 'yellow' },
                  { specialty: 'Respiratory', doctor: 'Dr. Bello', status: 'Off shift', color: 'gray' },
                ]).map((spec: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '10px',
                      borderBottom: idx < 4 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{spec.specialty}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{spec.doctor}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        background:
                          spec.color === 'green'
                            ? '#ecfdf5'
                            : spec.color === 'orange'
                            ? '#fef2f2'
                            : spec.color === 'yellow'
                            ? '#fffbeb'
                            : '#f1f5f9',
                        color:
                          spec.color === 'green'
                            ? '#059669'
                            : spec.color === 'orange'
                            ? '#dc2626'
                            : spec.color === 'yellow'
                            ? '#b45309'
                            : '#64748b',
                      }}
                    >
                      ● {spec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
