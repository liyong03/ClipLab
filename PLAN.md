# ClipLab — Implementation Plan

An audio recording, filtering, and sharing web application.

## Tech Stack

- **Frontend:** React + TypeScript (Vite), Web Audio API, MediaRecorder API
- **Backend:** Python + FastAPI
- **Database:** SQLite via aiosqlite (async) + SQLAlchemy (models/migrations)
- **Storage:** Abstracted provider (Local filesystem / S3 / extensible)
- **Auth:** JWT (python-jose) + passlib (bcrypt)
- **Audio Processing:** librosa, soundfile, numpy (waveform + future ML)
- **Testing:**
  - Frontend: Vitest (unit/integration), Playwright (E2E)
  - Backend: pytest + pytest-asyncio, httpx (async test client)

---

## Architecture

```
ClipLab/
├── client/                          # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Recorder.tsx         # Mic capture + recording controls
│   │   │   ├── FilterChain.tsx      # Stackable filter UI (toggle/reorder)
│   │   │   ├── FilterControl.tsx    # Individual filter param controls
│   │   │   ├── AudioPreview.tsx     # Playback with filters applied
│   │   │   ├── WaveformView.tsx     # Visual waveform display
│   │   │   ├── ClipFeed.tsx         # List of uploaded clips
│   │   │   ├── ClipDetail.tsx       # Single clip detail + replay + edit
│   │   │   ├── AuthForm.tsx         # Login / Register form
│   │   │   └── Layout.tsx           # App shell, nav, auth state
│   │   ├── filters/
│   │   │   ├── registry.ts          # Filter registry (discover + instantiate)
│   │   │   ├── types.ts             # FilterPlugin interface
│   │   │   ├── gain.ts              # Gain filter plugin
│   │   │   ├── lowpass.ts           # Low-pass filter plugin
│   │   │   ├── highpass.ts          # High-pass filter plugin
│   │   │   ├── compressor.ts        # Compressor filter plugin
│   │   │   ├── delay.ts             # Echo/Delay filter plugin
│   │   │   └── ai-transform.ts     # AI server-side filter plugin
│   │   ├── hooks/
│   │   │   ├── useRecorder.ts       # MediaRecorder logic
│   │   │   ├── useFilterChain.ts    # Web Audio filter graph management
│   │   │   └── useAuth.ts          # Auth state + token management
│   │   ├── context/
│   │   │   └── AuthContext.tsx      # Auth provider
│   │   ├── pages/
│   │   │   ├── Home.tsx             # Record + public feed
│   │   │   ├── Clip.tsx             # Clip detail page
│   │   │   ├── MyClips.tsx          # User's own clips
│   │   │   ├── Login.tsx            # Login page
│   │   │   └── Register.tsx         # Register page
│   │   ├── lib/
│   │   │   └── api.ts               # API client with auth headers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── __tests__/                   # Frontend tests
│   └── index.html
├── server/                          # FastAPI backend
│   ├── .venv/                       # Python virtual environment (gitignored)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app entry, CORS, lifespan
│   │   ├── config.py                # Settings via pydantic-settings
│   │   ├── models.py                # SQLAlchemy models (User, Clip)
│   │   ├── database.py              # DB engine, session, migrations
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Register / Login endpoints
│   │   │   └── clips.py             # Clip CRUD endpoints
│   │   ├── dependencies.py          # Dependency injection (auth, storage, db)
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # StorageProvider ABC
│   │   │   ├── factory.py           # Provider factory
│   │   │   ├── local.py             # Local filesystem provider
│   │   │   └── s3.py                # S3 provider
│   │   ├── filters/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # ServerFilter ABC
│   │   │   ├── registry.py          # Server-side filter registry
│   │   │   └── ai_denoise.py        # Example: AI denoising filter
│   │   └── waveform.py              # Peaks generation (librosa)
│   ├── tests/                       # Backend tests
│   │   ├── conftest.py              # Fixtures (test client, test db, mock storage)
│   │   ├── test_auth.py
│   │   ├── test_clips.py
│   │   ├── test_storage.py
│   │   └── test_filters.py
│   ├── requirements.txt
│   └── uploads/                     # Local audio file storage
├── e2e/                             # Playwright E2E tests
├── PLAN.md
└── Makefile                         # Root dev/build/test commands
```

