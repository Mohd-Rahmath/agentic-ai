import type { LocationResult } from '../../types/agenticLocation'
import LocationResultCard from './LocationResultCard'

interface Props {
  results: LocationResult[]
  summary: string
}

export default function LocationResultsList({ results, summary }: Props) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <span className="text-5xl">🔍</span>
        <p className="text-gray-400 text-sm max-w-xs">
          {summary || 'No results found. Try increasing the radius or rephrasing your query.'}
        </p>
      </div>
    )
  }

  const inside = results.filter((r) => !r.outside_requested_radius)
  const outside = results.filter((r) => r.outside_requested_radius)

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-400">{summary}</p>
        <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full flex-shrink-0">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Within radius */}
      {inside.length > 0 && (
        <div className="flex flex-col gap-3">
          {inside.map((result, i) => (
            <LocationResultCard key={result.place_id || i} result={result} rank={i + 1} />
          ))}
        </div>
      )}

      {/* Outside radius section */}
      {outside.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-orange-800/40" />
            <span className="text-xs text-orange-400/70 flex-shrink-0">
              Nearby but outside requested radius
            </span>
            <div className="flex-1 h-px bg-orange-800/40" />
          </div>
          {outside.map((result, i) => (
            <LocationResultCard
              key={result.place_id || `out-${i}`}
              result={result}
              rank={inside.length + i + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
