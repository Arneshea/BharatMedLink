import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../services/api.js'
import { useLocalState } from '../hooks/useLocalState.js'

/**
 * No form, no triage questions — a single tap dispatches the nearest
 * capable hospital's ambulance. Geolocation is read automatically;
 * if the browser denies/lacks it, a fixed fallback location is used
 * so the button never simply fails to do anything in a demo setting.
 * Real deployment would require a reliable location source before
 * dispatch — see docs/PROTOTYPE_LIMITATIONS.md.
 */
export default function EmergencyButton() {
  const [patientId] = useLocalState('demo.patientId', null)
  const [, setJourneyId] = useLocalState('demo.journeyId', null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  function getLocation() {
    return new Promise<{ lat: number; lon: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: 28.6139, lon: 77.209 }) // demo fallback
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve({ lat: 28.6139, lon: 77.209 }),
        { timeout: 4000 }
      )
    })
  }

  async function handleClick() {
    if (busy) return
    setBusy(true)
    try {
      const loc = await getLocation()
      const result = await api.emergencyDispatch({
        patient_id: patientId || undefined,
        location_lat: loc.lat,
        location_lon: loc.lon,
      })
      setJourneyId(result.journey_id)
      navigate('/patient/emergency-status', { state: result })
    } catch (err) {
      navigate('/patient/emergency-status', {
        state: { status: 'ERROR', warning: 'Could not reach the dispatch service. Call your local emergency number now.' },
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button className="emergency-button" onClick={handleClick} disabled={busy}>
      <span className="dot" />
      {busy ? 'Dispatching…' : 'Emergency — Dispatch Ambulance'}
    </button>
  )
}