---

## Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE clips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  raw_filename TEXT NOT NULL,
  filtered_filename TEXT NOT NULL,
  filter_settings TEXT NOT NULL DEFAULT '[]',  -- JSON array of filter configs
  duration REAL,
  waveform TEXT,                                -- JSON array of peaks
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## API Endpoints

### Auth
| Method | Path                 | Auth | Description          |
|--------|----------------------|------|----------------------|
| POST   | `/api/auth/register` | No   | Create account       |
| POST   | `/api/auth/login`    | No   | Login, returns JWT   |
| GET    | `/api/auth/me`       | Yes  | Current user info    |

### Clips
| Method | Path                          | Auth       | Description                          |
|--------|-------------------------------|------------|--------------------------------------|
| GET    | `/api/clips`                  | No         | Public feed (all clips, paginated)   |
| GET    | `/api/users/{username}/clips` | No         | User's clips                         |
| POST   | `/api/clips`                  | Yes        | Upload clip (raw + filtered + meta)  |
| GET    | `/api/clips/{id}`             | No         | Clip metadata + filterSettings       |
| GET    | `/api/clips/{id}/audio`       | No         | Stream filtered audio                |
| GET    | `/api/clips/{id}/raw`         | Owner only | Stream raw audio (for re-editing)    |
| PUT    | `/api/clips/{id}`             | Owner only | Update filtered audio + filters      |
| DELETE | `/api/clips/{id}`             | Owner only | Delete clip                          |

### Server-Side Filters
| Method | Path                                  | Auth | Description                              |
|--------|---------------------------------------|------|------------------------------------------|
| GET    | `/api/filters`                        | No   | List available server-side filters       |
| POST   | `/api/filters/{filter_id}/process`    | Yes  | Process audio through a server filter    |

---

## Storage Abstraction

```python
from abc import ABC, abstractmethod
from typing import AsyncIterator

class StorageProvider(ABC):
    @abstractmethod
    async def save(self, key: str, data: bytes) -> str: ...

    @abstractmethod
    async def get(self, key: str) -> bytes: ...

    @abstractmethod
    async def get_stream(self, key: str) -> AsyncIterator[bytes]: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...

    @abstractmethod
    def get_url(self, key: str) -> str: ...
```

### Implementations
- **LocalStorageProvider** — `uploads/` directory, served via `FileResponse`. Default for dev.
- **S3StorageProvider** — `aiobotocore` / `boto3`, configurable bucket/region. For production.
- New providers (GCS, Azure Blob, etc.) just subclass `StorageProvider`.

### Configuration (env vars)
```
STORAGE_PROVIDER=local|s3
STORAGE_LOCAL_PATH=./uploads
STORAGE_S3_BUCKET=cliplab-audio
STORAGE_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

---

## Pluggable Filter System

### Two-Tier Architecture

Filters operate in two tiers:

1. **Client-side (Web Audio API)** — real-time DSP filters that run in the browser.
   Fast, zero-latency preview. Handles standard audio effects.

2. **Server-side (Python)** — heavyweight or ML-based filters that run on the backend.
   Client sends audio to the server, server processes and returns the result.
   Enables LLM-driven transforms, ML models, librosa-based processing, etc.

Both tiers share the same `FilterPlugin` interface on the frontend. The `serverSide` flag determines execution path.

### Client-Side Filter Plugin Interface

```typescript
interface FilterPlugin {
  /** Unique identifier, used in saved filterSettings */
  id: string;

  /** Display name in UI */
  name: string;

  /** Category for grouping: 'eq' | 'dynamics' | 'effects' | 'ai' | string */
  category: string;

  /** Parameter definitions (drives the UI controls) */
  params: FilterParamDef[];

  /**
   * If true, processing happens server-side via POST /api/filters/{id}/process.
   * createNodes() should return a passthrough (or be omitted).
   */
  serverSide?: boolean;

