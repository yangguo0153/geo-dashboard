import { useState, useCallback } from 'react'
import { message } from 'antd'
import { useAuth } from './useAuth'

/**
 * Hook for API operations with authentication
 * All requests use relative paths (same-origin) — no base URL needed.
 */
export function useApi() {
  const { getAuthHeader, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Make an authenticated API request
   */
  const fetchApi = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)

    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || errorData.detail || `HTTP ${response.status}`

        if (response.status === 401) {
          message.error('登录已过期，请重新登录')
        } else if (response.status === 403) {
          message.error('无权限访问')
        } else if (response.status === 404) {
          message.error('资源不存在')
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data

    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getAuthHeader])

  /**
   * Upload a file to the API
   */
  const uploadFile = useCallback(async (endpoint, file, additionalData = {}) => {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || errorData.detail || `Upload failed: ${response.status}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return data

    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [getAuthHeader])

  /**
   * GET request helper
   */
  const get = useCallback((endpoint, params = {}) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value)
      }
    })

    const url = searchParams.toString()
      ? `${endpoint}?${searchParams.toString()}`
      : endpoint

    return fetchApi(url, { method: 'GET' })
  }, [fetchApi])

  const post = useCallback((endpoint, data = {}) => {
    return fetchApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [fetchApi])

  const put = useCallback((endpoint, data = {}) => {
    return fetchApi(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [fetchApi])

  const del = useCallback((endpoint) => {
    return fetchApi(endpoint, { method: 'DELETE' })
  }, [fetchApi])

  return {
    loading,
    error,
    token,
    fetchApi,
    uploadFile,
    get,
    post,
    put,
    del,
  }
}

export default useApi
