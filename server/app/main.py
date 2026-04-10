import uuid
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.models import Base
from app.routes.auth import router as auth_router
from app.routes.clips import router as clips_router
from app.routes.soundboards import router as soundboards_router


async def _migrate_soundboard_pads(conn) -> list[tuple[str, str, str, int]] | None:
    """If an old soundboard_pads table exists with soundboard_id, snapshot its
    rows and drop the table so create_all rebuilds it with the new schema.
    Returns the snapshot or None if no migration is needed."""
    exists = (
        await conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='soundboard_pads'")
        )
    ).first()
    if not exists:
        return None

    cols = [row[1] for row in (await conn.execute(text("PRAGMA table_info(soundboard_pads)"))).all()]
    if "soundboard_id" not in cols:
        return None

    rows = (
        await conn.execute(
            text(
                "SELECT id, soundboard_id, clip_id, position FROM soundboard_pads "
                "ORDER BY soundboard_id, position"
            )
        )
    ).all()
    await conn.execute(text("DROP TABLE soundboard_pads"))
    return [(r[0], r[1], r[2], r[3]) for r in rows]


async def _restore_snapshot_as_tracks(conn, snapshot: list[tuple[str, str, str, int]]) -> None:
    grouped: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    for pad_id, soundboard_id, clip_id, position in snapshot:
        grouped[soundboard_id].append((pad_id, clip_id, position))

    for soundboard_id, pads in grouped.items():
        track_id = str(uuid.uuid4())
        await conn.execute(
            text(
                "INSERT INTO soundboard_tracks (id, soundboard_id, position) "
                "VALUES (:id, :sb, 0)"
            ),
            {"id": track_id, "sb": soundboard_id},
        )
        for pad_id, clip_id, position in pads:
            await conn.execute(
                text(
                    "INSERT INTO soundboard_pads (id, track_id, clip_id, position) "
                    "VALUES (:id, :t, :c, :p)"
                ),
                {"id": pad_id, "t": track_id, "c": clip_id, "p": position},
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        snapshot = await _migrate_soundboard_pads(conn)
        await conn.run_sync(Base.metadata.create_all)
        if snapshot:
            await _restore_snapshot_as_tracks(conn, snapshot)
    yield


app = FastAPI(title="ClipLab API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(clips_router)
app.include_router(soundboards_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