  /** Create the Web Audio nodes for this filter (client-side only) */
  createNodes?(ctx: AudioContext, params: Record<string, number>): AudioNode[];

  /** Optional: custom UI component for complex filters */
  controlComponent?: React.ComponentType<FilterControlProps>;
}

interface FilterParamDef {
  key: string;
  label: string;
  type: 'range' | 'select' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
  default: number;
  options?: { label: string; value: number }[];
}
```

### Server-Side Filter Plugin Interface (Python)

```python
from abc import ABC, abstractmethod
import numpy as np

class ServerFilter(ABC):
    """Base class for server-side audio filters."""

    @property
    @abstractmethod
    def id(self) -> str: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def category(self) -> str: ...

    @property
    @abstractmethod
    def params(self) -> list[dict]: ...

    @abstractmethod
    async def process(
        self,
        audio: np.ndarray,
        sample_rate: int,
        params: dict,
    ) -> np.ndarray:
        """Process audio array and return transformed audio."""
        ...
```

### Server-Side Filter Registry (Python)

```python
# server/app/filters/registry.py
_registry: dict[str, ServerFilter] = {}

def register_filter(f: ServerFilter) -> None: ...
def get_filter(filter_id: str) -> ServerFilter | None: ...
def get_all_filters() -> list[ServerFilter]: ...
```

### Client-Side Flow for Server Filters

1. User selects a server-side filter (e.g., "AI Denoise")
2. UI shows params + a "Process" button (no real-time preview)
3. Client sends raw audio blob to `POST /api/filters/{filter_id}/process`
4. Server decodes audio → runs filter → returns processed audio blob
5. Client receives processed audio, replaces the working buffer
6. User can preview the result, then upload

### Built-in Filters

**Client-side (Phase 4):**
| ID           | Category   | Params                            |
|--------------|------------|-----------------------------------|
| `gain`       | eq         | level (0–3)                       |
| `lowpass`    | eq         | frequency (20–20000), Q (0–20)    |
| `highpass`   | eq         | frequency (20–20000), Q (0–20)    |
| `compressor` | dynamics   | threshold, ratio, attack, release |
| `delay`      | effects    | delayTime (0–2s), feedback (0–0.9)|

**Server-side (Phase 9 — future):**
| ID             | Category | Params                    | Backend                |
|----------------|----------|---------------------------|------------------------|
| `ai-denoise`   | ai       | strength (0–1)            | librosa / custom model |
| `voice-style`  | ai       | style (warm/bright/radio) | ML model               |
| `transcribe`   | ai       | language                  | Whisper / LLM API      |

### Adding a New Client-Side Filter

```typescript
// filters/reverb.ts
export const reverbFilter: FilterPlugin = {
  id: 'reverb',
  name: 'Reverb',
  category: 'effects',
  params: [{ key: 'decay', label: 'Decay', type: 'range', min: 0.1, max: 10, step: 0.1, default: 2 }],
  createNodes(ctx, params) { /* ... */ },
};

// filters/registry.ts — add import + registerFilter(reverbFilter)
```

### Adding a New Server-Side Filter

```python
# server/app/filters/ai_denoise.py
class AiDenoiseFilter(ServerFilter):
    id = "ai-denoise"
    name = "AI Denoise"
    category = "ai"
    params = [{"key": "strength", "label": "Strength", "type": "range", "min": 0, "max": 1, "step": 0.1, "default": 0.5}]

    async def process(self, audio: np.ndarray, sample_rate: int, params: dict) -> np.ndarray:
        # Use librosa, a trained model, or an LLM API call
        ...

