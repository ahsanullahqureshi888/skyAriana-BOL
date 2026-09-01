export const getDocumentSuiteBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_DOCUMENT_SUITE_URL as string | undefined
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '')

  if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname !== 'localhost')) {
    return 'https://acci-laravel-theta.vercel.app'
  }

  return 'http://localhost:8012'
}
