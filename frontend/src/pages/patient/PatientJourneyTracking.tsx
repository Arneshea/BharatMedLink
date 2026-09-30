import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  MapPin,
  Building2,
  Ambulance,
  CheckCircle2,
  Clock,
  Phone,
  ShieldCheck,
  ArrowRight,
  Navigation
} from 'lucide-react'

import { api } from '../../services/api'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuth } from '../../context/AuthContext'
import { subscribeToTable } from '../../services/realtime'

// Fix Leaflet default marker icons broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const patientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const JOURNEY_STAGES = [
  'AT_HOME',
  'REQUESTING_HOSPITAL',
  'MATCHED_TO_HOSPITAL_1',
  'EN_ROUTE_TO_HOSPITAL_1',
  'ARRIVED_AT_HOSPITAL_1',
  'UNDER_CARE',
  'REFERRAL_INITIATED',
  'TRANSFER_TO_HOSPITAL_2',
  'COMPLETED',
]

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(coords, { padding: [50, 50] })
    } else if (coords.length === 1) {
      map.setView(coords[0], 13)
    }
  }, [coords, map])
  return null
}

export default function PatientJourneyTracking() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [localJourneyId] = useLocalState('demo.journeyId', null)
  const [localPatientLat] = useLocalState('demo.patientLat', null)
  const [localPatientLon] = useLocalState('demo.patientLon', null)
  const [transportMode] = useLocalState('demo.transportMode', null)

  const activeJourneyId = searchParams.get('journey_id') || localJourneyId

  const [journey, setJourney] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const routeFetchedFor = useRef<string | null>(null)

  async function loadData() {
    try {
      if (activeJourneyId) {
        const data = await api.getJourney(activeJourneyId)
        setJourney(data)
      } else if (user?.id) {
        const activeData = await api.getPatientActiveJourney(user.id)
        if (activeData && !activeData.error) {
          setJourney(activeData)
        }
      }
    } catch {
      setError('Could not load journey data')
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    const effectiveId = activeJourneyId || journey?.journey_id
    let unsubscribe: () => void = () => {}
    if (effectiveId) {
      unsubscribe = subscribeToTable({
        table: 'journeys',
        filter: `journey_id=eq.${effectiveId}`,
        onChange: loadData,
      })
    }
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [activeJourneyId, journey?.journey_id])

  const effectiveLat = journey?.patient_location?.latitude ?? localPatientLat ?? 28.6139
  const effectiveLon = journey?.patient_location?.longitude ?? localPatientLon ?? 77.2090
  const destination = journey?.stage2_hospital || journey?.stage1_hospital

  // Calculate route using OSRM
  useEffect(() => {
    if (!destination || !destination.latitude || !destination.longitude) return
    const cacheKey = `${effectiveLat},${effectiveLon}->${destination.latitude},${destination.longitude}`
    if (routeFetchedFor.current === cacheKey) return
    routeFetchedFor.current = cacheKey

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${effectiveLon},${effectiveLat};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`

    fetch(osrmUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          )
          setRouteCoords(coords)
        }
      })
      .catch(() => {
        // Straight line fallback
        setRouteCoords([
          [effectiveLat, effectiveLon],
          [destination.latitude, destination.longitude],
        ])
      })
  }, [destination, effectiveLat, effectiveLon])

  if (!activeJourneyId && !journey) {
    return (
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#64748b' }}>
          <Navigation size={28} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>No Active Journey Underway</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>
          When you enter symptoms or an emergency request is accepted, your live navigation route, hospital details, and ETA will stream here.
        </p>
        <Link
          to="/patient/assessment"
          style={{
            background: '#4f46e5',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Enter Symptoms</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  if (error) return <div className="error-banner" style={{ margin: '24px 36px' }}>{error}</div>
  if (!journey) return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading active journey…</div>

  const currentIndex = JOURNEY_STAGES.indexOf(journey.current_status)
  const distKm = destination && effectiveLat && effectiveLon
    ? Math.max(1, haversineKm(effectiveLat, effectiveLon, destination.latitude, destination.longitude))
    : 0
  const etaMins = Math.max(5, Math.round(distKm * 2.2))

  const allMapCoords: [number, number][] = routeCoords.length > 0
    ? routeCoords
    : [
        [effectiveLat, effectiveLon],
        ...(destination ? [[destination.latitude, destination.longitude] as [number, number]] : []),
      ]

  const mapCenter: [number, number] = allMapCoords[0] || [28.6139, 77.2090]

  return (
    <div style={{ padding: '28px 36px 60px', maxWidth: '1240px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            BHARATMEDLINK · LIVE EMERGENCY NAVIGATION
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '4px 0 0' }}>
            Active Journey Tracking
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
            Destination: <strong style={{ color: '#0f172a' }}>{destination?.name || 'Assigned Hospital'}</strong> · Status: <span className="pill-accepted">{journey.current_status.replaceAll('_', ' ')}</span>
          </div>
        </div>

        {destination?.phone && (
          <a
            href={`tel:${destination.phone}`}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#0f172a',
              padding: '10px 18px',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <Phone size={16} color="#059669" />
            <span>Call {destination.name}</span>
          </a>
        )}
      </div>

      {/* Dynamic Route Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: '#ffffff', border: '1.5px solid #e0e7ff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Destination Facility
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {destination?.name || 'Awaiting Match'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {destination?.address || 'Address pending confirmation'}
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e0e7ff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Estimated Travel Time
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5', marginTop: '2px' }}>
            {destination ? `~${etaMins} mins` : 'Calculating…'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Direct highway route
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e0e7ff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Distance to Hospital
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
            {destination ? `${distKm} km` : 'Calculating…'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Real-time GPS coordinates
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e0e7ff', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.05)' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
            Hospital Preparedness
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={18} />
            <span>Intake Slot Reserved</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Staff notified of your arrival
          </div>
        </div>
      </div>

      {/* Stepper Progression */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          gap: '12px',
        }}
      >
        {JOURNEY_STAGES.slice(0, 6).map((stage, i) => {
          const isDone = i < currentIndex
          const isActive = i === currentIndex
          return (
            <div
              key={stage}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: isActive ? '#4f46e5' : isDone ? '#059669' : '#94a3b8',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isActive ? '#4f46e5' : isDone ? '#ecfdf5' : '#f1f5f9',
                  color: isActive ? '#ffffff' : isDone ? '#059669' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: isDone ? '1.5px solid #a7f3d0' : undefined,
                }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>{stage.replaceAll('_', ' ')}</span>
              {i < 5 && <span style={{ color: '#cbd5e1', marginLeft: '8px' }}>→</span>}
            </div>
          )
        })}
      </div>

      {/* Live Map Panel */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="#4f46e5" />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Live GPS Route to {destination?.name || 'Destination'}
            </h3>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Dynamic OpenStreetMap navigation · {distKm} km route
          </div>
        </div>

        <div style={{ height: '520px', width: '100%', position: 'relative' }}>
          <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <FitBounds coords={allMapCoords} />

            {/* Patient Marker */}
            {effectiveLat && effectiveLon && (
              <Marker position={[effectiveLat, effectiveLon]} icon={patientIcon}>
                <Popup>
                  <strong>📍 Your Current Location</strong>
                  <br />
                  Emergency origin coordinates
                </Popup>
              </Marker>
            )}

            {/* Destination Hospital Marker */}
            {destination && destination.latitude && destination.longitude && (
              <Marker position={[destination.latitude, destination.longitude]} icon={hospitalIcon}>
                <Popup>
                  <strong>🏥 {destination.name}</strong>
                  <br />
                  {destination.address || 'Receiving Hospital'}
                  <br />
                  ETA: ~{etaMins} mins ({distKm} km)
                </Popup>
              </Marker>
            )}

            {/* Route Polyline */}
            {routeCoords.length > 0 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.85 }}
              />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)))
}
