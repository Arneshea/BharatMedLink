import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Ambulance,
  Building2,
  FileCheck2,
  ShieldAlert,
  ArrowRight,
  Clock,
  Trash2,
  CheckCircle2,
  Activity,
  RefreshCw,
  Sparkles,
  Inbox
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AppTopHeader } from '../components/AppTopHeader'
import { api } from '../services/api'

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  category: 'URGENT' | 'TRANSFER' | 'VERIFICATION' | 'SYSTEM' | 'INFO'
  unread: boolean
  link?: string
  actionLabel?: string
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const role = user?.role || 'HOSPITAL_STAFF'

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'URGENT' | 'TRANSFERS'>('ALL')

  const fetchNotifications = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    try {
      const resp = await api.getNotifications({
        user_id: user?.id,
        role: user?.role || 'PATIENT',
        hospital_id: user?.hospital_id,
      })
      if (resp && Array.isArray(resp.notifications)) {
        setNotifications(resp.notifications)
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }, [user?.id, user?.role, user?.hospital_id])

  useEffect(() => {
    fetchNotifications()
    // Poll every 10 seconds for real-time updates
    const interval = setInterval(() => fetchNotifications(), 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = () => {
    const allIds = new Set(readIds)
    notifications.forEach((n) => allIds.add(n.id))
    setReadIds(allIds)
  }

  const handleToggleRead = (id: string, defaultUnread: boolean) => {
    const next = new Set(readIds)
    const isCurrentlyRead = next.has(id) || !defaultUnread
    if (isCurrentlyRead) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setReadIds(next)
  }

  const handleDelete = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  // Filter out dismissed
  const visible = notifications.filter((n) => !dismissedIds.has(n.id))

  const isUnread = (item: NotificationItem) => {
    if (readIds.has(item.id)) return false
    return item.unread !== false
  }

  const filtered = visible.filter((n) => {
    const unread = isUnread(n)
    if (filter === 'UNREAD') return unread
    if (filter === 'URGENT') return n.category === 'URGENT'
    if (filter === 'TRANSFERS') return n.category === 'TRANSFER'
    return true
  })

  const unreadCount = visible.filter((n) => isUnread(n)).length

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'URGENT':
        return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
      case 'TRANSFER':
        return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }
      case 'VERIFICATION':
        return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
      case 'SYSTEM':
        return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }
    }
  }

  const getRoleHeaderInfo = () => {
    if (role === 'PATIENT') {
      return {
        badge: 'PATIENT FEED',
        title: 'My Medical Alerts & Updates',
        desc: 'Personal updates for your emergency requests, ambulance tracking, and hospital acceptances.',
        emptyDesc: 'No notifications right now. When you submit symptoms or request an emergency ambulance dispatch, live updates and responses will appear here.',
      }
    } else if (role === 'NETWORK_ADMIN') {
      return {
        badge: 'NETWORK COMMAND',
        title: 'National Emergency Grid Alerts',
        desc: 'Real-time network events, regional dispatch logs, hospital accreditations, and system integrity status.',
        emptyDesc: 'No network alerts pending review. All facility dispatches and requests are monitored live.',
      }
    } else {
      return {
        badge: 'FACILITY OPERATIONS',
        title: 'Emergency Intake & Referral Alerts',
        desc: `Operational alerts for ${user?.hospital_name || 'your registered hospital facility'} - incoming triage cases, bed allocation, and referral transfers.`,
        emptyDesc: 'No intake alerts waiting right now. Incoming patient triage and inter-hospital referral requests will appear here in real-time.',
      }
    }
  }

  const roleInfo = getRoleHeaderInfo()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', background: '#f8fafc' }}>
      <AppTopHeader title="Notifications & Alert Center" />

      <main className="bml-page-content" style={{ maxWidth: '960px', margin: '0 auto', width: '100%', padding: '24px 20px 60px' }}>
        
        {/* Modern Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px 28px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: '#e0e7ff',
                  color: '#4338ca',
                }}
              >
                {roleInfo.badge}
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '20px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                  }}
                >
                  {unreadCount} UNREAD
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {roleInfo.title}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              {roleInfo.desc}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fetchNotifications(true)}
              disabled={refreshing}
              title="Refresh notifications"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  background: '#4f46e5',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                }}
              >
                <CheckCheck size={16} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: `All (${visible.length})` },
            { id: 'UNREAD', label: `Unread (${unreadCount})` },
            { id: 'URGENT', label: 'Urgent & Critical' },
            { id: 'TRANSFERS', label: 'Transfers & Dispatches' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: filter === tab.id ? 700 : 600,
                border: filter === tab.id ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                background: filter === tab.id ? '#4f46e5' : '#ffffff',
                color: filter === tab.id ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Feed */}
        {loading ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '60px 24px',
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'inline-block', marginBottom: '14px' }}>
              <RefreshCw size={28} className="animate-spin" color="#4f46e5" />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              Loading role alerts…
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '64px 32px',
              textAlign: 'center',
              color: '#64748b',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#64748b',
              }}
            >
              <Inbox size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              No notifications to display
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '460px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              {filter === 'ALL' ? roleInfo.emptyDesc : `No alerts matching the "${filter.toLowerCase()}" filter.`}
            </p>
            {filter !== 'ALL' && (
              <button
                onClick={() => setFilter('ALL')}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                View All Notifications
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((item) => {
              const unread = isUnread(item)
              return (
                <div
                  key={item.id}
                  style={{
                    background: unread ? '#ffffff' : '#fcfdfd',
                    border: unread ? '1.5px solid #cbd5e1' : '1px solid #e2e8f0',
                    borderLeft: unread ? '4px solid #4f46e5' : '4px solid #cbd5e1',
                    borderRadius: '14px',
                    padding: '18px 22px',
                    boxShadow: unread ? '0 4px 14px rgba(79, 70, 229, 0.05)' : 'none',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    {/* Icon */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background:
                          item.category === 'URGENT'
                            ? '#fef2f2'
                            : item.category === 'TRANSFER'
                            ? '#ecfdf5'
                            : item.category === 'VERIFICATION'
                            ? '#eff6ff'
                            : '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.category === 'URGENT' && <AlertTriangle size={20} color="#dc2626" />}
                      {item.category === 'TRANSFER' && <Ambulance size={20} color="#059669" />}
                      {item.category === 'VERIFICATION' && <Building2 size={20} color="#2563eb" />}
                      {item.category === 'SYSTEM' && <ShieldAlert size={20} color="#d97706" />}
                      {item.category === 'INFO' && <Activity size={20} color="#6366f1" />}
                    </div>

                    {/* Notification content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            letterSpacing: '0.04em',
                            ...getBadgeStyle(item.category),
                          }}
                        >
                          {item.category}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {item.time}
                        </span>
                      </div>

                      <p style={{ fontSize: '13.5px', color: '#334155', margin: '4px 0 12px', lineHeight: 1.55 }}>
                        {item.message}
                      </p>

                      {item.link && (
                        <Link
                          to={item.link}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#4f46e5',
                            textDecoration: 'none',
                            background: '#eef2ff',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{item.actionLabel || 'View Details'}</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Right actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleToggleRead(item.id, item.unread)}
                      title={unread ? 'Mark as read' : 'Mark as unread'}
                      style={{
                        background: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: unread ? '#4f46e5' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CheckCheck size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Dismiss notification"
                      style={{
                        background: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
