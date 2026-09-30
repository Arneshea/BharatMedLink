import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Plus, Radio, Shield, Bell, Ambulance } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface AppTopHeaderProps {
  title?: string
  showEmergencyButton?: boolean
}

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  title,
  showEmergencyButton = true,
}) => {
  const { user } = useAuth()
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }))
      setDateStr(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const role = user?.role || 'HOSPITAL_STAFF'

  const defaultFacilityName =
    role === 'PATIENT'
      ? 'BharatMedLink Patient Portal'
      : role === 'NETWORK_ADMIN'
      ? 'National Emergency Referral Center'
      : user?.hospital_name || 'Emergency Network Facility'

  return (
    <header className="bml-top-header">
      <div className="bml-header-facility">
        <div>
          <div className="bml-facility-badge">
            {role === 'PATIENT' ? 'PORTAL' : role === 'NETWORK_ADMIN' ? 'COMMAND CENTER' : 'FACILITY'}
          </div>
          <div className="bml-facility-name">
            {title || defaultFacilityName}
            <span className="bml-badge-online">Online</span>
          </div>
        </div>

        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 8px' }} />

        <div className="bml-clock-widget">
          <Clock size={14} />
          <span>{timeStr}</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span>{dateStr}</span>
        </div>
      </div>

      <div className="bml-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Notifications Bell Link */}
        <Link
          to="/notifications"
          title="View Notifications"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: '#f1f5f9',
            color: '#475569',
            textDecoration: 'none',
            border: '1px solid #e2e8f0',
          }}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              border: '1.5px solid #ffffff',
            }}
          />
        </Link>

        {/* Role-Specific Actions */}
        {role === 'HOSPITAL_STAFF' && showEmergencyButton && (
          <Link to="/referral/new" className="btn-emergency-referral">
            <Plus size={16} strokeWidth={3} />
            <span>CREATE EMERGENCY REFERRAL</span>
          </Link>
        )}

        {role === 'PATIENT' && (
          <Link
            to="/patient/emergency-status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ef4444',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '9px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
            }}
          >
            <Ambulance size={16} />
            <span>108 EMERGENCY DISPATCH</span>
          </Link>
        )}

        {role === 'NETWORK_ADMIN' && (
          <span
            style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ● NETWORK MONITORING ACTIVE
          </span>
        )}
      </div>
    </header>
  )
}
