'use client'

import './view.css'
import './report-styles.css'
import { useEffect } from 'react'

/**
 * Layout for fullscreen report view
 * This layout hides navigation and ensures clean report display
 */
export default function ReportViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Hide dashboard navigation for fullscreen report view
    const style = document.createElement('style')
    style.textContent = `
      /* Hide dashboard navigation for fullscreen report view */
      header,
      nav,
      aside,
      [role="navigation"],
      .dashboard-layout,
      .sidebar,
      .dashboard-header {
        display: none !important;
      }
      
      /* Remove padding/margins from dashboard layout */
      main {
        padding: 0 !important;
        margin: 0 !important;
      }
      
      /* Ensure full width/height */
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div style={{ 
      margin: 0,
      padding: 0,
      backgroundColor: '#ffffff',
      minHeight: '100vh'
    }}>
      {children}
    </div>
  )
}
