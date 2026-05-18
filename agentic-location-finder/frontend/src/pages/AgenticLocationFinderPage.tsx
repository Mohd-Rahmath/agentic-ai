import { useState } from 'react'
import AgentSearchBox from '../components/agentic-location/AgentSearchBox'
import AgentThinkingPanel from '../components/agentic-location/AgentThinkingPanel'
import LocationResultsList from '../components/agentic-location/LocationResultsList'
import ParsedQueryPanel from '../components/agentic-location/ParsedQueryPanel'
import { searchLocations } from '../services/agenticLocationService'
import type { SearchResponse } from '../types/agenticLocation'

const EXAMPLES = [
  'Find farmhouses near 27 kilometer Hyderabad around 2 km',
  'Restaurants near Gachibowli within 3 km',
  'Hotels in Banjara Hills Hyderabad',
  'Parks near Jubilee Hills within 1 km',
]

export default function AgenticLocationFinderPage() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<SearchResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleSearch = async (query: string) => {
    setLoading(true)
    setResponse(null)
    setApiError(null)
    try {
      const data = await searchLocations(query)
      setResponse(data)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Something went wrong. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const hasResults = response && !loading
  const errorMsg = apiError ?? response?.error

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">📍</span>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">
              Agentic Location Finder
            </h1>
            <p className="text-xs text-gray-500">AI-powered nearby place search</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-5 py-8 flex flex-col gap-8">
        {/* ── Hero ── */}
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-white">
            Find Places with Natural Language
          </h2>
          <p className="text-gray-400 text-base max-w-lg mx-auto">
            Ask in natural language and let the AI agent plan, search, and rank nearby places
            using Google Maps.
          </p>
        </div>

        {/* ── Search box ── */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5 shadow-xl">
          <AgentSearchBox onSearch={handleSearch} loading={loading} />
        </div>

        {/* ── Results area ── */}
        {(loading || hasResults) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column: workflow + parsed query */}
            <div className="flex flex-col gap-4">
              <AgentThinkingPanel steps={response?.agent_steps ?? []} />
              {response?.parsed_query && (
                <ParsedQueryPanel parsed={response.parsed_query} />
              )}
            </div>

            {/* Right column: results */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <p className="text-sm">{errorMsg}</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
                  <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-sm">Agent is working through the workflow...</p>
                </div>
              )}

              {hasResults && response.results !== undefined && (
                <LocationResultsList
                  results={response.results}
                  summary={response.summary}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Empty / landing state ── */}
        {!loading && !response && (
          <div className="flex flex-col items-center gap-8 py-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="text-6xl">🤖</span>
              <p className="text-gray-500 text-sm">Try one of these examples:</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleSearch(ex)}
                  className="text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-700/50 text-gray-300 px-4 py-2.5 rounded-xl transition-colors text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 bg-gray-900/60 py-4 text-center text-xs text-gray-600">
        Agentic Location Finder — Groq (qwen/qwen3-32b) + Google Maps API
      </footer>
    </div>
  )
}
