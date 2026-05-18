import { useState, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  onSearch: (query: string) => void
  loading: boolean
}

export default function AgentSearchBox({ onSearch, loading }: Props) {
  const [query, setQuery] = useState('')

  const submit = () => {
    if (query.trim() && !loading) onSearch(query.trim())
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base leading-relaxed"
        rows={3}
        placeholder="Example: Find farmhouses near 27 kilometer Hyderabad around 2 km"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!query.trim() || loading}
        className="w-full py-3 rounded-xl font-semibold text-base bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Agent Working...
          </>
        ) : (
          <>
            <span>🤖</span> Ask Agent
          </>
        )}
      </button>
    </form>
  )
}
