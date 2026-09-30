import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '../components/AppSidebar'

export default function RootLayout() {
  return (
    <div className="bml-app-layout">
      <AppSidebar />
      <div className="bml-main-viewport">
        <Outlet />
      </div>
    </div>
  )
}
