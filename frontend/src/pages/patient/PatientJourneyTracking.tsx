import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

import { api } from '../../services/api.js'
import { useLocalState } from '../../hooks/useLocalState.js'
import { subscribeToTable } from '../../services/realtime.js'

const JOURNEY_STAGES = [
  'AT_HOME', 'REQUESTING_HOSPITAL', 'MATCHED_TO_HOSPITAL_1', 'EN_ROUTE_TO_HOSPITAL_1',
  'ARRIVED_AT_HOSPITAL_1', 'UNDER_CARE', 'REFERRAL_INITIATED', 'TRANSFER_TO_HOSPITAL_2', 'COMPLETED',
]

export default function PatientJourneyTracking() {
  const [journeyId] = useLocalState('demo.journeyId', null)
  const [journey, setJourney] = useState(null)
  const [error, setError] = useState(null)

  async function refresh() {
    if (!journeyId) return
    try {
      const data = await api.getJourney(journeyId)
      setJourney(data)
    } catch {
      setError('Could not load journey')
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    const unsubscribe = subscribeToTable({ table: 'journeys', filter: `journey_id=eq.${journeyId}`, onChange: refresh })
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyId])

  if (!journeyId) return <div className="panel">No active journey yet.</div>
  if (error) return <div className="error-banner">{error}</div>
  if (!journey) return <p>Loading…</p>

  const currentIndex = JOURNEY_STAGES.indexOf(journey.current_status)
  const markers = [journey.stage1_hospital, journey.stage2_hospital].filter(Boolean)

  return (
    <div>
      <h2>Journey Tracking</h2>
      <p className="subtitle">
        Journey <span className="mono">{journeyId}</span> — this status only changes through backend
        state transitions (step 4.9), never inferred from the UI alone.
      </p>

      <div className="stepper">
        {JOURNEY_STAGES.map((stage, i) => (
          <span key={stage} className={i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''}>
            {stage.replaceAll('_', ' ')}
          </span>
        ))}
      </div>

      {markers.length > 0 && (
        <div className="panel">
          <h3>Map</h3>
          <div className="map-wrap">
            <MapContainer center={[markers[0].latitude, markers[0].longitude]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {markers.map((m) => (
                <Marker key={m.id} position={[m.latitude, m.longitude]}>
                  <Popup>{m.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Details</h3>
        {journey.stage1_hospital && <p>Hospital 1: <strong>{journey.stage1_hospital.name}</strong></p>}
        {journey.stage2_hospital && <p>Referred to: <strong>{journey.stage2_hospital.name}</strong></p>}
        {journey.transfer && (
          <p>Transfer status: <span className="badge neutral">{journey.transfer.status}</span></p>
        )}
        {journey.current_status === 'COMPLETED' && (
          <div className="warning-banner" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>
            Journey completed. This coordination request has closed.
          </div>
        )}
      </div>
    </div>
  )
}