# server/app/filters/registry.py — register_filter(AiDenoiseFilter())
```

### Adding a New Client-Side Filter for a Server-Side Filter

```typescript
// filters/ai-denoise.ts — thin client stub
export const aiDenoiseFilter: FilterPlugin = {
  id: 'ai-denoise',
  name: 'AI Denoise',
  category: 'ai',
  serverSide: true,
  params: [{ key: 'strength', label: 'Strength', type: 'range', min: 0, max: 1, step: 0.1, default: 0.5 }],
  // No createNodes — processing happens on server
};
```

---

## Filter Settings JSON Format

Stored in `clips.filter_settings` and sent between client/server:

```json
[
  {
    "filterId": "gain",
    "enabled": true,
    "params": { "level": 1.5 }
  },
  {
    "filterId": "lowpass",
    "enabled": false,
    "params": { "frequency": 1000, "Q": 1 }
  },
  {
    "filterId": "ai-denoise",
    "enabled": true,
    "params": { "strength": 0.7 }
  }
]
```

Order in the array = order in the audio processing chain.

---

## Implementation Phases

### Phase 1: Project Setup
- [ ] Init project structure (`client/` + `server/`)
- [ ] Vite + React + TS for client
- [ ] Python venv (`server/.venv`) + `pip install -r requirements.txt`
- [ ] FastAPI + uvicorn for server, with auto-reload
- [ ] Vite proxy config (dev requests → FastAPI on port 8000)
- [ ] ESLint + Prettier for client
- [ ] Ruff for server (linting + formatting)
- [ ] Setup Vitest for client
- [ ] Setup pytest + pytest-asyncio for server
- [ ] Setup Playwright for E2E
- [ ] Makefile with dev/build/test commands

**Tests:**
- Vitest config runs and reports 0 tests (smoke test the setup)
- pytest runs and reports 0 tests
- Playwright config runs and reports 0 tests
- `make dev` starts both client and server without errors
- Client can fetch from server through Vite proxy (e.g., `GET /api/health` → 200)

---

### Phase 2: Auth (Backend + Frontend)
- [ ] `users` table + SQLAlchemy model
- [ ] Pydantic schemas for register/login request/response
- [ ] `POST /api/auth/register` — validate input, hash password, insert user, return JWT
- [ ] `POST /api/auth/login` — verify credentials, return JWT
- [ ] `GET /api/auth/me` — return current user from token
- [ ] Auth dependency (`get_current_user`) using FastAPI `Depends`
- [ ] `AuthContext` provider on frontend
- [ ] `useAuth` hook (login, register, logout, current user)
- [ ] Login + Register pages
- [ ] Protected route wrapper
- [ ] Auth header injection in API client

**Tests:**
- **Unit (server, pytest):** password hashing, JWT generation/verification, input validation (Pydantic)
- **Integration (server, httpx AsyncClient):**
  - Register with valid data → 201 + JWT
  - Register with duplicate username → 409
  - Register with missing fields → 422
  - Login with valid credentials → 200 + JWT
  - Login with wrong password → 401
  - Access protected route without token → 401
  - Access protected route with valid token → 200
- **Unit (client, Vitest):** `useAuth` hook state transitions (mock API)
- **E2E (Playwright):**
  - Register flow → redirects to home
  - Login flow → shows logged-in state
  - Logout → returns to guest state

---

### Phase 3: Audio Recording
- [ ] `useRecorder` hook — request mic, start/stop, produce Blob (webm/opus)
- [ ] `Recorder` component — record button (idle / recording / stopped states)
- [ ] Basic playback of raw recording via `<audio>` element
- [ ] Duration tracking

**Tests:**
- **Unit (client, Vitest):** `useRecorder` hook with mocked `MediaRecorder` and `getUserMedia`
  - State transitions: idle → recording → stopped
  - Produces a Blob on stop
  - Handles mic permission denial gracefully
- **E2E (Playwright):**
  - Grant mic permission → record button enabled
  - Click record → stop → audio player appears with playback controls

---

### Phase 4: Pluggable Filter System (Client-Side)
- [ ] Define `FilterPlugin` and `FilterParamDef` interfaces in `filters/types.ts`
- [ ] Implement filter registry (`registerFilter`, `getFilter`, `getAllFilters`)
- [ ] Implement built-in filters: gain, lowpass, highpass, compressor, delay
- [ ] `useFilterChain` hook — build/rebuild Web Audio graph from enabled filters
- [ ] `FilterChain` component — list filters, toggle on/off, adjust params
- [ ] `FilterControl` component — render controls from `FilterParamDef`
- [ ] `AudioPreview` component — play recording through filter chain
- [ ] Render filtered audio to Blob via `OfflineAudioContext` for upload

**Tests:**
- **Unit (client, Vitest):**
  - Registry: register, retrieve, list, list by category
  - Each built-in filter: `createNodes()` returns valid AudioNode(s) (mock AudioContext)
  - `useFilterChain`: toggling a filter rebuilds the graph
  - `useFilterChain`: changing a param updates the node
  - Filter chain serialization/deserialization (params → JSON → params)
- **Integration (client, Vitest):**
  - Load a test audio buffer → apply gain filter → verify output amplitude changes
  - Stack multiple filters → verify all are applied in order
- **E2E (Playwright):**
  - Record audio → enable a filter → preview plays without errors
  - Toggle filter off → preview plays without the effect
  - Adjust slider → effect changes audibly (verify no errors at minimum)

---

### Phase 5: Storage Abstraction
- [ ] Define `StorageProvider` ABC
- [ ] Implement `LocalStorageProvider`
- [ ] Implement `S3StorageProvider`
- [ ] Provider factory with env-based config via pydantic-settings
- [ ] Inject provider via FastAPI dependency

**Tests:**
- **Unit (server, pytest):**
  - `LocalStorageProvider`: save → file exists on disk, get → returns same data, delete → file removed, get_stream → async iterator
  - `S3StorageProvider`: mock boto3/aiobotocore calls, verify correct API calls
  - Factory: returns correct provider based on env var
- **Integration (server, pytest):**
  - Save + get roundtrip with LocalStorageProvider and temp directory
  - Save + delete → get raises FileNotFoundError

---

### Phase 6: Clip Upload & API
- [ ] `clips` table + SQLAlchemy model
- [ ] Pydantic schemas for clip request/response
- [ ] `POST /api/clips` — accept multipart (raw audio + filtered audio + title + filterSettings), save via storage provider, insert DB row
- [ ] `GET /api/clips` — list clips with pagination (public feed)
- [ ] `GET /api/users/{username}/clips` — user's clips
- [ ] `GET /api/clips/{id}` — single clip metadata
- [ ] `GET /api/clips/{id}/audio` — stream filtered audio via `StreamingResponse`
- [ ] `GET /api/clips/{id}/raw` — stream raw audio (owner only)
- [ ] `PUT /api/clips/{id}` — update filtered audio + filterSettings (owner only)
- [ ] `DELETE /api/clips/{id}` — delete clip + files (owner only)
- [ ] Frontend upload flow: render filtered blob → send raw + filtered + settings via FormData

**Tests:**
- **Integration (server, httpx AsyncClient):**
  - Upload clip → 201, returns clip object with id
  - Upload without auth → 401
  - List clips → returns array with uploaded clip
  - Get clip by id → returns metadata + filterSettings
  - Stream audio → returns audio file with correct content-type
  - Stream raw audio as owner → 200
  - Stream raw audio as non-owner → 403
  - Update clip as owner → 200, filtered audio replaced
  - Update clip as non-owner → 403
  - Delete clip as owner → 204, files removed from storage
  - Delete clip as non-owner → 403
  - Pagination: upload 15 clips, page 1 returns 10, page 2 returns 5
- **E2E (Playwright):**
  - Login → record → apply filter → upload → clip appears in feed
  - Click clip in feed → detail page loads with playback

---

### Phase 7: Feed & Detail Pages
- [ ] `ClipFeed` component — fetch + render clip list, play inline
- [ ] `ClipDetail` component — full clip view, playback, waveform
- [ ] "Edit Filters" mode on detail page (owner only):
  - Load raw audio + saved filterSettings
  - Modify filters + preview
  - Save → re-render filtered audio → PUT to server
- [ ] `MyClips` page — logged-in user's clips
- [ ] React Router: `/` (home), `/clips/:id` (detail), `/my-clips`, `/login`, `/register`

**Tests:**
- **Unit (client, Vitest):**
  - `ClipFeed` renders clip list from mock data
  - `ClipDetail` renders metadata, shows edit button for owner, hides for non-owner
- **E2E (Playwright):**
  - Feed loads and displays clips with titles and dates
  - Click clip → navigates to detail page
  - Play button on detail page → audio plays
  - Owner: edit filters → change a param → save → updated clip plays with new effect
  - Non-owner: no edit button visible

---

### Phase 8: Waveform Generation
- [ ] Server-side: on upload/update, decode audio with librosa → compute peaks array (~100–200 values)
- [ ] Store peaks JSON in `waveform` column
- [ ] `WaveformView` component — render peaks as SVG bars
- [ ] Playback position indicator synced with audio element

**Tests:**
- **Unit (server, pytest):**
  - Peaks generation: provide known audio buffer → verify peaks array length and value range (0–1)
  - Empty/silent audio → all peaks near 0
- **Unit (client, Vitest):**
  - `WaveformView` renders correct number of bars from mock peaks
  - Playback position updates on time change
- **E2E (Playwright):**
  - Upload clip → detail page shows waveform
  - Play clip → position indicator moves

---

### Phase 9: Server-Side Filters (AI / ML)
- [ ] Define `ServerFilter` ABC in `server/app/filters/base.py`
- [ ] Implement server-side filter registry
- [ ] `GET /api/filters` — list available server-side filters (id, name, category, params)
- [ ] `POST /api/filters/{filter_id}/process` — accept audio file + params, run filter, return processed audio
- [ ] Client-side: add `serverSide` filter stubs (thin plugins with no `createNodes`)
- [ ] Client-side: "Process" button for server-side filters → upload audio → receive processed audio
- [ ] Example filter: AI Denoise (librosa spectral gating or a simple model)
- [ ] Integrate server-side filter results into the filter chain flow (replace working buffer)

**Tests:**
- **Unit (server, pytest):**
  - Registry: register, retrieve, list filters
  - AI Denoise: provide noisy audio → output has lower noise floor (basic assertion on RMS)
  - Process endpoint: invalid filter_id → 404
  - Process endpoint: missing audio → 422
- **Integration (server, httpx AsyncClient):**
  - `GET /api/filters` → returns list with ai-denoise
  - `POST /api/filters/ai-denoise/process` with audio file → returns processed audio with correct content-type
  - Process without auth → 401
- **E2E (Playwright):**
  - Record audio → select AI Denoise → click Process → processed audio replaces preview
  - Upload clip with server-side filter in filterSettings → clip saves successfully

---

## Environment Variables

```env
# Server
PORT=8000
JWT_SECRET=your-secret-key
DB_PATH=./data/cliplab.db

