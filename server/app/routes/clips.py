import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Clip, User
from app.storage.base import StorageProvider
from app.storage.factory import create_storage_provider
from app.waveform import generate_peaks

router = APIRouter(prefix="/api/clips", tags=["clips"])

_storage: StorageProvider | None = None


def get_storage() -> StorageProvider:
    global _storage
    if _storage is None:
        _storage = create_storage_provider()
    return _storage


def _serve_audio(data: bytes, media_type: str, request: Request) -> Response:
    """Serve audio with range request support for <audio> elements."""
    total = len(data)
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else total - 1
        end = min(end, total - 1)

        return Response(
            content=data[start : end + 1],
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
                "Content-Type": media_type,
            },
        )

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(total),
        },
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_clip(
    title: str = Form(...),
    filter_settings: str = Form("[]"),
    raw_audio: UploadFile = File(...),
    filtered_audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageProvider = Depends(get_storage),
):
    clip_id = str(uuid.uuid4())
    raw_ext = raw_audio.filename.rsplit(".", 1)[-1] if raw_audio.filename else "webm"
    filtered_ext = filtered_audio.filename.rsplit(".", 1)[-1] if filtered_audio.filename else "wav"

    raw_key = f"{clip_id}/raw.{raw_ext}"
    filtered_key = f"{clip_id}/filtered.{filtered_ext}"

    raw_data = await raw_audio.read()
    filtered_data = await filtered_audio.read()

    await storage.save(raw_key, raw_data)
    await storage.save(filtered_key, filtered_data)

    waveform = generate_peaks(filtered_data)

    clip = Clip(
        id=clip_id,
        user_id=current_user.id,
        title=title,
        raw_filename=raw_key,
        filtered_filename=filtered_key,
        filter_settings=filter_settings,
        waveform=waveform,
    )
    db.add(clip)
    await db.commit()
    await db.refresh(clip)

    return _clip_response(clip, current_user.username)


@router.get("")
async def list_clips(
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(Clip, User.username)
        .join(User)
        .order_by(Clip.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    return [_clip_response(clip, username) for clip, username in rows]


@router.get("/{clip_id}")
async def get_clip(clip_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Clip, User.username).join(User).where(Clip.id == clip_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Clip not found")
    clip, username = row
    return _clip_response(clip, username)


@router.get("/{clip_id}/audio")
async def serve_audio(
    clip_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
):
    clip = await _get_clip_or_404(clip_id, db)
    data = await storage.get(clip.filtered_filename)
    return _serve_audio(data, "audio/wav", request)


@router.get("/{clip_id}/raw")
async def serve_raw_audio(
    clip_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageProvider = Depends(get_storage),
):
    clip = await _get_clip_or_404(clip_id, db)
    if clip.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the clip owner")
    data = await storage.get(clip.raw_filename)
    return _serve_audio(data, "audio/webm", request)


@router.put("/{clip_id}")
async def update_clip(
    clip_id: str,
    filter_settings: str = Form(...),
    filtered_audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageProvider = Depends(get_storage),
):
    clip = await _get_clip_or_404(clip_id, db)
    if clip.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the clip owner")

    filtered_data = await filtered_audio.read()
    await storage.save(clip.filtered_filename, filtered_data)

    clip.filter_settings = filter_settings
    clip.waveform = generate_peaks(filtered_data)
    await db.commit()
    await db.refresh(clip)

    return _clip_response(clip, current_user.username)


@router.delete("/{clip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_clip(
    clip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage: StorageProvider = Depends(get_storage),
):
    clip = await _get_clip_or_404(clip_id, db)
    if clip.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not the clip owner")

    await storage.delete(clip.raw_filename)
    await storage.delete(clip.filtered_filename)
    await db.delete(clip)
    await db.commit()


async def _get_clip_or_404(clip_id: str, db: AsyncSession) -> Clip:
    result = await db.execute(select(Clip).where(Clip.id == clip_id))
    clip = result.scalar_one_or_none()
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return clip


def _clip_response(clip: Clip, username: str) -> dict:
    return {
        "id": clip.id,
        "user_id": clip.user_id,
        "username": username,
        "title": clip.title,
        "filter_settings": clip.filter_settings,
        "duration": clip.duration,
        "waveform": clip.waveform,
        "created_at": clip.created_at,
        "updated_at": clip.updated_at,
    }
