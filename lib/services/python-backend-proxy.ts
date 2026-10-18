const PYTHON_API_BASE_URL = process.env.PYTHON_API_BASE_URL || process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL || "http://127.0.0.1:8000"

export async function tryPythonBackend(path: string, init: RequestInit = {}, timeoutMs = 1200) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${PYTHON_API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
