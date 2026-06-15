import type { AgentStep, StepStatus } from '../../types/agenticLocation'

const LABELS: Record<string, string> = {
  query_understanding: 'Understanding Query',
  validation: 'Validating Input',
  geocoding: 'Resolving Location',
  search_planning: 'Planning Search Strategy',
  places_search: 'Searching Google Places',
  result_verification: 'Verifying & Filtering',
  ranking: 'Ranking Results',
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === 'completed')
    return <span className="text-green-400 font-bold text-base leading-none">✓</span>
  if (status === 'failed')
    return <span className="text-red-400 font-bold text-base leading-none">✗</span>
  if (status === 'running')
    return (
      <span className="w-4 h-4 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin block" />
    )
  return <span className="w-3.5 h-3.5 rounded-full border border-gray-600 block" />
}

function rowStyle(status: StepStatus): string {
  const base = 'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300'
  if (status === 'completed') return `${base} border-green-800/60 bg-green-950/30`
  if (status === 'failed') return `${base} border-red-800/60 bg-red-950/30`
  if (status === 'running') return `${base} border-indigo-700/60 bg-indigo-950/30`
  return `${base} border-gray-800 bg-gray-900/20`
}

function badgeStyle(status: StepStatus): string {
  const base = 'text-xs px-1.5 py-0.5 rounded font-medium'
  if (status === 'completed') return `${base} bg-green-900/60 text-green-300`
  if (status === 'failed') return `${base} bg-red-900/60 text-red-300`
  if (status === 'running') return `${base} bg-indigo-900/60 text-indigo-300`
  return `${base} bg-gray-800 text-gray-500`
}

interface Props {
  steps: AgentStep[]
}

export default function AgentThinkingPanel({ steps }: Props) {
  if (steps.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        Agent Workflow
      </h3>
      {steps.map((step, i) => (
        <div key={i} className={rowStyle(step.status)}>
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
            <StatusIcon status={step.status} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-200">
                {LABELS[step.step] ?? step.step}
              </span>
              <span className={badgeStyle(step.status)}>{step.status}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{step.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}