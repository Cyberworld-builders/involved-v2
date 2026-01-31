import './view.css'
import './report-styles.css'

/**
 * Layout for fullscreen report view
 * This layout is outside the dashboard layout, so no sidebar/navigation
 */
export default function ReportViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div 
      className="report-view-container"
      style={{ 
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '20px',
        paddingBottom: '20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto'
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '890px', /* 850px + 40px for margins */
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '20px',
        paddingBottom: '20px'
      }}>
        {children}
      </div>
    </div>
  )
}
