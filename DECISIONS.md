# Architecture Decisions

This document explains the key architectural choices made in ClipLab and the reasoning behind them.

---

## Overview

ClipLab is a full-stack audio recording and processing application. The architecture prioritizes:

1. **Real-time user experience** - Instant feedback when adjusting filters
2. **Non-destructive editing** - Users can always re-edit their original recordings
3. **Simplicity** - Minimal infrastructure for development, with clear upgrade paths for production

---

## Client-Side Audio Processing

**Decision:** All audio filtering happens in the browser using the Web Audio API.

**Why:**

- **Instant preview** - Users hear filter changes in real-time without network latency
- **Reduced server load** - No CPU-intensive audio processing on the backend
- **Offline capability** - Recording and previewing works without network connectivity
- **Lower costs** - No need for audio processing infrastructure

**Tradeoffs:**

- Limited to Web Audio API capabilities (no ML-based effects like noise reduction)
- Browser compatibility variations in audio codec support
- Can't leverage Python audio libraries (librosa, PyTorch) for advanced processing

**Future path:** Add optional server-side processing for ML-based filters by extending the `FilterPlugin` interface with a `serverSide: true` flag.

---

## Dual Audio Storage (Raw + Filtered)

**Decision:** Store both the original recording and the filtered version for each clip.

**Why:**

- **Non-destructive editing** - Users can re-apply different filters without quality loss
- **Quality preservation** - Original audio is never re-encoded
- **Audit trail** - Always have access to what was actually recorded

**Tradeoffs:**

- 2x storage cost per clip
- More complex upload flow (two files per clip)

**Alternative considered:** Store only raw audio and render filtered version on-demand. Rejected because it would require server-side filter processing and add latency to playback.

---

## Storage Abstraction Layer

**Decision:** Abstract file storage behind a `StorageProvider` interface with local and S3 implementations.

```
StorageProvider (base.py)
├── LocalStorageProvider (local.py)  → Development
└── S3StorageProvider (s3.py)        → Production
```

**Why:**

- **Environment parity** - Same code paths in dev and prod
- **Easy testing** - Can mock storage in tests
- **Flexibility** - Can add new providers (GCS, Azure Blob) without changing application code

**Configuration:** Set `STORAGE_PROVIDER=s3` in production with appropriate AWS credentials.

---

## SQLite with Async Driver

**Decision:** Use SQLite with aiosqlite for the database.

**Why:**

- **Zero setup** - No database server to install or configure
- **Single file** - Easy to backup, inspect, and reset during development
- **Async support** - aiosqlite keeps FastAPI non-blocking
- **Good enough** - Handles moderate read/write loads for small-to-medium deployments

**Tradeoffs:**

- Single-writer limitation (no concurrent writes)
- Not suitable for horizontal scaling

**Production path:** Migrate to PostgreSQL when needed. SQLAlchemy ORM makes this a configuration change rather than a code rewrite.

---

## JWT Authentication in localStorage

**Decision:** Store JWT tokens in localStorage and send via `Authorization` header.

**Why:**

- **SPA-friendly** - Works naturally with React's fetch-based architecture
- **Stateless** - No server-side session storage needed
- **Simple** - Easy to implement and debug

**Tradeoffs:**

- Vulnerable to XSS attacks (malicious scripts can read localStorage)
- Token refresh requires explicit handling

**Production recommendation:** Switch to httpOnly cookies with CSRF protection for better security. The current approach is acceptable for development and internal tools.

---

## Pluggable Filter Architecture

**Decision:** Filters are self-contained plugins that register themselves with a central registry.

```typescript
interface FilterPlugin {
  id: string;
  name: string;
  params: ParamDefinition[];
  createNodes(ctx: AudioContext, params: Record<string, number>): AudioNode[];
}
```

**Why:**

- **Extensibility** - Add new filters without modifying existing code
- **Encapsulation** - Each filter owns its UI parameters and audio node creation
- **Testability** - Filters can be tested in isolation

**Adding a filter:**

1. Create a new file in `client/src/filters/`
2. Implement the `FilterPlugin` interface
3. Register it in `registry.ts`

---

## Waveform Generation on Upload

**Decision:** Generate waveform peaks server-side during upload using librosa.

**Why:**

- **Consistent visualization** - Same algorithm for all clips
- **Reduced client work** - Browser doesn't need to decode full audio for visualization
- **Cached** - Peaks stored in database, no recomputation on each view

**Implementation:** `server/app/waveform.py` extracts 150 normalized amplitude peaks, stored as JSON in the clip record.

---

## Monorepo Structure

**Decision:** Single repository with `client/` and `server/` directories.

```
ClipLab/
├── client/          # React SPA
├── server/          # FastAPI backend
├── Makefile         # Unified commands
└── README.md
```

**Why:**

- **Atomic changes** - Frontend and backend changes in single commits
- **Shared tooling** - One Makefile for all operations
- **Simpler CI** - Single pipeline for the entire application

**Tradeoff:** Slightly more complex if teams want to deploy frontend and backend independently. For a small project, the benefits outweigh this.

---

## API Design

**Decision:** RESTful API with resource-based URLs and standard HTTP methods.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clips` | GET | List clips |
| `/api/clips` | POST | Create clip |
| `/api/clips/{id}` | GET | Get clip metadata |
| `/api/clips/{id}/audio` | GET | Stream filtered audio |
| `/api/clips/{id}/raw` | GET | Stream raw audio (owner only) |

**Why:**

- **Predictable** - Standard REST conventions
- **Cacheable** - GET requests can be cached by CDN
- **Range support** - Audio endpoints support HTTP Range headers for seeking

---

## What's Not Included (and Why)

| Feature | Reason |
|---------|--------|
| WebSocket for real-time | Not needed - no collaborative or live features |
| GraphQL | REST is sufficient for this data model |
| Redis/caching layer | SQLite is fast enough for current scale |
| Message queue | No async jobs beyond request/response |
| Docker | Adds complexity; easy to add later |

These can be added as the application grows, but starting simple reduces initial complexity and maintenance burden.
