import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ambulance, RotateCcw, Upload, FileText, CheckCircle2, ArrowRight } from 'lucide-react'

import { api } from '../../services/api.js'
import { useLocalState } from '../../hooks/useLocalState.js'
import { useAuth } from '../../context/AuthContext'

const REQUIREMENT_OPTIONS = ['ICU', 'NEUROLOGY', 'CT', 'CARDIOLOGY', 'EMERGENCY']

export default function PatientReferral() {
  const { user } = useAuth()
  const [demoPatientId] = useLocalState('demo.patientId', null)
  const patientId = user?.id || demoPatientId || 'fe766272-ca89-4659-a8bb-50233ca9da35'
  const [journeyId, setJourneyId] = useLocalState('demo.journeyId', null)

  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageBase64, setImageBase64] = useState(null)
  const [extraText, setExtraText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [parseNote, setParseNote] = useState(null)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    reason_for_referral: '',
    clinical_summary: '',
    referring_doctor_name: '',
    requirements: [] as string[],
  })

  const [lat, setLat] = useState('28.6200')
  const [lon, setLon] = useState('77.2100')

  const [referral, setReferral] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSendRequest(hospitalId: string) {
    if (!referral) return
    try {
      await api.sendReferralRequest(referral.id, hospitalId)
      const full = await api.getReferral(referral.id)
      setReferral(full)
    } catch (err) {
      console.error(err)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  async function handleParse() {
    setParsing(true)
    setParseError(null)
    setParseNote(null)
    try {
      const result = await api.parseReferralDocument({ image_base64: imageBase64, extra_text: extraText })
      if (!result.ok) {
        setParseError(result.error || 'Could not read this document — please enter the details manually below.')
        setMode('manual')
        return
      }
      setForm({
        reason_for_referral: result.reason_for_referral || '',
        clinical_summary: result.clinical_summary || '',
        referring_doctor_name: result.referring_doctor_name || '',
        requirements: (result.requirements || []).map((r) => r.requirement_type),
      })
      setParseNote('Extracted from the document — please review and correct anything before submitting.')
      setMode('manual')
    } catch (err) {
      setParseError('Document parsing failed — please enter the details manually below.')
      setMode('manual')
    } finally {
      setParsing(false)
    }
  }

  function toggleRequirement(r) {
    setForm((prev) => ({
      ...prev,
      requirements: prev.requirements.includes(r) ? prev.requirements.filter((x) => x !== r) : [...prev.requirements, r],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = await api.createReferral({
        patient_id: patientId,
        journey_id: journeyId || undefined,
        referring_doctor_name: form.referring_doctor_name || undefined,
        origin_lat: Number(lat),
        origin_lon: Number(lon),
        reason_for_referral: form.reason_for_referral,
        clinical_summary: form.clinical_summary,
        requirements: form.requirements.map((r) => ({ requirement_type: r, mandatory: true })),
        source_document_note: imageBase64 ? 'Extracted from a scanned referral letter' : undefined,
      })
      if (result?.journey_id) {
        setJourneyId(result.journey_id)
      }
      const full = await api.getReferral(result.referral_id)
      setReferral(full)
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not submit referral')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!referral) return
    const interval = setInterval(async () => {
      const r = await api.getReferral(referral.id)
      setReferral(r)
    }, 4000)
    return () => clearInterval(interval)
  }, [referral])

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            PATIENT-INITIATED REFERRAL LOOP
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
            Find Higher-tier Hospital
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Upload or input doctor's treatment notes or transfer advice from your hospital to match advanced tertiary care facilities.
          </div>
        </div>

        {/* 108 Emergency Dispatch on top right */}
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


      {!referral && (
        <>
          <div className="tab-row">
            <button className={mode === 'scan' ? 'active' : ''} onClick={() => setMode('scan')}>Scan document</button>
            <button className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>Enter manually</button>
          </div>

          {mode === 'scan' && (
            <div className="panel">
              <h3>Scan doctor's referral letter</h3>
              {parseError && <div className="error-banner">{parseError}</div>}
              <div className="scan-dropzone" onClick={() => fileInputRef.current?.click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Referral letter preview" className="scan-preview" />
                ) : (
                  <p>Click to upload a photo of the referral letter (JPEG/PNG)</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <label>Or paste any typed text from the letter (optional, improves accuracy)</label>
              <textarea value={extraText} onChange={(e) => setExtraText(e.target.value)} />
              <p className="footnote">
                Extraction is best-effort (MedGemma) — you'll review and can correct every field before
                anything is submitted.
              </p>
              <div style={{ marginTop: 16 }}>
                <button disabled={parsing || (!imageBase64 && !extraText.trim())} onClick={handleParse}>
                  {parsing ? 'Reading document…' : 'Extract details'}
                </button>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <form className="panel" onSubmit={handleSubmit}>
              <h3>Referral details</h3>
              {parseNote && <div className="warning-banner">{parseNote}</div>}
              {error && <div className="error-banner">{error}</div>}
              <label>Reason for referral</label>
              <input value={form.reason_for_referral} onChange={(e) => setForm({ ...form, reason_for_referral: e.target.value })} required />
              <label>Clinical summary</label>
              <textarea value={form.clinical_summary} onChange={(e) => setForm({ ...form, clinical_summary: e.target.value })} required />
              <label>Referring doctor's name (optional)</label>
              <input value={form.referring_doctor_name} onChange={(e) => setForm({ ...form, referring_doctor_name: e.target.value })} />
              <label>Required capabilities (mandatory AND)</label>
              {REQUIREMENT_OPTIONS.map((r) => (
                <div className="checkbox-row" key={r}>
                  <input type="checkbox" id={`req-${r}`} checked={form.requirements.includes(r)} onChange={() => toggleRequirement(r)} />
                  <label htmlFor={`req-${r}`} style={{ margin: 0 }}>{r}</label>
                </div>
              ))}
              <div className="grid-2">
                <div>
                  <label>Your current latitude</label>
                  <input value={lat} onChange={(e) => setLat(e.target.value)} />
                </div>
                <div>
                  <label>Your current longitude</label>
                  <input value={lon} onChange={(e) => setLon(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={busy || form.requirements.length === 0}>
                  {busy ? 'Searching…' : 'Search for a hospital'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {referral && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="bml-card-panel" style={{ border: '1.5px solid #e0e7ff', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#9333ea', textTransform: 'uppercase' }}>
                  Referral Active
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
                  {referral.reason_for_referral || 'Specialized Tertiary Care Request'}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Status: <span className="pill-accepted">{(referral.status || 'PENDING').replaceAll('_', ' ')}</span>
                </div>
              </div>
              {referral.journey_id && (
                <Link
                  to={`/patient/journey?journey_id=${referral.journey_id}`}
                  style={{
                    background: '#9333ea',
                    color: 'white',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Open Live Map</span>
                  <ArrowRight size={15} />
                </Link>
              )}
            </div>
            {referral.status === 'NO_VERIFIED_FEASIBLE_DESTINATION' && (
              <div className="error-banner" style={{ marginTop: '14px' }}>
                No hospital currently satisfies every mandatory requirement within range.
              </div>
            )}
          </div>

          {/* Hospital responses */}
          {referral.responses && referral.responses.length > 0 && (
            <div className="bml-card-panel" style={{ border: '1.5px solid #a7f3d0', background: '#f0fdf4' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#065f46', marginBottom: '12px' }}>
                Hospital Responses
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {referral.responses.map((r) => {
                  const isAccepted = r.status === 'ACCEPTED'
                  return (
                    <div
                      key={r.id || r.hospital_id}
                      style={{
                        background: '#ffffff',
                        border: isAccepted ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {r.hospital_name || 'Network Hospital'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {r.response_reason || (isAccepted ? 'Intake slot reserved' : 'Reviewing case')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={isAccepted ? 'pill-accepted' : 'badge neutral'}>
                          {r.status}
                        </span>
                        {isAccepted && referral.journey_id && (
                          <Link
                            to={`/patient/journey?journey_id=${referral.journey_id}`}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            Track Route →
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ranked Hospitals */}
          <div className="bml-card-panel">
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
              Recommended Tertiary Facilities ({referral.evaluations?.filter((e) => e.eligible)?.length || 0} Matched)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {referral.evaluations?.filter((e) => e.eligible).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                  No candidate hospitals matching the exact criteria were located.
                </div>
              )}
              {referral.evaluations
                ?.filter((e) => e.eligible)
                .sort((a, b) => (b.score_optional || 0) - (a.score_optional || 0))
                .map((e, i) => {
                  const isSent = referral.responses?.some((r) => r.hospital_id === e.hospital_id)
                  return (
                    <div
                      key={e.id || e.hospital_id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '4px' }}>
                            #{i + 1} MATCH
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            {e.hospital_name || 'Hospital Center'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          📍 {e.address || 'Network Hospital'} · {e.score_optional ? `${Math.round(e.score_optional * 100)}% Clinical Match Score` : 'Qualified Facility'}
                        </div>
                      </div>
                      <div>
                        <button
                          disabled={isSent || busy}
                          onClick={() => handleSendRequest(e.hospital_id)}
                          style={{
                            background: isSent ? '#f1f5f9' : '#4f46e5',
                            color: isSent ? '#64748b' : 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: isSent ? 'default' : 'pointer',
                          }}
                        >
                          {isSent ? 'Request Dispatched' : 'Dispatch Referral'}
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
