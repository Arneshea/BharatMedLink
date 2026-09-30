import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RootLayout from './layouts/RootLayout'

// Core Flow Pages (matching uploaded UI mockups)
import HospitalDashboard from './pages/hospital/HospitalDashboard'
import InitiateReferral from './pages/hospital/InitiateReferral'
import HospitalMatching from './pages/hospital/HospitalMatching'
import TransferConfirmed from './pages/hospital/TransferConfirmed'
import NetworkOverview from './pages/admin/NetworkOverview'
import AuthPage from './pages/auth/AuthPage'
import NotificationsPage from './pages/NotificationsPage'

// Preserved & Secondary Pages
import PatientDashboard from './pages/patient/PatientDashboard'
import PatientHome from './pages/patient/PatientHome'
import PatientAssessment from './pages/patient/PatientAssessment'
import PatientHospitalOptions from './pages/patient/PatientHospitalOptions'
import PatientJourneyTracking from './pages/patient/PatientJourneyTracking'
import PatientReferral from './pages/patient/PatientReferral'
import EmergencyStatus from './pages/patient/EmergencyStatus'
import EmergencyCountdown from './pages/patient/EmergencyCountdown'
import Simulator from './pages/admin/Simulator'
import LiveEvents from './pages/admin/LiveEvents'
import ReferralDetail from './pages/hospital/ReferralDetail'

// Guard that ensures user is authenticated; otherwise redirects straight to /login
const RequireAuth: React.FC<{ allowedRoles?: string[] }> = ({ allowedRoles }) => {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'PATIENT') return <Navigate to="/patient" replace />
    if (user.role === 'NETWORK_ADMIN') return <Navigate to="/admin" replace />
    return <Navigate to="/hospital" replace />
  }
  return <RootLayout />
}

// Root redirect always takes user to the Login page by default (Requirement 8)
const RoleLandingRedirect: React.FC = () => {
  return <Navigate to="/login" replace />
}

// Public Auth route handler renders the Login / Signup page
const PublicAuthRoute: React.FC = () => {
  return <AuthPage />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth / Login / Signup Routes */}
        <Route path="/login" element={<PublicAuthRoute />} />
        <Route path="/auth" element={<PublicAuthRoute />} />
        <Route path="/signup" element={<PublicAuthRoute />} />

        {/* Root Redirect */}
        <Route path="/" element={<RoleLandingRedirect />} />

        {/* Doctor & Hospital Staff Routes Only */}
        <Route element={<RequireAuth allowedRoles={['HOSPITAL_STAFF']} />}>
          <Route path="/hospital" element={<HospitalDashboard />} />
          <Route path="/hospital/referral/:referralId" element={<ReferralDetail />} />
          <Route path="/referral/new" element={<InitiateReferral />} />
          <Route path="/referral/:referralId/matches" element={<HospitalMatching />} />
          <Route path="/referral/matching-demo" element={<HospitalMatching />} />
          <Route path="/referral/:referralId/handoff" element={<TransferConfirmed />} />
          <Route path="/referral/handoff-demo" element={<TransferConfirmed />} />
        </Route>

        {/* Patient Routes Only */}
        <Route element={<RequireAuth allowedRoles={['PATIENT']} />}>
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/patient/home" element={<PatientHome />} />
          <Route path="/patient/assessment" element={<PatientAssessment />} />
          <Route path="/patient/options" element={<PatientHospitalOptions />} />
          <Route path="/patient/journey" element={<PatientJourneyTracking />} />
          <Route path="/patient/referral" element={<PatientReferral />} />
          <Route path="/patient/emergency-status" element={<EmergencyStatus />} />
          <Route path="/patient/emergency-countdown" element={<EmergencyCountdown />} />
        </Route>

        {/* Network Admin Routes Only */}
        <Route element={<RequireAuth allowedRoles={['NETWORK_ADMIN']} />}>
          <Route path="/admin" element={<NetworkOverview />} />
          <Route path="/admin/network" element={<NetworkOverview />} />
          <Route path="/admin/events" element={<LiveEvents />} />
          <Route path="/admin/simulator" element={<Simulator />} />
        </Route>

        {/* Common Authenticated Routes (Accessible by all roles) */}
        <Route element={<RequireAuth />}>
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RoleLandingRedirect />} />
      </Routes>
    </AuthProvider>
  )
}
