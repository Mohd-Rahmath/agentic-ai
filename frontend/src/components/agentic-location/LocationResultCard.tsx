import type { LocationResult } from '../../types/agenticLocation'

interface Props {
  result: LocationResult
  rank: number
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating % 1 >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="text-yellow-400 text-sm tracking-tight">
      {'★'.repeat(full)}
      {half ? '⯨' : ''}
      {'☆'.repeat(empty)}
    </span>
  )
}

export default function LocationResultCard({ result, rank }: Props) {
  const isOutside = result.outside_requested_radius

  return (
    <div
      className={`relative flex flex-col gap-3 p-4 rounded-xl border transition-colors ${
        isOutside
          ? 'border-orange-800/50 bg-orange-950/10 hover:border-orange-700/60'
          : 'border-gray-700 bg-gray-800/50 hover:border-indigo-700/50'
      }`}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-700/80 flex items-center justify-center text-xs font-bold text-gray-300">
        {rank}
      </div>

      {/* Outside radius badge */}
      {isOutside && (
        <span className="absolute top-3 left-3 text-xs bg-orange-900/60 text-orange-300 px-2 py-0.5 rounded-full">
          Outside radius
        </span>
      )}

      {/* Name & address */}
      <div className={isOutside ? 'mt-5' : ''}>
        <h3 className="text-base font-semibold text-gray-100 pr-10 leading-snug">
          {result.name}
        </h3>
        {result.address && (
          <p className="text-sm text-gray-400 mt-1">{result.address}</p>
        )}
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="flex items-center gap-1.5 bg-gray-700/60 rounded-lg px-2.5 py-1">
          <span>📍</span>
          <span className="font-semibold text-gray-200">{result.distance_km} km</span>
        </span>

        {result.rating != null && (
          <span className="flex items-center gap-1.5 bg-gray-700/60 rounded-lg px-2.5 py-1">
            <StarRating rating={result.rating} />
            <span className="font-medium text-gray-200">{result.rating.toFixed(1)}</span>
            {result.reviews_count > 0 && (
              <span className="text-gray-500 text-xs">
                ({result.reviews_count.toLocaleString()})
              </span>
            )}
          </span>
        )}

        <span className="flex items-center gap-1 bg-indigo-900/30 rounded-lg px-2.5 py-1">
          <span className="text-indigo-400 text-xs">score</span>
          <span className="font-semibold text-indigo-300">
            {Math.round(result.relevance_score * 100)}%
          </span>
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-700/60">
        <div className="flex items-center gap-3 text-sm text-gray-500 min-w-0">
          {result.phone && (
            <a
              href={`tel:${result.phone}`}
              className="flex items-center gap-1 hover:text-gray-300 transition-colors truncate"
            >
              <span>📞</span>
              <span className="truncate">{result.phone}</span>
            </a>
          )}
          <span className="text-xs text-gray-700 flex-shrink-0">{result.source}</span>
        </div>

        {result.maps_url && (
          <a
            href={result.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
          >
            <span>🗺</span> View Map
          </a>
        )}
      </div>
    </div>
  )
}