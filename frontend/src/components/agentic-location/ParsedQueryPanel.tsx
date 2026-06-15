import { useState } from 'react'
import type { ParsedQuery } from '../../types/agenticLocation'

interface Props {
  parsed: ParsedQuery
}

export default function ParsedQueryPanel({ parsed }: Props) {
  const [open, setOpen] = useState(false)

  const rows: [string, string][] = [
    ['Intent', parsed.intent],
    ['Place Type', parsed.place_type || '—'],
    ['Base Location', parsed.base_location || '—'],
    ['Radius', `${parsed.radius_km} km`],
    ['City', parsed.city || '—'],
  ]

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">🧠</span>
          <span className="text-sm font-medium text-gray-200">Parsed Query</span>
          <span className="text-xs bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full">
            {Math.round(parsed.confidence * 100)}% confidence
          </span>
        </div>
        <span className="text-gray-500 text-xs ml-2">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-700 grid grid-cols-2 gap-x-4 gap-y-3 pt-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
              <div className="text-sm text-gray-100 font-medium mt-0.5 break-words">{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}