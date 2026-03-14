# ClipLab

Audio recording, filtering, and sharing web application. Record audio in the browser, apply stackable audio filters, preview the result, and share clips in a public feed.

## Features

- Browser-based audio recording via MediaRecorder API
- Stackable, toggleable audio filters (gain, low-pass, high-pass, compressor, delay/echo)
- Real-time filter preview via Web Audio API
- Upload clips with raw + filtered audio + filter settings
- Edit filters on existing clips and re-render
- Public clip feed with playback
- Per-clip waveform visualization
- User auth (register/login) with JWT
- Owner-only clip editing and deletion
- Pluggable filter architecture (easy to add new client-side or server-side filters)
- Abstract storage layer (local filesystem or S3)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite), Web Audio API |
| Backend | Python + FastAPI |
| Database | SQLite (aiosqlite + SQLAlchemy) |
| Storage | Local filesystem (dev) / S3 (prod) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Audio | librosa, soundfile (waveform generation) |
| Testing | Vitest (client), pytest (server) |

## Prerequisites

- Node.js >= 18
- Python >= 3.11
- npm

## Quick Start

### 1. Clone and setup

```bash
git clone <repo-url>
cd ClipLab
make setup
```

Or manually:

```bash
# Client
cd client && npm install

# Server
cd server
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### 2. Run development servers

```bash
make dev
```

This starts:
- Frontend at http://localhost:5173 (Vite dev server)
- Backend at http://localhost:8000 (FastAPI with auto-reload)

The Vite dev server proxies `/api` requests to the backend.

Or run them separately:

```bash
# Terminal 1
make dev-server

# Terminal 2
make dev-client
```

### 3. Open the app

Navigate to http://localhost:5173

1. Register an account
2. Click **Record** and allow microphone access
3. Stop recording, toggle filters, adjust parameters
4. Click **Preview with Filters** to hear the result
5. Enter a title and click **Upload**
6. Your clip appears in the feed

## Running Tests

```bash
# All tests
make test

# Client only
make test-client

# Server only
make test-server
```

## Project Structure

```
ClipLab/
├── client/                     # React SPA
│   └── src/
│       ├── components/         # UI components (Recorder, FilterChain, ClipFeed, etc.)
│       ├── filters/            # Pluggable filter plugins + registry
│       ├── hooks/              # useRecorder, useFilterChain, useAuth
│       ├── context/            # AuthContext
│       ├── pages/              # Home, Login, Register, Clip, MyClips
│       └── lib/                # API client
├── server/                     # FastAPI backend
│   ├── app/
│   │   ├── routes/             # auth.py, clips.py
│   │   ├── storage/            # Abstract storage (local, S3)
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── waveform.py         # Peaks generation (librosa)
│   │   └── config.py           # Settings via pydantic-settings
│   └── tests/                  # pytest tests
├── Makefile
└── PLAN.md                     # Full implementation plan
```

## Configuration

Create `server/.env` to override defaults:

```env
PORT=8000
JWT_SECRET=change-me-in-production
DB_PATH=./data/cliplab.db

# Storage: "local" (default) or "s3"
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads

# S3 (when STORAGE_PROVIDER=s3)
STORAGE_S3_BUCKET=cliplab-audio
STORAGE_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Current user info |

### Clips
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/clips` | No | List clips (paginated: `?page=1&limit=10`) |
| POST | `/api/clips` | Yes | Upload clip (multipart: raw_audio, filtered_audio, title, filter_settings) |
| GET | `/api/clips/{id}` | No | Clip metadata |
| GET | `/api/clips/{id}/audio` | No | Stream filtered audio |
| GET | `/api/clips/{id}/raw` | Owner | Stream raw audio |
| PUT | `/api/clips/{id}` | Owner | Update filtered audio + filter settings |
| DELETE | `/api/clips/{id}` | Owner | Delete clip |

## Adding a New Filter

### Client-side filter (Web Audio)

Create a file in `client/src/filters/`:

```typescript
// filters/reverb.ts
import type { FilterPlugin } from './types';

export const reverbFilter: FilterPlugin = {
  id: 'reverb',
  name: 'Reverb',
  category: 'effects',
  params: [
    { key: 'decay', label: 'Decay', type: 'range', min: 0.1, max: 10, step: 0.1, default: 2 },
  ],
  createNodes(ctx, params) {
    // Build Web Audio nodes here
  },
};
```

Register it in `client/src/filters/registry.ts`:

```typescript
import { reverbFilter } from './reverb';
registerFilter(reverbFilter);
```

### Server-side filter (Python/ML)

The filter plugin system supports `serverSide: true` filters that process audio on the backend. See `PLAN.md` Phase 9 for the full architecture. This enables AI/ML-based audio processing (denoising, style transfer, etc.) via Python libraries like librosa, PyTorch, or external APIs.

## Linting

```bash
make lint
```

Runs ESLint on the client and Ruff on the server.
