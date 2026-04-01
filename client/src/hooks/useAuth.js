import { useState, useEffect, useCallback } from 'react'

const TOKEN_KEY = 'geo_dashboard_token'

/**
 * Hook for managing authentication state
 * Extracts token from URL on initial load, stores in localStorage
 */
export function useAuth() {
  const [token, setToken] = useState(() => {
    // First check URL for token (from external auth)
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')

    if (urlToken) {
      // Clean URL by removing token parameter
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      localStorage.setItem(TOKEN_KEY, urlToken)
      return urlToken
    }

    // Fall back to localStorage
    return localStorage.getItem(TOKEN_KEY) || null
  })

  const [isAuthenticated, setIsAuthenticated] = useState(!!token)

  // Update auth state when token changes
  useEffect(() => {
    setIsAuthenticated(!!token)
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
    isAuthenticated,
    saveToken,
    clearToken,
    hasToken,
    getAuthHeader,
  }
}

export default useAuth