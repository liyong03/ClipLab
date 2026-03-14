# Architecture Decisions

## System Overview

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React + Vite   │ ──── │  FastAPI        │ ──── │  SQLite         │
│  Web Audio API  │ /api │  Python 3.11    │      │  + S3/Local     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Browser                  Server                  Storage
```

## Key Decisions

### 1. Client-Side Audio Processing (Web Audio API)

**Why:** Users hear filter changes instantly without server round-trips. Reduces server load and costs.

**Tradeoff:** Can't use ML-based effects (noise reduction) that require Python libraries.

### 2. Store Both Raw + Filtered Audio

**Why:** Non-destructive editing. Users can re-apply different filters to their original recording without quality loss.

**Tradeoff:** 2x storage cost per clip.

### 3. SQLite (not PostgreSQL)

**Why:** Zero setup, single-file database. Async driver (aiosqlite) keeps FastAPI non-blocking.

**Tradeoff:** Single-writer limitation. Migrate to PostgreSQL when scaling is needed.

### 4. Storage Abstraction (Local / S3)

**Why:** Same code in dev and prod. Set `STORAGE_PROVIDER=s3` for production.

### 5. JWT in localStorage

**Why:** Simple, stateless, SPA-friendly.

**Tradeoff:** Vulnerable to XSS. Production should use httpOnly cookies.

### 6. Pluggable Filter System

**Why:** Add new filters by implementing `FilterPlugin` interface and registering in `registry.ts`. No changes to existing code.

## What's Intentionally Omitted

| Omitted | Reason |
|---------|--------|
| WebSocket | No real-time collaboration needed |
| Redis | SQLite is fast enough for current scale |
| Docker | Easy to add later; reduces initial complexity |
| Server-side filtering | Web Audio API covers current needs |
