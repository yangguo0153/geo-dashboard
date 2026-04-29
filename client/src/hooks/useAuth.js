import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'geo_dashboard_token'

/**
 * Hook for managing authentication state
 * Extracts token from URL on initial load, stores in localStorage
 */
export function useAuth() {
  const [token, setToken] = useState(() => {
    // 1. 检查 URL
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    if (urlToken) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      localStorage.setItem(TOKEN_KEY, urlToken)
      return urlToken
    }

    // 2. 检查 localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY)
    if (storedToken) return storedToken

    // 3. 开发模式：使用默认 token
    if (import.meta.env.DEV) {
      const devToken = import.meta.env.VITE_ADMIN_TOKEN
      if (devToken) {
        localStorage.setItem(TOKEN_KEY, devToken)
        return devToken
      }
    }

    return null
  })

  const [isAuthenticated, setIsAuthenticated] = useState(!!token)
  const [role, setRole] = useState(null)

  // Update auth state when token changes
  useEffect(() => {
    setIsAuthenticated(!!token)
  }, [token])

  // Fetch role from server when token is available
  useEffect(() => {
    if (!token) {
      setRole(null)
      return
    }
    fetch(`/api/auth/role`, { headers: { 'X-Auth-Token': token } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.role) setRole(data.role)
      })
      .catch(() => setRole(null))
  }, [token])

  // Save token to state and localStorage
  const saveToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
    setToken(newToken)
  }, [])

  // Clear token (logout)
  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
  }, [])

  // Check if token exists
  const hasToken = useCallback(() => {
    return !!token
  }, [token])

  // Get authorization header
  const getAuthHeader = useCallback(() => {
    return token ? { 'X-Auth-Token': token } : {}
  }, [token])

  return {
    token,
    role,
    isAdmin: role === 'admin',
    isAuthenticated,
    saveToken,
    clearToken,
    hasToken,
    getAuthHeader,
  }
}

export default useAuth