# Storage
STORAGE_PROVIDER=local          # local | s3
STORAGE_LOCAL_PATH=./uploads
STORAGE_S3_BUCKET=cliplab-audio
STORAGE_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# AI / ML (future)
OPENAI_API_KEY=...              # For LLM-based audio processing
MODEL_PATH=./models/            # Local model weights
```

---

## Dev Commands (Makefile)

```makefile
# Setup
setup:          # Run both setup-client and setup-server
setup-client:   # cd client && npm install
setup-server:   # cd server && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# Development
dev:            # Start both client (Vite) and server (uvicorn --reload) concurrently
dev-client:     # cd client && npx vite
dev-server:     # cd server && .venv/bin/uvicorn app.main:app --reload --port 8000

# Testing
test:           # Run all tests (client + server)
test-client:    # cd client && npx vitest run
test-server:    # cd server && .venv/bin/python -m pytest
test-e2e:       # cd e2e && npx playwright test

# Build
build:          # Build client (vite build) + verify server
lint:           # Run ESLint (client) + .venv/bin/ruff check (server)
```

> **Note:** All server commands use `server/.venv/bin/` prefix to run within the virtual environment without requiring manual activation.

---

## Python Dependencies (server/requirements.txt)

```
fastapi>=0.115
uvicorn[standard]>=0.34
python-jose[cryptography]>=3.3
passlib[bcrypt]>=1.7
python-multipart>=0.0.20
pydantic-settings>=2.7
sqlalchemy>=2.0
aiosqlite>=0.21
librosa>=0.10
soundfile>=0.13
numpy>=2.0
httpx>=0.28               # For testing
pytest>=8.0
pytest-asyncio>=0.25
```
