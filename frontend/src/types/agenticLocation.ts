export interface ParsedQuery {
  intent: string
  place_type: string
  base_location: string
  radius_km: number
  city: string | null
  filters: Record<string, unknown>
  confidence: number
}

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentStep {
  step: string
  status: StepStatus
  message: string
}

export interface LocationResult {
  name: string
  address: string
  distance_km: number
  rating: number | null
  reviews_count: number
  phone: string | null
  maps_url: string
  source: string
  relevance_score: number
  outside_requested_radius: boolean
  place_id: string
}

export interface BaseCoordinates {
  lat: number
  lng: number
}

export interface SearchResponse {
  agent_steps: AgentStep[]
  parsed_query: ParsedQuery | null
  base_coordinates: BaseCoordinates | null
  results: LocationResult[]
  summary: string
  error?: string
  memory_context?: string[] | null
}

// SSE streaming types
export type SSEEventType = 'memory' | 'step' | 'tool_call' | 'tool_result' | 'result' | 'error'

export interface SSEEvent {
  type: SSEEventType
  payload: unknown
}

export interface ToolCallPayload {
  tool: string
}

export interface ToolResultPayload {
  tool: string
  summary: string
}

export interface MemoryPayload {
  context: string[]
  source: 'lightrag' | 'chromadb'
}
