import { useState, useCallback } from 'react'
import { message } from 'antd'
import { useAuth } from './useAuth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

/**
 * Hook for API operations with authentication
 * Provides fetchApi and uploadFile methods
 */
export function useApi() {
  const { getAuthHeader, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Make an authenticated API request
   * @param {string} endpoint - API endpoint path
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} Response data
   */
  const fetchApi = useCallback(async (endpoint, options = {}) => {
    setLoading(true)
    setError(null)

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint}`

    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.detail || `HTTP ${response.status}`

        if (response.status === 401) {
          message.error('登录已过期，请重新登录')
          // Could trigger logout here
        } else if (response.status === 403) {
          message.error('无权限访问')
        } else if (response.status === 404) {
          message.error('资源不存在')
        } else {
          message.error(errorMessage)
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
   * @param {string} endpoint - Upload endpoint path
   * @param {File} file - File to upload
   * @param {Object} additionalData - Additional form data
   * @returns {Promise<Object>} Response data
   */
  const uploadFile = useCallback(async (endpoint, file, additionalData = {}) => {
    setLoading(true)
    setError(null)

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint}`

    const formData = new FormData()
    formData.append('file', file)

    // Append additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value)
    })

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.detail || `Upload failed: ${response.status}`
        message.error(errorMessage)
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

  /**
   * POST request helper
   */
  const post = useCallback((endpoint, data = {}) => {
    return fetchApi(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }, [fetchApi])

  /**
   * PUT request helper
   */
  const put = useCallback((endpoint, data = {}) => {
    return fetchApi(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }, [fetchApi])

  /**
   * DELETE request helper
   */
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
