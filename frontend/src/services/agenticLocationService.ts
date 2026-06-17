import type { SearchResponse, SSEEvent } from '../types/agenticLocation'

const BASE = '/api/agentic-location'
// Use direct URL for SSE to avoid Vite proxy buffering
const STREAM_BASE = 'http://localhost:8000/api/agentic-location'

export async function searchLocations(query: string): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`)
  }

  return res.json() as Promise<SearchResponse>
}

export async function* streamSearch(query: string): AsyncGenerator<SSEEvent> {
  const res = await fetch(`${STREAM_BASE}/search/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        yield JSON.parse(data) as SSEEvent
      } catch {
        // skip malformed chunks
      }
    }
  }
}
