# ClipLab

Audio recording, filtering, and sharing web application. Record audio in the browser, apply stackable audio filters, preview the result, and share clips in a public feed.

## How to Run Locally

### Prerequisites

- Node.js >= 18
- Python >= 3.11
- npm

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd ClipLab

# Install all dependencies (client + server)
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

### Run Development Servers

```bash
make dev
```

This starts:
- **Frontend** at http://localhost:5173 (Vite dev server)
- **Backend** at http://localhost:8000 (FastAPI with auto-reload)

The Vite dev server proxies `/api` requests to the backend.

Or run them separately in two terminals:

```bash
# Terminal 1 - Backend
make dev-server

# Terminal 2 - Frontend
make dev-client
```

### Using the App

1. Open http://localhost:5173
2. Register an account
3. Click **Record** and allow microphone access
4. Stop recording, toggle filters, adjust parameters
5. Click **Preview with Filters** to hear the result
6. Enter a title and click **Upload**
7. Your clip appears in the feed

### Running Tests

```bash
make test          # All tests
make test-client   # Client only (Vitest)
make test-server   # Server only (pytest)
```

---

## What I Built

### Core Features (Implemented)

- **Browser-based audio recording** via MediaRecorder API
- **Stackable audio filters** with real-time preview:
  - Gain (volume control)
  - Low-pass filter (remove high frequencies)
  - High-pass filter (remove low frequencies)
  - Compressor (dynamic range compression)
  - Delay/Echo effect
- **Filter chain UI** - toggle filters on/off, adjust parameters with sliders
- **Real-time filter preview** using Web Audio API (hear changes before saving)
- **Clip upload** - stores both raw and filtered audio with filter settings
- **Edit existing clips** - re-apply different filters to raw audio and save
- **Public clip feed** with audio playback
- **Waveform visualization** for each clip (generated server-side with librosa)
- **User authentication** (register/login) with JWT tokens
- **Owner-only permissions** - only clip owners can edit/delete their clips
- **Pluggable filter architecture** - easy to add new filters
- **Abstract storage layer** - supports local filesystem (dev) and S3 (prod)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript, Vite, Web Audio API |
| Backend | Python + FastAPI |
| Database | SQLite (async via aiosqlite + SQLAlchemy 2.0) |
| Storage | Local filesystem / S3 |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Audio Processing | librosa, soundfile |
| Testing | Vitest (client), pytest (server) |

### What I Skipped

- **Server-side audio processing** - All filtering happens client-side via Web Audio API. The server stores raw audio but doesn't process it (except waveform generation).
- **Social features** - No comments, likes, follows, or user profiles beyond basic auth.
- **Search/discovery** - No search functionality or clip categorization/tagging.
- **Mobile optimization** - Basic responsive layout but not optimized for mobile recording.
- **Production deployment config** - No Docker, CI/CD, or production-ready infrastructure.
- **Rate limiting / abuse prevention** - No upload limits or spam protection.
- **Audio format conversion** - Stores whatever format the browser records (typically webm/opus).
- **E2E tests** - Test infrastructure exists but no comprehensive E2E test suite.

---

## Key Tradeoffs

### Client-side vs Server-side Audio Processing

**Chose:** Client-side filtering with Web Audio API

**Why:** Enables real-time preview without round-trips to the server. Users can hear filter changes instantly before committing. Reduces server load and storage costs.

**Tradeoff:** Limited to what Web Audio API supports. Can't use Python ML libraries (noise reduction, AI effects) without adding server-side processing pipeline.

### Storing Raw + Filtered Audio

**Chose:** Store both versions on upload

**Why:** Enables non-destructive editing. Users can re-apply different filters to the original recording without quality loss from re-encoding.

**Tradeoff:** 2x storage cost per clip. Could optimize by only storing raw and rendering filtered on-demand, but that would require server-side filter processing.

### SQLite vs PostgreSQL

**Chose:** SQLite with async driver (aiosqlite)

**Why:** Zero setup, single-file database, perfect for development and small deployments. Async driver keeps FastAPI non-blocking.

**Tradeoff:** Not suitable for high-concurrency production. Would need to migrate to PostgreSQL for scale.

### JWT in localStorage

**Chose:** Store JWT in localStorage, send via Authorization header

**Why:** Simple implementation, works well with SPA architecture, easy to debug.

**Tradeoff:** Vulnerable to XSS. Production should use httpOnly cookies with CSRF protection.

---

## Next Steps

### Short-term Improvements

1. **Add more filters** - Reverb, pitch shift, noise gate, EQ bands
2. **Server-side filter option** - Enable ML-based processing (noise reduction, voice enhancement) via Python
3. **Better error handling** - User-friendly error messages, retry logic for uploads
4. **Loading states** - Skeleton loaders, progress indicators for uploads

### Medium-term Features

1. **Search and tags** - Let users tag clips, search by title/tag
2. **User profiles** - Public profile pages showing user's clips
3. **Social features** - Likes, comments, follows
4. **Audio format normalization** - Convert all uploads to consistent format (e.g., mp3)

### Production Readiness

1. **PostgreSQL migration** - For concurrent access and better scaling
2. **Docker + docker-compose** - Containerized deployment
3. **CI/CD pipeline** - Automated testing and deployment
4. **Rate limiting** - Prevent abuse, limit upload frequency/size
5. **CDN for audio** - Serve audio files from CloudFront/similar
6. **Monitoring** - Error tracking, performance monitoring

---

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
