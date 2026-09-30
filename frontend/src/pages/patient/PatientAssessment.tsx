import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Ambulance, Stethoscope, AlertTriangle, CheckCircle2, ArrowRight, MapPin, Activity } from 'lucide-react'

import { api } from '../../services/api.js'
import { useLocalState } from '../../hooks/useLocalState.js'
import { useAuth } from '../../context/AuthContext'

const PRESENTING_CONCERNS = [
  { key: 'CARDIAC_SYMPTOMS', label: 'Chest pain / suspected cardiac event / heart attack' },
  { key: 'SUSPECTED_STROKE', label: 'Suspected stroke symptoms (facial droop, speech difficulty, weakness)' },
  { key: 'SEVERE_TRAUMA', label: 'Severe trauma / major injury / heavy bleeding' },
  { key: 'GENERAL_EMERGENCY', label: 'Breathing distress or other acute emergency' },
]

export default function PatientAssessment() {
  const { user } = useAuth()
  const [demoPatientId] = useLocalState('demo.patientId', null)
  const patientId = user?.id || demoPatientId || 'fe766272-ca89-4659-a8bb-50233ca9da35'
  const requesterRole = user?.role || 'PATIENT'

  const [, setRequestId] = useLocalState('demo.requestId', null)
  const [, setJourneyId] = useLocalState('demo.journeyId', null)
  const [, setPatientLat] = useLocalState('demo.patientLat', null)
  const [, setPatientLon] = useLocalState('demo.patientLon', null)

  const [rawInput, setRawInput] = useState('')
  const [concerns, setConcerns] = useState([])
  const [lat, setLat] = useState('28.6200')
  const [lon, setLon] = useState('77.2100')
  const [geoLoading, setGeoLoading] = useState(false)
  const [assessment, setAssessment] = useState(null)
  const [suspectedCondition, setSuspectedCondition] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  function toggleConcern(key) {
    setConcerns((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]))
  }

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLon(pos.coords.longitude.toFixed(6))
        setGeoLoading(false)
      },
      () => {
        setError('Could not get your location. Please enter coordinates manually.')
        setGeoLoading(false)
      },
      { timeout: 8000 },
    )
  }

  function getConditionImpression(text, selectedConcerns) {
    const lower = (text || '').toLowerCase()
    if (selectedConcerns.includes('CARDIAC_SYMPTOMS') || lower.includes('chest') || lower.includes('heart') || lower.includes('cardiac')) {
      return 'Suspected Acute Coronary Syndrome / Cardiac Emergency'
    }
    if (selectedConcerns.includes('SUSPECTED_STROKE') || lower.includes('stroke') || lower.includes('speech') || lower.includes('droop') || lower.includes('numb')) {
      return 'Suspected Cerebrovascular Accident / Acute Stroke'
    }
    if (selectedConcerns.includes('SEVERE_TRAUMA') || lower.includes('bleed') || lower.includes('fracture') || lower.includes('accident')) {
      return 'Acute Trauma / Critical Injury'
    }
    if (lower.includes('breath') || lower.includes('dyspnea') || lower.includes('chok')) {
      return 'Acute Respiratory Distress'
    }
    return 'Acute Medical Condition Requiring Assessment'
  }

  async function handleAssess(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api.createAssessment({
        patient_id: patientId,
        raw_input: rawInput,
        presenting_concerns: concerns,
        requester_role_optional: requesterRole,
      })
      setAssessment(result)
      setSuspectedCondition(getConditionImpression(rawInput, concerns))
    } catch (err) {
      setError(err?.response?.data?.error || 'Assessment failed. Please retry or contact emergency directly.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmitRequest() {
    setError(null)
    setBusy(true)
    try {
      const result = await api.createPatientRequest({
        patient_id: patientId,
        location_lat: Number(lat),
        location_lon: Number(lon),
        urgency: assessment?.triage_label || 'URGENT',
        symptom_summary: rawInput,
        requirements: assessment?.requirements || [],
        requester_role_optional: requesterRole,
      })
      setPatientLat(Number(lat))
      setPatientLon(Number(lon))
      setRequestId(result.request_id)
      setJourneyId(result.journey_id)
      navigate(`/patient/options?request_id=${result.request_id}`)
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit hospital broadcast request')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Top Bar with 108 Emergency Dispatch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            PATIENT INTAKE &amp; AI-ASSISTED TRIAGE
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
            Enter Symptoms
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Describe what you or the patient are experiencing for automated triage and routing to 10 top candidate hospitals.
          </div>
        </div>

        {/* 108 Dispatch button top right */}
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

      <div style={{ display: 'grid', gridTemplateColumns: assessment ? '1fr 1fr' : '1fr', gap: '24px' }}>
        {/* Form Panel */}
        <form
          className="panel"
          onSubmit={handleAssess}
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Describe Symptoms / Chief Complaint *
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              required
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              placeholder="e.g., Sudden crushing chest pain radiating to left arm and jaw, severe sweating, and shortness of breath starting 30 minutes ago..."
            />
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
              Specific Emergency Category (Select any that apply)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PRESENTING_CONCERNS.map((c) => (
                <label
                  key={c.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: concerns.includes(c.key) ? '#eef2ff' : '#f8fafc',
                    border: concerns.includes(c.key) ? '1.5px solid #6366f1' : '1px solid #e2e8f0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: concerns.includes(c.key) ? 700 : 500,
                    color: concerns.includes(c.key) ? '#312e81' : '#334155',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={concerns.includes(c.key)}
                    onChange={() => toggleConcern(c.key)}
                    style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
              Your Current Location Coordinates
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Latitude</span>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Longitude</span>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MapPin size={14} />
              <span>{geoLoading ? 'Detecting GPS…' : 'Use Current GPS Location'}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || !rawInput.trim()}
            style={{
              width: '100%',
              background: '#4f46e5',
              color: 'white',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 800,
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Activity size={18} />
            <span>{busy ? 'Running AI Triage…' : 'Triage Symptoms'}</span>
          </button>
        </form>

        {/* Triage Result & Hospital Broadcast Panel */}
        {assessment && (
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '28px',
              border: '2px solid #6366f1',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span
                  style={{
                    background: assessment.triage_label === 'URGENT' ? '#fef2f2' : '#f0fdf4',
                    color: assessment.triage_label === 'URGENT' ? '#dc2626' : '#16a34a',
                    border: `1.5px solid ${assessment.triage_label === 'URGENT' ? '#fca5a5' : '#86efac'}`,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  TRIAGE LEVEL: {assessment.triage_label}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Care Pathway: {assessment.care_pathway}</span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>
                {suspectedCondition}
              </h2>

              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
                AI clinical assessment has analyzed your symptoms against emergency protocols. The system is ready to rank all candidate hospitals and broadcast emergency intake requests to the <strong>10 best-matched facilities</strong> right now.
              </p>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  MATCHING SPECIFICATIONS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {assessment.requirements?.map((r) => (
                    <span
                      key={r.requirement_type}
                      style={{
                        background: '#e0e7ff',
                        color: '#3730a3',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {r.requirement_type}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmitRequest}
              disabled={busy}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                padding: '16px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 800,
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
              }}
            >
              <span>{busy ? 'Broadcasting to Hospitals…' : 'Send Requests'}</span>
              <ArrowRight size={18} />
            </button>

          </div>
        )}
      </div>
    </div>
  )
}
