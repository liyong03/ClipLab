from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    username: str
    created_at: str


class SoundboardTrackPayload(BaseModel):
    clip_ids: list[str] = Field(default_factory=list)


class SoundboardCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    tracks: list[SoundboardTrackPayload] = Field(default_factory=list)


class SoundboardUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    tracks: list[SoundboardTrackPayload] | None = None
