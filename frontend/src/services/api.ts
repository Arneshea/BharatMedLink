import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const client = axios.create({ baseURL: BASE_URL })

export const api = {
  health: () => client.get('/health').then((r) => r.data),
  ready: () => client.get('/ready').then((r) => r.data),

  // Auth endpoints
  authRegister: (body: any) => client.post('/auth/register', body).then((r) => r.data),
  authLogin: (body: any) => client.post('/auth/login', body).then((r) => r.data),
  authDemoUsers: () => client.get('/auth/demo-users').then((r) => r.data),

  // Hospitals
  listHospitals: () => client.get('/hospitals').then((r) => r.data),
  getHospital: (id: string) => client.get(`/hospitals/${id}`).then((r) => r.data),
  getHospitalState: (id: string) => client.get(`/hospitals/${id}/state`).then((r) => r.data),
  getOperationsBoard: (id: string) => client.get(`/hospitals/${id}/operations-board`).then((r) => r.data),
  verifyHospital: (id: string, status: string, adminId?: string) =>
    client.post(`/hospitals/${id}/verify`, { status, admin_id: adminId }).then((r) => r.data),
  getAuditEvents: () => client.get('/admin/audit-events').then((r) => r.data),

  // Patients
  createPatient: (body: any) => client.post('/patients', body).then((r) => r.data),
  getPatient: (id: string) => client.get(`/patients/${id}`).then((r) => r.data),
  createAssessment: (body: any) => client.post('/assessments', body).then((r) => r.data),

  // Journeys & Emergency
  getJourney: (id: string) => client.get(`/journeys/${id}`).then((r) => r.data),
  getPatientActiveJourney: (patientId: string) => client.get(`/patients/${patientId}/active-journey`).then((r) => r.data),
  markEnRoute: (id: string) => client.post(`/journeys/${id}/mark-en-route`).then((r) => r.data),
  markArrived: (id: string) => client.post(`/journeys/${id}/mark-arrived`).then((r) => r.data),
  markUnderCare: (id: string) => client.post(`/journeys/${id}/mark-under-care`).then((r) => r.data),
  emergencyDispatch: (body: any) => client.post('/emergency-dispatch', body).then((r) => r.data),

  // Core Hospital-to-Hospital Referrals
  aiAssist: (notes: string) => client.post('/referrals/ai-assist', { notes }).then((r) => r.data),
  parseReferralDocument: (body: any) => client.post('/referrals/parse-document', body).then((r) => r.data),
  createReferral: (body: any) => client.post('/referrals', body).then((r) => r.data),
  getReferral: (id: string) => client.get(`/referrals/${id}`).then((r) => r.data),
  sendReferralRequest: (id: string, hospitalId: string) =>
    client.post(`/referrals/${id}/send-request`, { hospital_id: hospitalId }).then((r) => r.data),
  acceptReferral: (id: string, hospitalId: string, notes?: string) =>
    client.post(`/referrals/${id}/accept`, { hospital_id: hospitalId, notes }).then((r) => r.data),
  declineReferral: (id: string, hospitalId: string, reason?: string, detail?: string) =>
    client.post(`/referrals/${id}/decline`, { hospital_id: hospitalId, reason, detail }).then((r) => r.data),
  completeReferralHandoff: (id: string, body: any) =>
    client.post(`/referrals/${id}/handoff`, body).then((r) => r.data),

  // Legacy Stage-1 & transfers
  createPatientRequest: (body: any) => client.post('/patient-requests', body).then((r) => r.data),
  getPatientRequest: (id: string) => client.get(`/patient-requests/${id}`).then((r) => r.data),
  listHospitalRequestResponses: (hospitalId: string) => client.get(`/hospitals/${hospitalId}/patient-request-responses`).then((r) => r.data),
  acceptResponse: (responseId: string) => client.post(`/patient-request-responses/${responseId}/accept`).then((r) => r.data),
  declineResponse: (responseId: string, reason: string) => client.post(`/patient-request-responses/${responseId}/decline`, { reason }).then((r) => r.data),
  selectHospital: (requestId: string, hospitalId: string) => client.post(`/patient-requests/${requestId}/select`, { hospital_id: hospitalId }).then((r) => r.data),
  confirmSelection: (responseId: string, stillEligible: boolean) => client.post(`/patient-request-responses/${responseId}/confirm`, { still_eligible: stillEligible }).then((r) => r.data),
  cancelRequest: (requestId: string) => client.post(`/patient-requests/${requestId}/cancel`).then((r) => r.data),
  startTransfer: (transferId: string) => client.post(`/transfers/${transferId}/start`).then((r) => r.data),
  markReceived: (transferId: string) => client.post(`/transfers/${transferId}/received`).then((r) => r.data),
  completeHandoff: (transferId: string, body: any) => client.post(`/handoffs/${transferId}/complete`, body).then((r) => r.data),
  getNotifications: (params: { user_id?: string; role?: string; hospital_id?: string }) =>
    client.get('/notifications', { params }).then((r) => r.data),

  // Simulator
  simulatorSetHospitalState: (body: any, token: string) =>
    client
      .post('/simulator/hospital-state', body, { headers: { 'X-Demo-Admin-Token': token } })
      .then((r) => r.data),
  simulatorNetworkOverview: (token: string) =>
    client.get('/simulator/network-overview', { headers: { 'X-Demo-Admin-Token': token } }).then((r) => r.data),
}
