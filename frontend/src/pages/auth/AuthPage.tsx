import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { HeartPulse, User, Building2, ShieldCheck, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { useAuth, UserRole } from '../../context/AuthContext'
import { api } from '../../services/api'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [role, setRole] = useState<UserRole>('HOSPITAL_STAFF')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Hospital options from database
  const [hospitals, setHospitals] = useState<any[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('')

  // Shared fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Patient fields (none are forced/invented)
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [medications, setMedications] = useState('')
  const [surgeries, setSurgeries] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  // Hospital Staff fields
  const [designation, setDesignation] = useState('')
  const [department, setDepartment] = useState('Emergency Medicine')
  const [newHospitalName, setNewHospitalName] = useState('')
  const [hospitalType, setHospitalType] = useState('Tertiary Referral Center')
  const [hospitalAddress, setHospitalAddress] = useState('')
  const [totalBeds, setTotalBeds] = useState('')
  const [availableBeds, setAvailableBeds] = useState('')
  const [bedOccupancy, setBedOccupancy] = useState('')
  const [icuBeds, setIcuBeds] = useState('')
  const [facilities, setFacilities] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // Admin fields
  const [organization, setOrganization] = useState('')
  const [permissions, setPermissions] = useState('Full Administrative Access (Hospitals, Verifications, Audit)')

  useEffect(() => {
    // Load available hospitals for the dropdown
    api.listHospitals()
      .then((data) => {
        if (Array.isArray(data)) {
          setHospitals(data)
          // Default to first registered hospital if available
          const firstReg = data.find((h) => h.is_verified)
          if (firstReg) {
            setSelectedHospitalId(firstReg.id)
          } else if (data.length > 0) {
            setSelectedHospitalId(data[0].id)
          } else {
            setSelectedHospitalId('NEW_OR_OTHER')
          }
        }
      })
      .catch((err) => console.error('Failed to load hospitals:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const u = await login(email, role)
        if (u.role === 'HOSPITAL_STAFF') navigate('/hospital')
        else if (u.role === 'NETWORK_ADMIN') navigate('/admin')
        else navigate('/patient')
      } else {
        const payload: any = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }

        if (role === 'PATIENT') {
          // Send actual values or undefined/null - never invent values (Requirement 4)
          payload.age = age.trim() ? parseInt(age) : null
          payload.gender = gender || null
          payload.blood_group = bloodGroup || null
          payload.allergies = allergies.trim() || null
          payload.medical_history = medicalHistory.trim() || null
          payload.current_medications = medications.trim() || null
          payload.previous_surgeries = surgeries.trim() || null
          payload.emergency_contact_name = emergencyContactName.trim() || null
          payload.emergency_contact_phone = emergencyContactPhone.trim() || null
        } else if (role === 'HOSPITAL_STAFF') {
          payload.designation = designation.trim() || 'Staff Physician'
          payload.department = department.trim() || 'Emergency Medicine'

          if (selectedHospitalId === 'NEW_OR_OTHER' || !selectedHospitalId) {
            // New / Unregistered hospital registration (Requirement 1 & 5)
            if (!newHospitalName.trim()) {
              setError('Please enter the Hospital Name for first-time registration.')
              setLoading(false)
              return
            }
            payload.hospital_id = 'NEW_OR_OTHER'
            payload.hospital_name = newHospitalName.trim()
            payload.hospital_type = hospitalType
            payload.address = hospitalAddress.trim() || null
            payload.total_beds = totalBeds.trim() ? parseInt(totalBeds) : null
            payload.available_beds = availableBeds.trim() ? parseInt(availableBeds) : null
            payload.occupied_beds = bedOccupancy.trim() ? parseInt(bedOccupancy) : null
            payload.icu_info = icuBeds.trim() || null
            payload.facilities = facilities.trim() || null
            payload.emergency_phone = emergencyPhone.trim() || null
          } else {
            // Selected existing hospital from system dropdown
            payload.hospital_id = selectedHospitalId
            const found = hospitals.find((h) => h.id === selectedHospitalId)
            if (found) {
              payload.hospital_name = found.name
            }
          }
        } else if (role === 'NETWORK_ADMIN') {
          payload.organization = organization.trim() || 'National Health Authority'
          payload.permissions = [permissions]
        }

        const u = await register(payload)
        if (u.role === 'HOSPITAL_STAFF') navigate('/hospital')
        else if (u.role === 'NETWORK_ADMIN') navigate('/admin')
        else navigate('/patient')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Authentication error')
    } finally {
      setLoading(false)
    }
  }

  const selectedHospitalObj = hospitals.find((h) => h.id === selectedHospitalId)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1120',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
      }}
    >
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Link to="/login" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <HeartPulse size={26} />
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>BharatMedLink</span>
        </Link>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>
          National Patient Navigation &amp; Inter-Facility Referral Coordination Network
        </div>
      </div>

      {/* Main Auth Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '20px',
          color: '#0f172a',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Login / Signup Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'login' ? '3px solid #4f46e5' : 'none',
              color: mode === 'login' ? '#4f46e5' : '#64748b',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError('') }}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              borderBottom: mode === 'signup' ? '3px solid #4f46e5' : 'none',
              color: mode === 'signup' ? '#4f46e5' : '#64748b',
              fontWeight: 800,
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Role Selector Tabs (Patient, Hospital Staff, Admin) */}
        <div style={{ marginBottom: '22px' }}>
          <label className="bml-label" style={{ color: '#64748b', marginBottom: '8px' }}>
            {mode === 'login' ? 'Select Role to Log In' : 'Account Type'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setRole('HOSPITAL_STAFF')}
              style={{
                padding: '10px 8px',
                borderRadius: '10px',
                border: role === 'HOSPITAL_STAFF' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                background: role === 'HOSPITAL_STAFF' ? '#eef2ff' : '#f8fafc',
                color: role === 'HOSPITAL_STAFF' ? '#4338ca' : '#475569',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Building2 size={16} />
              <span>Hospital Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('PATIENT')}
              style={{
                padding: '10px 8px',
                borderRadius: '10px',
                border: role === 'PATIENT' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                background: role === 'PATIENT' ? '#eef2ff' : '#f8fafc',
                color: role === 'PATIENT' ? '#4338ca' : '#475569',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <User size={16} />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('NETWORK_ADMIN')}
              style={{
                padding: '10px 8px',
                borderRadius: '10px',
                border: role === 'NETWORK_ADMIN' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                background: role === 'NETWORK_ADMIN' ? '#eef2ff' : '#f8fafc',
                color: role === 'NETWORK_ADMIN' ? '#4338ca' : '#475569',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={16} />
              <span>Network Admin</span>
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="bml-input-group">
              <label className="bml-label">Full Name *</label>
              <input
                type="text"
                className="bml-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'HOSPITAL_STAFF' ? 'e.g. Dr. Anjali Sharma' : 'e.g. Guneet Chhabra'}
              />
            </div>
          )}

          <div className="bml-input-group">
            <label className="bml-label">Email Address *</label>
            <input
              type="email"
              className="bml-input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === 'HOSPITAL_STAFF' ? 'doctor@hospital.org' : 'name@example.com'}
            />
          </div>

          <div className="bml-input-group">
            <label className="bml-label">Password *</label>
            <input
              type="password"
              className="bml-input"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Role-specific Signup Fields */}
          {mode === 'signup' && role === 'PATIENT' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '4px' }}>
                Patient Medical &amp; Emergency Profile (Optional)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
                Unfilled fields will be recorded as "NA" — information is never assumed or fabricated.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label className="bml-label" style={{ fontSize: '11px' }}>Age (Optional)</label>
                  <input
                    type="number"
                    className="bml-input"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="NA"
                  />
                </div>
                <div>
                  <label className="bml-label" style={{ fontSize: '11px' }}>Gender (Optional)</label>
                  <select className="bml-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="bml-label" style={{ fontSize: '11px' }}>Blood Group (Optional)</label>
                  <select className="bml-input" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                    <option value="">NA / Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Emergency Contact (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    className="bml-input"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Contact Name (or NA)"
                  />
                  <input
                    type="text"
                    className="bml-input"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="Phone (or NA)"
                  />
                </div>
              </div>

              <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Known Allergies (Optional)</label>
                <input
                  type="text"
                  className="bml-input"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Sulfa (Leave empty for NA)"
                />
              </div>

              <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Medical History &amp; Chronic Diseases (Optional)</label>
                <input
                  type="text"
                  className="bml-input"
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="e.g. Hypertension, Diabetes (Leave empty for NA)"
                />
              </div>

              <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Current Medications (Optional)</label>
                <input
                  type="text"
                  className="bml-input"
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Aspirin 75mg OD (Leave empty for NA)"
                />
              </div>

              <div className="bml-input-group" style={{ marginBottom: '0' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Previous Surgeries (Optional)</label>
                <input
                  type="text"
                  className="bml-input"
                  value={surgeries}
                  onChange={(e) => setSurgeries(e.target.value)}
                  placeholder="Leave empty for NA"
                />
              </div>
            </div>
          )}

          {/* Hospital Staff Signup Fields (Requirement 1, 5, 6) */}
          {mode === 'signup' && role === 'HOSPITAL_STAFF' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '12px' }}>
                Hospital Affiliation &amp; Facility Details
              </div>

              <div className="bml-input-group" style={{ marginBottom: '12px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Staff Designation *</label>
                <input
                  type="text"
                  className="bml-input"
                  required
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Chief Medical Officer, Emergency Physician, Referral Incharge"
                />
              </div>

              {/* Requirement 1 & 6: Hospital Dropdown with Registered vs Not Registered */}
              <div className="bml-input-group" style={{ marginBottom: '14px' }}>
                <label className="bml-label" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hospital Facility *</span>
                  <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700 }}>Select existing or register new</span>
                </label>
                <select
                  className="bml-input"
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <optgroup label="Available Hospitals in Network">
                    {hospitals.map((h) => {
                      const isReg = h.is_verified && h.verification_status === 'VERIFIED'
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} {isReg ? '— [Registered]' : '— [Not Registered]'}
                        </option>
                      )
                    })}
                  </optgroup>
                  <optgroup label="Other Facility">
                    <option value="NEW_OR_OTHER">+ Other / Not Registered (Register New Hospital)</option>
                  </optgroup>
                </select>

                {selectedHospitalObj && (
                  <div style={{ fontSize: '11px', marginTop: '6px', color: selectedHospitalObj.is_verified ? '#059669' : '#d97706', fontWeight: 600 }}>
                    {selectedHospitalObj.is_verified
                      ? '✓ Registered & active emergency facility'
                      : '⚠ Unregistered hospital — requires administrative verification before live routing'}
                  </div>
                )}
              </div>

              {/* If "Other / Not Registered" is selected, provide full hospital registration form (Requirement 5) */}
              {selectedHospitalId === 'NEW_OR_OTHER' && (
                <div style={{ background: '#ffffff', border: '1.5px dashed #6366f1', borderRadius: '10px', padding: '14px', marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#4338ca', marginBottom: '8px' }}>
                    First-Time Hospital Registration Form
                  </div>

                  <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                    <label className="bml-label" style={{ fontSize: '10px' }}>Hospital Name *</label>
                    <input
                      type="text"
                      className="bml-input"
                      required
                      value={newHospitalName}
                      onChange={(e) => setNewHospitalName(e.target.value)}
                      placeholder="e.g. AIIMS New Delhi / Apex Hospital"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>Hospital Type</label>
                      <select className="bml-input" value={hospitalType} onChange={(e) => setHospitalType(e.target.value)}>
                        <option value="TERTIARY_INSTITUTE">Premier Tertiary Institute</option>
                        <option value="TERTIARY_CARDIAC_HUB">Tertiary Cardiac Hub</option>
                        <option value="COMPREHENSIVE_STROKE_CENTER">Comprehensive Stroke Center</option>
                        <option value="LEVEL_1_TRAUMA_CARDIAC">Level-1 Trauma &amp; Cardiac</option>
                        <option value="MULTI_SPECIALTY">Multi-Specialty Hospital</option>
                        <option value="COMMUNITY_HEALTH_CENTER">Community Health Center</option>
                      </select>
                    </div>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>City / Region</label>
                      <input
                        type="text"
                        className="bml-input"
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                        placeholder="e.g. Ansari Nagar, New Delhi"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>Total Beds (or NA)</label>
                      <input
                        type="number"
                        className="bml-input"
                        value={totalBeds}
                        onChange={(e) => setTotalBeds(e.target.value)}
                        placeholder="NA"
                      />
                    </div>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>Available Beds (or NA)</label>
                      <input
                        type="number"
                        className="bml-input"
                        value={availableBeds}
                        onChange={(e) => setAvailableBeds(e.target.value)}
                        placeholder="NA"
                      />
                    </div>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>Occupied Beds (or NA)</label>
                      <input
                        type="number"
                        className="bml-input"
                        value={bedOccupancy}
                        onChange={(e) => setBedOccupancy(e.target.value)}
                        placeholder="NA"
                      />
                    </div>
                  </div>

                  <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                    <label className="bml-label" style={{ fontSize: '10px' }}>Emergency Facilities &amp; Equipment (Optional)</label>
                    <input
                      type="text"
                      className="bml-input"
                      value={facilities}
                      onChange={(e) => setFacilities(e.target.value)}
                      placeholder="e.g. EMERGENCY, ICU, CARDIOLOGY, CATH_LAB, CT, MRI"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>ICU Beds / Capacity (or NA)</label>
                      <input
                        type="text"
                        className="bml-input"
                        value={icuBeds}
                        onChange={(e) => setIcuBeds(e.target.value)}
                        placeholder="e.g. 12 ICU Beds (or NA)"
                      />
                    </div>
                    <div>
                      <label className="bml-label" style={{ fontSize: '10px' }}>Emergency Hotline Phone</label>
                      <input
                        type="text"
                        className="bml-input"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        placeholder="e.g. 011-26593201"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && role === 'NETWORK_ADMIN' && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '12px' }}>
                Administrative Organization Details
              </div>

              <div className="bml-input-group" style={{ marginBottom: '10px' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Organization / Regulatory Body *</label>
                <input
                  type="text"
                  className="bml-input"
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Directorate General of Health Services / State Health Mission"
                />
              </div>

              <div className="bml-input-group" style={{ marginBottom: '0' }}>
                <label className="bml-label" style={{ fontSize: '11px' }}>Administrative Permissions</label>
                <input
                  type="text"
                  className="bml-input"
                  value={permissions}
                  onChange={(e) => setPermissions(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary-purple"
            style={{ width: '100%', height: '48px', justifyContent: 'center' }}
            disabled={loading}
          >
            <span>{loading ? 'Please wait...' : mode === 'signup' ? 'Complete Registration' : 'Log In to System'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Clear Navigation from Login -> Patient Signup / Hospital Worker Signup (Requirement 8) */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
          {mode === 'login' ? (
            <div>
              <div style={{ marginBottom: '8px', fontWeight: 600 }}>Don't have an account yet? Sign up as:</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setRole('PATIENT'); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                >
                  Patient Signup →
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setRole('HOSPITAL_STAFF'); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                >
                  Hospital Worker Signup →
                </button>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setRole('NETWORK_ADMIN'); setError('') }}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', fontSize: '13px' }}
                >
                  Admin Signup →
                </button>
              </div>
            </div>
          ) : (
            <div>
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', padding: 0 }}
              >
                Return to Log In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
