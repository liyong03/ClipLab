import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, Float, Integer, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(
        String, default=lambda: datetime.now(timezone.utc).isoformat()
    )

    clips: Mapped[list["Clip"]] = relationship(back_populates="user")


class Clip(Base):
    __tablename__ = "clips"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    raw_filename: Mapped[str] = mapped_column(String, nullable=False)
    filtered_filename: Mapped[str] = mapped_column(String, nullable=False)
    filter_settings: Mapped[str] = mapped_column(Text, default="[]")
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    waveform: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        String, default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String,
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
    )

    user: Mapped["User"] = relationship(back_populates="clips")


class Soundboard(Base):
    __tablename__ = "soundboards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[str] = mapped_column(
        String, default=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: Mapped[str] = mapped_column(
        String,
        default=lambda: datetime.now(timezone.utc).isoformat(),
        onupdate=lambda: datetime.now(timezone.utc).isoformat(),
    )

    tracks: Mapped[list["SoundboardTrack"]] = relationship(
        back_populates="soundboard",
        cascade="all, delete-orphan",
        order_by="SoundboardTrack.position",
    )


class SoundboardTrack(Base):
    __tablename__ = "soundboard_tracks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    soundboard_id: Mapped[str] = mapped_column(
        ForeignKey("soundboards.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    soundboard: Mapped["Soundboard"] = relationship(back_populates="tracks")
    pads: Mapped[list["SoundboardPad"]] = relationship(
        back_populates="track",
        cascade="all, delete-orphan",
        order_by="SoundboardPad.position",
    )


class SoundboardPad(Base):
    __tablename__ = "soundboard_pads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    track_id: Mapped[str] = mapped_column(
        ForeignKey("soundboard_tracks.id", ondelete="CASCADE"), nullable=False
    )
    clip_id: Mapped[str] = mapped_column(ForeignKey("clips.id"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    track: Mapped["SoundboardTrack"] = relationship(back_populates="pads")
    clip: Mapped["Clip"] = relationship()
