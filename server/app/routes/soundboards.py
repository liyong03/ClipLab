from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Clip, Soundboard, SoundboardPad, SoundboardTrack, User
from app.schemas import (
    SoundboardCreateRequest,
    SoundboardTrackPayload,
    SoundboardUpdateRequest,
)

router = APIRouter(prefix="/api/soundboards", tags=["soundboards"])


def _board_query_options():
    return (
        selectinload(Soundboard.tracks)
        .selectinload(SoundboardTrack.pads)
        .selectinload(SoundboardPad.clip)
    )


async def _get_owned_board(
    board_id: str, user: User, db: AsyncSession
) -> Soundboard:
    result = await db.execute(
        select(Soundboard)
        .where(Soundboard.id == board_id)
        .options(_board_query_options())
    )
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=404, detail="Soundboard not found")
    if board.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not the soundboard owner")
    return board


async def _validate_owned_clips(
    tracks: list[SoundboardTrackPayload], user: User, db: AsyncSession
) -> None:
    all_ids = {cid for t in tracks for cid in t.clip_ids}
    if not all_ids:
        return
    result = await db.execute(
        select(Clip.id).where(Clip.id.in_(all_ids), Clip.user_id == user.id)
    )
    found = {row[0] for row in result.all()}
    missing = [cid for cid in all_ids if cid not in found]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown or unauthorized clip_ids: {missing}",
        )


def _build_tracks(tracks: list[SoundboardTrackPayload]) -> list[SoundboardTrack]:
    built: list[SoundboardTrack] = []
    for track_idx, track_payload in enumerate(tracks):
        track = SoundboardTrack(position=track_idx)
        for pad_idx, clip_id in enumerate(track_payload.clip_ids):
            track.pads.append(SoundboardPad(clip_id=clip_id, position=pad_idx))
        built.append(track)
    return built


def _pad_response(pad: SoundboardPad) -> dict:
    clip = pad.clip
    return {
        "id": pad.id,
        "position": pad.position,
        "clip": {
            "id": clip.id,
            "title": clip.title,
            "waveform": clip.waveform,
            "duration": clip.duration,
        },
    }


def _track_response(track: SoundboardTrack) -> dict:
    return {
        "id": track.id,
        "position": track.position,
        "pads": [_pad_response(p) for p in track.pads],
    }


def _board_response(board: Soundboard, include_tracks: bool = True) -> dict:
    pad_count = sum(len(t.pads) for t in board.tracks)
    data = {
        "id": board.id,
        "user_id": board.user_id,
        "title": board.title,
        "created_at": board.created_at,
        "updated_at": board.updated_at,
        "track_count": len(board.tracks),
        "pad_count": pad_count,
    }
    if include_tracks:
        data["tracks"] = [_track_response(t) for t in board.tracks]
    return data


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_soundboard(
    payload: SoundboardCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _validate_owned_clips(payload.tracks, current_user, db)

    board = Soundboard(user_id=current_user.id, title=payload.title)
    board.tracks.extend(_build_tracks(payload.tracks))

    db.add(board)
    await db.commit()

    result = await db.execute(
        select(Soundboard)
        .where(Soundboard.id == board.id)
        .options(_board_query_options())
    )
    board = result.scalar_one()
    return _board_response(board)


@router.get("")
async def list_soundboards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Soundboard)
        .where(Soundboard.user_id == current_user.id)
        .order_by(Soundboard.created_at.desc())
        .options(selectinload(Soundboard.tracks).selectinload(SoundboardTrack.pads))
    )
    boards = result.scalars().all()
    return [_board_response(b, include_tracks=False) for b in boards]


@router.get("/{board_id}")
async def get_soundboard(
    board_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await _get_owned_board(board_id, current_user, db)
    return _board_response(board)


@router.put("/{board_id}")
async def update_soundboard(
    board_id: str,
    payload: SoundboardUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await _get_owned_board(board_id, current_user, db)

    if payload.title is not None:
        board.title = payload.title

    if payload.tracks is not None:
        await _validate_owned_clips(payload.tracks, current_user, db)
        board.tracks.clear()
        await db.flush()
        board.tracks.extend(_build_tracks(payload.tracks))

    await db.commit()

    result = await db.execute(
        select(Soundboard)
        .where(Soundboard.id == board.id)
        .options(_board_query_options())
    )
    board = result.scalar_one()
    return _board_response(board)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_soundboard(
    board_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    board = await _get_owned_board(board_id, current_user, db)
    await db.delete(board)
    await db.commit()
