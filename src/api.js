const ACCESS_TOKEN_KEY = 'marketplace.vendor.access_token'
const REFRESH_TOKEN_KEY = 'marketplace.vendor.refresh_token'
const DEFAULT_API_BASE_URL = 'https://marketplace.vitalmeuble.online'
const ACCESS_TOKEN_HEADER = 'x-access-token'
const REFRESH_PATH = '/api/v1/vendor/auth/refresh'
const AUTH_NO_REFRESH_PATHS = new Set([
  '/api/v1/vendor/auth/login',
  '/api/v1/vendor/auth/sign-in',
  '/api/v1/vendor/auth/register',
  '/api/v1/vendor/auth/refresh',
  '/api/v1/vendor/auth/logout',
  '/api/v1/vendor/auth/sign-out',
])

let refreshPromise = null

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || ''
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || ''
}

export function setStoredAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function setStoredRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
    return
  }

  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')
}

export async function apiRequest(path, { method = 'GET', body, token, skipAuthRefresh = false } = {}) {
  return sendJsonRequest(path, { method, body, token, skipAuthRefresh })
}

export async function downloadFile(path, { token, skipAuthRefresh = false } = {}) {
  return sendDownloadRequest(path, { token, skipAuthRefresh })
}

export async function uploadMediaFile(file, { token, directory = 'uploads', skipAuthRefresh = false } = {}) {
  const formData = new FormData()
  const resolvedToken = getStoredAccessToken() || token
  formData.append('file', file)

  if (directory) {
    formData.append('directory', directory)
  }

  const headers = {}
  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  const response = await fetch(`${getApiBaseUrl()}/api/v1/media/upload`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })

  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    if (canRefreshAfter(response, '/api/v1/media/upload', skipAuthRefresh)) {
      const refreshedToken = await refreshAccessToken()
      return uploadMediaFile(file, { token: refreshedToken, directory, skipAuthRefresh: true })
    }

    throw createApiError(response, payload)
  }

  syncAuthTokens(response, payload)

  return payload || {}
}

async function sendDownloadRequest(path, { token, skipAuthRefresh = false } = {}) {
  const headers = {}
  const resolvedToken = token === null ? '' : getStoredAccessToken() || token

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'GET',
    credentials: 'include',
    headers,
  })

  if (!response.ok) {
    const payload = await parseResponsePayload(response)
    if (canRefreshAfter(response, path, skipAuthRefresh)) {
      const refreshedToken = await refreshAccessToken()
      return sendDownloadRequest(path, { token: refreshedToken, skipAuthRefresh: true })
    }

    throw createApiError(response, payload)
  }

  syncAuthTokens(response, null)

  const blob = await response.blob()
  return {
    blob,
    filename: getFilenameFromDisposition(response.headers.get('content-disposition')) || 'sales-report',
  }
}

async function sendJsonRequest(path, { method = 'GET', body, token, skipAuthRefresh = false } = {}) {
  const headers = {}
  const resolvedToken = token === null ? '' : getStoredAccessToken() || token

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (resolvedToken) {
    headers.Authorization = `Bearer ${resolvedToken}`
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const payload = await parseResponsePayload(response)

  if (!response.ok) {
    if (canRefreshAfter(response, path, skipAuthRefresh)) {
      const refreshedToken = await refreshAccessToken()
      return sendJsonRequest(path, { method, body, token: refreshedToken, skipAuthRefresh: true })
    }

    throw createApiError(response, payload)
  }

  syncAuthTokens(response, payload)

  return payload || {}
}

function canRefreshAfter(response, path, skipAuthRefresh) {
  return response.status === 401 && !skipAuthRefresh && !AUTH_NO_REFRESH_PATHS.has(normalizePath(path))
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = requestRefreshToken().catch((error) => {
      setStoredAccessToken('')
      setStoredRefreshToken('')
      throw error
    }).finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function requestRefreshToken() {
  const refreshToken = getStoredRefreshToken()
  const payload = await sendJsonRequest(REFRESH_PATH, {
    method: 'POST',
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
    token: null,
    skipAuthRefresh: true,
  })
  const accessToken = getPayloadAccessToken(payload)

  if (!accessToken) {
    throw new ApiError('Не удалось обновить сессию. Войдите снова.', 401, payload)
  }

  syncAuthTokens(null, payload)

  return accessToken
}

async function parseResponsePayload(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text ? { message: text } : null
}

function createApiError(response, payload) {
  return new ApiError(payload?.message || payload?.error || `HTTP ${response.status}`, response.status, payload)
}

function syncAuthTokens(response, payload) {
  const headerAccessToken = response?.headers.get(ACCESS_TOKEN_HEADER)?.trim()
  const payloadAccessToken = getPayloadAccessToken(payload)
  const payloadRefreshToken = getPayloadRefreshToken(payload)

  if (headerAccessToken || payloadAccessToken) {
    setStoredAccessToken(headerAccessToken || payloadAccessToken)
  }

  if (payloadRefreshToken) {
    setStoredRefreshToken(payloadRefreshToken)
  }
}

function getPayloadAccessToken(payload) {
  return (payload?.accessToken || payload?.access_token || '').trim()
}

function getPayloadRefreshToken(payload) {
  return (payload?.refreshToken || payload?.refresh_token || '').trim()
}

function normalizePath(path) {
  return String(path).split('?')[0]
}

function getFilenameFromDisposition(disposition) {
  const match = String(disposition || '').match(/filename="([^"]+)"/i)
  return match ? match[1] : ''
}
