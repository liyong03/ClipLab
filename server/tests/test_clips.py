import json

import pytest
from httpx import AsyncClient


async def _upload_clip(client: AsyncClient, title: str = "Test Clip") -> dict:
    resp = await client.post(
        "/api/clips",
        data={"title": title, "filter_settings": json.dumps([{"filterId": "gain", "enabled": True, "params": {"level": 1.5}}])},
        files={
            "raw_audio": ("raw.webm", b"raw-audio-data", "audio/webm"),
            "filtered_audio": ("filtered.wav", b"filtered-audio-data", "audio/wav"),
        },
    )
    return resp


@pytest.mark.asyncio
async def test_upload_clip(auth_client):
    resp = await _upload_clip(auth_client)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Clip"
    assert data["id"]
    assert data["username"] == "testuser"


@pytest.mark.asyncio
async def test_upload_without_auth(client):
    resp = await _upload_clip(client)
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_clips(auth_client):
    await _upload_clip(auth_client, "Clip 1")
    await _upload_clip(auth_client, "Clip 2")

    resp = await auth_client.get("/api/clips")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_clip_by_id(auth_client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    resp = await auth_client.get(f"/api/clips/{clip_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == clip_id
    assert resp.json()["title"] == "Test Clip"


@pytest.mark.asyncio
async def test_get_clip_not_found(client):
    resp = await client.get("/api/clips/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_stream_audio(auth_client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    resp = await auth_client.get(f"/api/clips/{clip_id}/audio")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/wav"
    assert resp.content == b"filtered-audio-data"


@pytest.mark.asyncio
async def test_stream_raw_audio_as_owner(auth_client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    resp = await auth_client.get(f"/api/clips/{clip_id}/raw")
    assert resp.status_code == 200
    assert resp.content == b"raw-audio-data"


@pytest.mark.asyncio
async def test_stream_raw_audio_as_non_owner(auth_client, client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    # Register a different user
    reg_resp = await client.post(
        "/api/auth/register",
        json={"username": "otheruser", "password": "otherpass123"},
    )
    other_token = reg_resp.json()["token"]

    resp = await client.get(
        f"/api/clips/{clip_id}/raw",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_clip_as_owner(auth_client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    new_settings = json.dumps([{"filterId": "lowpass", "enabled": True, "params": {"frequency": 500}}])
    resp = await auth_client.put(
        f"/api/clips/{clip_id}",
        data={"filter_settings": new_settings},
        files={"filtered_audio": ("filtered.wav", b"new-filtered-data", "audio/wav")},
    )
    assert resp.status_code == 200
    assert resp.json()["filter_settings"] == new_settings


@pytest.mark.asyncio
async def test_update_clip_as_non_owner(auth_client, client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    reg_resp = await client.post(
        "/api/auth/register",
        json={"username": "otheruser", "password": "otherpass123"},
    )
    other_token = reg_resp.json()["token"]

    resp = await client.put(
        f"/api/clips/{clip_id}",
        data={"filter_settings": "[]"},
        files={"filtered_audio": ("filtered.wav", b"data", "audio/wav")},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_clip_as_owner(auth_client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    resp = await auth_client.delete(f"/api/clips/{clip_id}")
    assert resp.status_code == 204

    # Verify deleted
    resp = await auth_client.get(f"/api/clips/{clip_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_clip_as_non_owner(auth_client, client):
    upload_resp = await _upload_clip(auth_client)
    clip_id = upload_resp.json()["id"]

    reg_resp = await client.post(
        "/api/auth/register",
        json={"username": "otheruser", "password": "otherpass123"},
    )
    other_token = reg_resp.json()["token"]

    resp = await client.delete(
        f"/api/clips/{clip_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_pagination(auth_client):
    for i in range(15):
        await _upload_clip(auth_client, f"Clip {i}")

    resp1 = await auth_client.get("/api/clips?page=1&limit=10")
    assert len(resp1.json()) == 10

    resp2 = await auth_client.get("/api/clips?page=2&limit=10")
    assert len(resp2.json()) == 5
