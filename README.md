# Agentic Location Finder

An AI-powered location search application. The user types a natural language query — the AI agent understands it, geocodes the location, searches Google Places, filters results, ranks them, and presents clean result cards.

## Example Query

```
Find farmhouses near 27 kilometer Hyderabad around 2 km
```

The agent extracts:

```json
{
  "intent": "nearby_place_search",
  "place_type": "farmhouse",
  "base_location": "27 kilometer Hyderabad",
  "radius_km": 2,
  "city": "Hyderabad"
}
```

## Agentic Workflow (7 steps)

| Step | Agent | Description |
|------|-------|-------------|
| 1 | Query Understanding | Groq (qwen/qwen3-32b) parses natural language |
| 2 | Validation | Checks required fields, defaults radius to 2 km |
| 3 | Geocoding | Google Geocoding API converts address → lat/lng |
| 4 | Search Planning | Picks nearby vs. text search strategy |
| 5 | Places Search | Google Places API with 3 fallback strategies |
| 6 | Verification | Deduplication + Haversine distance calculation |
| 7 | Ranking | Scored by distance (50%), rating (30%), reviews (20%) |

## Project Structure

```
agentic-location-finder/
├── backend/
│   ├── main.py                          # FastAPI entry point
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── api/agentic_location_routes.py
│       ├── schemas/agentic_location_schema.py
│       ├── providers/google_maps_provider.py
│       ├── utils/distance_calculator.py
│       └── services/
│           ├── agentic_location_agent.py  # Orchestrator
│           └── agents/
│               ├── query_understanding_agent.py
│               ├── validation_agent.py
│               ├── geocoding_agent.py
│               ├── search_planning_agent.py
│               ├── places_search_agent.py
│               ├── result_verification_agent.py
│               └── ranking_agent.py
└── frontend/
    ├── src/
    │   ├── pages/AgenticLocationFinderPage.tsx
    │   ├── components/agentic-location/
    │   │   ├── AgentSearchBox.tsx
    │   │   ├── AgentThinkingPanel.tsx
    │   │   ├── ParsedQueryPanel.tsx
    │   │   ├── LocationResultCard.tsx
    │   │   └── LocationResultsList.tsx
    │   ├── services/agenticLocationService.ts
    │   └── types/agenticLocation.ts
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

## Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5174
```

The Vite dev server proxies `/api/*` to `http://localhost:8000` automatically — no CORS config needed.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agentic-location/parse-query` | Parse query only (no Google search) |
| `POST` | `/api/agentic-location/search` | Full agentic search pipeline |
| `GET`  | `/health` | Health check |

### POST /api/agentic-location/search

**Request:**
```json
{ "query": "Find farmhouses near 27 kilometer Hyderabad around 2 km" }
```

**Response:**
```json
{
  "agent_steps": [{ "step": "query_understanding", "status": "completed", "message": "..." }],
  "parsed_query": { "place_type": "farmhouse", "base_location": "27 kilometer Hyderabad", "radius_km": 2 },
  "base_coordinates": { "lat": 17.385, "lng": 78.4867 },
  "results": [
    {
      "name": "Example Farmhouse",
      "address": "Hyderabad, Telangana",
      "distance_km": 1.3,
      "rating": 4.4,
      "reviews_count": 86,
      "phone": "+91...",
      "maps_url": "https://www.google.com/maps/place/?q=place_id:...",
      "source": "Google Places",
      "relevance_score": 0.91,
      "outside_requested_radius": false
    }
  ],
  "summary": "Found 8 farmhouse(s) near 27 kilometer Hyderabad. 5 within 2 km."
}
```

## Required API Keys

| Key | Where to get |
|-----|-------------|
| `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) — enable Geocoding API + Places API |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/) |