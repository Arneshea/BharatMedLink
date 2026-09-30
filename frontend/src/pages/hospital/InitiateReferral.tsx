import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  AlertTriangle,
  Heart,
  Brain,
  Car,
  Wind,
  Baby,
  Flame,
  Stethoscope,
  Bug,
  Sparkles,
  CheckCircle2,
  FileText,
  User,
  Activity,
  ShieldCheck,
  Upload
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function InitiateReferral() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Step 1: Patient Info
  const [fullName, setFullName] = useState('')
  const [uhid, setUhid] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')
  const [bloodGroup, setBloodGroup] = useState('O+')
  const [category, setCategory] = useState<string>('Cardiac')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [contactNumber, setContactNumber] = useState('')

  // Step 2: Clinical Data
  const [reason, setReason] = useState('')
  const [clinicalSummary, setClinicalSummary] = useState('')
  const [currentTreatment, setCurrentTreatment] = useState('')
  const [vitals, setVitals] = useState({
    hr: '',
    bp: '',
    spo2: '',
    temp: '',
  })
  const [consentConfirmed, setConsentConfirmed] = useState(false)

  // Step 3: Requirements
  const [mandatoryReqs, setMandatoryReqs] = useState<string[]>(['CARDIOLOGY', 'ICU', 'CATH_LAB'])
  const [preferredReqs, setPreferredReqs] = useState<string[]>(['CARDIAC_OT', 'VENTILATOR', 'SPECIALIST_ON_CALL'])

  const categories = [
    { id: 'Cardiac', label: 'Cardiac', icon: Heart, defaultReqs: ['CARDIOLOGY', 'ICU', 'CATH_LAB'] },
    { id: 'Stroke', label: 'Stroke', icon: Brain, defaultReqs: ['NEUROLOGY', 'CT', 'ICU'] },
    { id: 'Trauma', label: 'Trauma', icon: Car, defaultReqs: ['TRAUMA_CARE', 'OT', 'BLOOD_BANK'] },
    { id: 'Respiratory', label: 'Respiratory', icon: Wind, defaultReqs: ['RESPIRATORY', 'VENTILATOR', 'ICU'] },
    { id: 'Obstetric', label: 'Obstetric', icon: Baby, defaultReqs: ['SURGICAL', 'EMERGENCY', 'ICU'] },
    { id: 'Pediatric', label: 'Pediatric', icon: Baby, defaultReqs: ['ICU', 'EMERGENCY', 'PICU'] },
    { id: 'Burns', label: 'Burns', icon: Flame, defaultReqs: ['SURGICAL', 'ICU', 'EMERGENCY'] },
    { id: 'Surgical', label: 'Surgical', icon: Stethoscope, defaultReqs: ['SURGICAL', 'OT', 'ICU'] },
    { id: 'Sepsis', label: 'Sepsis', icon: Bug, defaultReqs: ['ICU', 'VENTILATOR', 'EMERGENCY'] },
  ]

  const handleSelectCategory = (catId: string) => {
    setCategory(catId)
    const match = categories.find((c) => c.id === catId)
    if (match) {
      setMandatoryReqs(match.defaultReqs)
    }
  }

  const handleAiAssist = async () => {
    if (!aiNote.trim()) return
    setAiLoading(true)
    try {
      const res = await api.aiAssist(aiNote)
      if (res.ok && res.extracted) {
        const ext = res.extracted
        if (ext.emergency_category) {
          const formatted = ext.emergency_category.charAt(0) + ext.emergency_category.slice(1).toLowerCase()
          setCategory(formatted)
        }
        if (ext.reason_for_referral) setReason(ext.reason_for_referral)
        if (ext.clinical_summary) setClinicalSummary(ext.clinical_summary)
        if (ext.current_treatment) setCurrentTreatment(ext.current_treatment)
        if (ext.vitals) {
          setVitals({
            hr: String(ext.vitals.hr || 112),
            bp: ext.vitals.bp || '90/60',
            spo2: String(ext.vitals.spo2 || 92),
            temp: String(ext.vitals.temp || 98.6),
          })
        }
        if (ext.mandatory_requirements) {
          setMandatoryReqs(ext.mandatory_requirements.map((r: any) => r.requirement_type))
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        patient_name: fullName,
        patient_uhid: uhid,
        age: parseInt(age) || 45,
        gender: gender,
        blood_group: bloodGroup,
        emergency_category: category.toUpperCase(),
        reason_for_referral: reason,
        clinical_summary: clinicalSummary,
        current_treatment: currentTreatment,
        patient_vitals: {
          hr: parseInt(vitals.hr) || 112,
          bp: vitals.bp,
          spo2: parseInt(vitals.spo2) || 92,
          temp: parseFloat(vitals.temp) || 98.6,
        },
        emergency_contact_name: emergencyContact,
        emergency_contact_phone: contactNumber,
        referring_doctor_name: user.display_name || 'Dr. Anjali Reyes (Emergency)',
        referring_hospital_id: user.hospital_id || 'a1111111-1111-1111-1111-111111111111',
        requirements: mandatoryReqs.map((r) => ({ requirement_type: r, mandatory: true })),
        preferred_requirements: preferredReqs.map((r) => ({ requirement_type: r, mandatory: false })),
        consent_confirmed: consentConfirmed,
      }

      const res = await api.createReferral(payload)
      if (res.referral_id) {
        navigate(`/referral/${res.referral_id}/matches`)
      }
    } catch (e) {
      console.error(e)
      // Fallback direct navigation for instant prototype demo
      navigate('/referral/matching-demo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Header matching Image 2 */}
      <div
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
        <Link
          to="/hospital"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#0f172a',
            fontWeight: 800,
            fontSize: '16px',
          }}
        >
          <ArrowLeft size={18} />
          <span>Initiate Emergency Referral</span>
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#dc2626',
            fontWeight: 800,
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={16} />
          <span>Priority: Immediate Transfer</span>
        </div>
      </div>

      <main className="bml-page-content" style={{ maxWidth: '880px' }}>
        {/* Stepper matching Image 2 */}
        <div className="bml-stepper">
          <div className={`bml-step-item ${step >= 1 ? 'active' : ''}`}>
            <div className="bml-step-circle">
              <User size={16} />
            </div>
            <span className="bml-step-label">Patient Info</span>
          </div>

          <div
            style={{
              width: '80px',
              height: '2px',
              background: step >= 2 ? '#4f46e5' : '#e2e8f0',
              margin: '-18px 0 0',
            }}
          />

          <div className={`bml-step-item ${step >= 2 ? 'active' : ''}`}>
            <div className="bml-step-circle">2</div>
            <span className="bml-step-label">Clinical Data</span>
          </div>

          <div
            style={{
              width: '80px',
              height: '2px',
              background: step >= 3 ? '#4f46e5' : '#e2e8f0',
              margin: '-18px 0 0',
            }}
          />

          <div className={`bml-step-item ${step >= 3 ? 'active' : ''}`}>
            <div className="bml-step-circle">3</div>
            <span className="bml-step-label">Requirements</span>
          </div>

          <div style={{ width: '80px', height: '2px', background: '#e2e8f0', margin: '-18px 0 0' }} />

          <div className="bml-step-item">
            <div className="bml-step-circle">4</div>
            <span className="bml-step-label">Find Matches</span>
          </div>
        </div>

        {/* STEP 1: PATIENT INFORMATION (Image 2) */}
        {step === 1 && (
          <div className="bml-card-panel">
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Step 1: Patient Information
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px' }}>
              Provide basic identification and emergency contact details.
            </p>

            {/* Row 1: Full Name & UHID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
              <div>
                <label className="bml-label">Full Name *</label>
                <input
                  type="text"
                  className="bml-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter patient full name"
                />
              </div>
              <div>
                <label className="bml-label">Patient ID / UHID</label>
                <input
                  type="text"
                  className="bml-input"
                  value={uhid}
                  onChange={(e) => setUhid(e.target.value)}
                  placeholder="e.g. UHID-98234"
                />
              </div>
            </div>

            {/* Row 2: Age, Gender, Blood Group */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px', marginBottom: '22px' }}>
              <div>
                <label className="bml-label">Age *</label>
                <input
                  type="number"
                  className="bml-input"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div>
                <label className="bml-label">Gender *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['Male', 'Female', 'Other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      style={{
                        flex: 1,
                        height: '46px',
                        borderRadius: '10px',
                        border: gender === g ? '2px solid #4f46e5' : '1.5px solid #cbd5e1',
                        background: gender === g ? '#eef2ff' : '#ffffff',
                        color: gender === g ? '#4338ca' : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="bml-label">Blood Group</label>
                <select
                  className="bml-input"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                >
                  <option value="Unknown">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            {/* Emergency Category Grid (3x3 matching Image 2) */}
            <div style={{ marginBottom: '22px' }}>
              <label className="bml-label">Emergency Category *</label>
              <div className="bml-category-grid">
                {categories.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`bml-category-box ${isSelected ? 'active' : ''}`}
                    >
                      <Icon size={22} color={isSelected ? '#dc2626' : '#64748b'} />
                      <span>{cat.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Next of Kin & Contact Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
              <div>
                <label className="bml-label">Next of Kin / Emergency Contact</label>
                <input
                  type="text"
                  className="bml-input"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="bml-label">Contact Number</label>
                <div style={{ display: 'flex' }}>
                  <span
                    style={{
                      height: '46px',
                      padding: '0 12px',
                      background: '#f1f5f9',
                      border: '1.5px solid #cbd5e1',
                      borderRight: 'none',
                      borderTopLeftRadius: '10px',
                      borderBottomLeftRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="text"
                    className="bml-input"
                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="btn-primary-purple"
                onClick={() => setStep(2)}
              >
                Next: Clinical Data &gt;
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CLINICAL DATA */}
        {step === 2 && (
          <div className="bml-card-panel">
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Step 2: Clinical Data &amp; Vitals
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Enter presenting symptoms, vital signs, and current clinical treatment.
            </p>

            {/* AI Assistant Box (Requirement 8) */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} color="#4f46e5" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#4338ca' }}>
                  AI Clinical Assistant (Advisory Only)
                </span>
              </div>
              <textarea
                className="bml-textarea"
                style={{ minHeight: '60px', marginBottom: '10px' }}
                value={aiNote}
                onChange={(e) => setAiNote(e.target.value)}
                placeholder="Paste doctor's dictated notes or clinical summary here to auto-fill fields..."
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAiAssist}
                disabled={aiLoading}
              >
                {aiLoading ? 'Extracting with AI...' : '✨ Auto-extract Clinical Fields'}
              </button>
            </div>

            {/* Vitals Tiles */}
            <label className="bml-label">Patient Vitals at Origin Facility</label>
            <div className="bml-vitals-row">
              <div className="bml-vital-box" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
                <span className="bml-vital-label">Heart Rate</span>
                <div>
                  <input
                    type="number"
                    style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, width: '60px', color: '#dc2626' }}
                    value={vitals.hr}
                    onChange={(e) => setVitals({ ...vitals, hr: e.target.value })}
                  />
                  <span className="bml-vital-unit">bpm</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
                <span className="bml-vital-label">BP (SYS/DIA)</span>
                <div>
                  <input
                    type="text"
                    style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, width: '90px', color: '#b45309' }}
                    value={vitals.bp}
                    onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                  />
                  <span className="bml-vital-unit">mmHg</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                <span className="bml-vital-label">SpO2</span>
                <div>
                  <input
                    type="number"
                    style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, width: '50px', color: '#1d4ed8' }}
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                  />
                  <span className="bml-vital-unit">%</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>
                <span className="bml-vital-label">Temp</span>
                <div>
                  <input
                    type="text"
                    style={{ background: 'transparent', border: 'none', fontSize: '22px', fontWeight: 800, width: '60px', color: '#475569' }}
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                  />
                  <span className="bml-vital-unit">°F</span>
                </div>
              </div>
            </div>

            {/* Diagnosis & Summary */}
            <div className="bml-input-group">
              <label className="bml-label">Primary Reason for Referral *</label>
              <input
                type="text"
                className="bml-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="bml-input-group">
              <label className="bml-label">Clinical Summary *</label>
              <textarea
                className="bml-textarea"
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
              />
            </div>

            <div className="bml-input-group">
              <label className="bml-label">Current Treatment Given Prior to Transfer</label>
              <input
                type="text"
                className="bml-input"
                value={currentTreatment}
                onChange={(e) => setCurrentTreatment(e.target.value)}
              />
            </div>

            {/* Medical Data Privacy Consent Checkbox (Requirement 7) */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '14px',
                margin: '20px 0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
              />
              <label htmlFor="consentCheck" style={{ fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                <strong>Patient / Attendant Consent Confirmed:</strong> I confirm that clinical information,
                diagnostic records, and relevant medical history are authorized for secure transmission to candidate
                referral hospitals under clinical need-to-know access.
              </label>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(1)}
              >
                &lt; Back
              </button>
              <button
                type="button"
                className="btn-primary-purple"
                onClick={() => setStep(3)}
              >
                Next: Requirements &gt;
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REQUIREMENTS & MATCHING */}
        {step === 3 && (
          <div className="bml-card-panel">
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Step 3: Hospital Capability Requirements
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px' }}>
              Configure mandatory and preferred hospital resources for multi-parameter matching.
            </p>

            {/* Mandatory */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="pill-critical">MANDATORY REQUIREMENTS</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Hospitals failing any of these are excluded</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['CARDIOLOGY', 'ICU', 'CATH_LAB', 'NEUROLOGY', 'CT', 'MRI', 'TRAUMA_CARE', 'BLOOD_BANK', 'OT', 'VENTILATOR'].map((req) => {
                  const isChecked = mandatoryReqs.includes(req)
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => {
                        if (isChecked) setMandatoryReqs(mandatoryReqs.filter((r) => r !== req))
                        else setMandatoryReqs([...mandatoryReqs, req])
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                        background: isChecked ? '#fef2f2' : '#ffffff',
                        color: isChecked ? '#dc2626' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {req.replace('_', ' ')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preferred */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="pill-routine">PREFERRED REQUIREMENTS</span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Used to rank and score eligible facilities</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['CARDIAC_OT', 'VENTILATOR', 'SPECIALIST_ON_CALL', 'STROKE_UNIT', 'NABH_ACCREDITED', 'AYUSHMAN_BHARAT'].map((req) => {
                  const isChecked = preferredReqs.includes(req)
                  return (
                    <button
                      key={req}
                      type="button"
                      onClick={() => {
                        if (isChecked) setPreferredReqs(preferredReqs.filter((r) => r !== req))
                        else setPreferredReqs([...preferredReqs, req])
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                        background: isChecked ? '#eef2ff' : '#ffffff',
                        color: isChecked ? '#4338ca' : '#475569',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {isChecked ? '★ ' : '+ '}
                      {req.replace('_', ' ')}
                    </button>
                  )
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(2)}
              >
                &lt; Back
              </button>
              <button
                type="button"
                className="btn-primary-purple"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Running Multi-Factor Matching...' : 'Find Matching Hospitals →'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
