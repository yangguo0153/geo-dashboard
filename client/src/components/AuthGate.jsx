import React from 'react'
import { useAuth } from '../hooks/useAuth'

/**
 * Authentication gate component
 * Checks for token in URL params or localStorage
 * Redirects to login if not authenticated
 */
function AuthGate({ children }) {
  const { isAuthenticated } = useAuth()

  // If not authenticated, redirect to login
  // In production, this would redirect to SSO or login page
  // For now, we'll show a placeholder message
  if (!isAuthenticated) {
    // Check if we're in development mode
    const isDev = import.meta.env.DEV

    if (isDev) {
      // In development, allow access without auth
      console.warn('[AuthGate] Development mode: bypassing authentication')
      return children
    }

    // Production: show login prompt
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0e17',
        color: '#fff',
      }}>
        <h2 style={{ marginBottom: 16 }}>需要登录</h2>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          请通过有效链接访问此页面
        </p>
        <p style={{ color: '#64748b', fontSize: 12 }}>
          或联系管理员获取访问权限
        </p>
      </div>
    )
  }

  return children
}

export default AuthGate