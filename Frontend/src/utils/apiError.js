export const getApiErrorMessage = (
  err,
  fallback = 'Something went wrong. Please try again.'
) => {
  const data = err?.response?.data

  if (typeof data === 'string' && data.trim()) return data
  if (data?.message) return data.message
  if (data?.error) return typeof data.error === 'string' ? data.error : fallback

  if (data?.errors && typeof data.errors === 'object') {
    const firstKey = Object.keys(data.errors)[0]
    const firstVal = data.errors[firstKey]
    if (Array.isArray(firstVal) && firstVal.length) return firstVal[0]
    if (typeof firstVal === 'string') return firstVal
  }

  if (Array.isArray(data?.errors) && data.errors.length) {
    const first = data.errors[0]
    if (typeof first === 'string') return first
  }

  if (err?.message === 'Network Error') {
    return 'Network error. Please check your internet connection.'
  }

  if (err?.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.'
  }

  return fallback
}
