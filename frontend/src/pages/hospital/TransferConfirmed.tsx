import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  CheckCircle,
  Clock,
  Printer,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Ambulance,
  Search,
  Send,
  Check,
  Users
} from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function TransferConfirmed() {
  const { referralId } = useParams<{ referralId?: string }>()
  const { user } = useAuth()
  const [handoffDone, setHandoffDone] = useState(false)
  const [referral, setReferral] = useState<any>(null)

  useEffect(() => {
    if (referralId && referralId !== 'handoff-demo') {
      api.getReferral(referralId).then(setReferral).catch(console.error)
    }
  }, [referralId])

  const handleConfirmHandoff = async () => {
    setHandoffDone(true)
    if (referralId && referralId !== 'handoff-demo') {
      try {
        await api.completeReferralHandoff(referralId, {
          receiving_doctor_name: 'Dr. Sameer Sharma (Cardiology)',
          notes: 'Patient safely received in Fortis Cath Lab. Transfer completed.',
        })
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Top Full-Width Green Banner matching Image 4 */}
      <div
        style={{
          background: '#059669',
          color: '#ffffff',
          padding: '16px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={22} />
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.01em' }}>
            TRANSFER CONFIRMED: {referral?.receiving_hospital_name || referral?.accepted_hospital_name || 'Destination Hospital'} — Bed Reserved
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', fontWeight: 800 }}>
          <span>ETA: 12:45 PM (8 MINS)</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 10px',
              borderRadius: '6px',
              letterSpacing: '0.04em',
            }}
          >
            AMBULANCE #KA-01-M-9283
          </span>
        </div>
      </div>

      <main className="bml-page-content" style={{ marginTop: '20px' }}>
        <div className="bml-two-col-layout">
          {/* Left Column: Digital Handoff Summary */}
          <div className="bml-card-panel" style={{ padding: '28px' }}>
            <div className="bml-panel-title-row">
              <h2 className="bml-panel-title" style={{ fontSize: '18px' }}>
                Digital Handoff Summary
              </h2>
              <button
                onClick={() => window.print()}
                className="btn-secondary"
                style={{ fontSize: '12px', fontWeight: 700 }}
              >
                <Printer size={14} />
                <span>PRINT FOR AMBULANCE</span>
              </button>
            </div>

            {/* Patient Header Box */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '16px',
                  background: '#1e1b4b',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(30, 27, 75, 0.25)',
                }}
              >
                {referral?.patient_name
                  ? referral.patient_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : 'PT'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  PATIENT
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                  {referral?.patient_name || 'Patient'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  {referral?.age ? `${referral.age} Year Old` : 'Age: NA'} {referral?.sex || ''} · UHID: {referral?.uhid || 'NA'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  EMERGENCY TYPE
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>❤️</span> Acute MI (Cardiac)
                </div>
              </div>
            </div>

            {/* Current Treatment & Referring Doctor */}
            <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  CURRENT TREATMENT:{' '}
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                  {referral?.current_treatment || 'Aspirin 300mg, Clopidogrel 300mg, Heparin IV initiated.'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  REFERRING DR.:{' '}
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                  {referral?.referring_doctor_name || 'Dr. Anjali Reyes (Emergency)'}
                </span>
              </div>
            </div>

            {/* 4 Vital Signs Tiles */}
            <div className="bml-vitals-row">
              <div className="bml-vital-box" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
                <span className="bml-vital-label">HEART RATE</span>
                <div>
                  <span className="bml-vital-val">{referral?.patient_vitals?.hr || 112}</span>
                  <span className="bml-vital-unit">bpm</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
                <span className="bml-vital-label">BP (SYS/DIA)</span>
                <div>
                  <span className="bml-vital-val">{referral?.patient_vitals?.bp || '90/60'}</span>
                  <span className="bml-vital-unit">mmHg</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}>
                <span className="bml-vital-label">SPO2</span>
                <div>
                  <span className="bml-vital-val">{referral?.patient_vitals?.spo2 || 92}</span>
                  <span className="bml-vital-unit">%</span>
                </div>
              </div>

              <div className="bml-vital-box" style={{ background: '#f1f5f9', borderColor: '#e2e8f0', color: '#475569' }}>
                <span className="bml-vital-label">TEMP</span>
                <div>
                  <span className="bml-vital-val">{referral?.patient_vitals?.temp || 98.6}</span>
                  <span className="bml-vital-unit">°F</span>
                </div>
              </div>
            </div>

            {/* Relevant Medical History */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <FileText size={15} color="#475569" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Relevant Medical History
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {referral?.medical_history ? (
                  <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                    {referral.medical_history}
                  </span>
                ) : (
                  <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
                    No conditions recorded (NA)
                  </span>
                )}
                {referral?.allergies ? (
                  <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    Allergy: {referral.allergies}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Attached Diagnostic Reports */}
            <div style={{ marginBottom: '26px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <FileText size={15} color="#475569" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Reports &amp; Diagnostic Files
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>ECG_12_Lead_Initial.pdf</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Uploaded 12m ago · 1.2 MB</div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Cardiac_Enzymes_Stat.pdf</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Uploaded 5m ago · 0.8 MB</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Receiving Doctor Signoff Footer Box */}
            <div
              style={{
                background: '#0b1120',
                borderRadius: '14px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'white',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#312e81',
                    border: '2px solid #6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  SS
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    RECEIVING DOCTOR
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800 }}>Dr. Sameer Sharma (Cardiology)</div>
                </div>
              </div>

              <button
                onClick={handleConfirmHandoff}
                disabled={handoffDone}
                style={{
                  background: handoffDone ? '#047857' : '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '11px 22px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: handoffDone ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                }}
              >
                <span>{handoffDone ? 'HANDOFF CONFIRMED' : 'CONFIRM HANDOFF'}</span>
                <Check size={16} />
              </button>
            </div>
          </div>

          {/* Right Column: Referral Audit Trail */}
          <div className="bml-card-panel" style={{ padding: '24px' }}>
            <h2 className="bml-panel-title" style={{ fontSize: '17px', marginBottom: '24px' }}>
              Referral Audit Trail
            </h2>

            <div style={{ position: 'relative', paddingLeft: '28px' }}>
              {/* Vertical timeline line */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: '#e2e8f0',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* 1. Referral Initiated */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    +
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Referral Initiated</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>12:15 PM · By Dr. Reyes</div>
                </div>

                {/* 2. Hospitals Matched */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Search size={12} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Hospitals Matched</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>12:17 PM · 4 matches found</div>
                </div>

                {/* 3. Requests Dispatched */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#4f46e5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Send size={12} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Requests Dispatched</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>12:18 PM · To 3 facilities</div>
                </div>

                {/* 4. Transfer Accepted */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Check size={14} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Transfer Accepted</div>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                    12:22 PM · {referral?.receiving_hospital_name || referral?.accepted_hospital_name || 'Partner Facility'}
                  </div>
                </div>

                {/* 5. Ambulance Dispatched */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Ambulance size={13} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Ambulance Dispatched</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>12:28 PM · #KA-01-M-9283</div>
                </div>

                {/* 6. Handoff Status */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '-28px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: handoffDone ? '#10b981' : '#f1f5f9',
                      border: handoffDone ? 'none' : '2px dashed #94a3b8',
                      color: handoffDone ? 'white' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    <Users size={12} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: handoffDone ? '#047857' : '#64748b' }}>
                    {handoffDone ? 'Handoff Completed' : 'Handoff Pending'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {handoffDone ? 'Signed off by Dr. Sharma' : 'Awaiting arrival'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
