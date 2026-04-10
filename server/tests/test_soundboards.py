import json

import pytest
from httpx import AsyncClient


async def _upload_clip(client: AsyncClient, title: str = "Test Clip") -> str:
    resp = await client.post(
        "/api/clips",
        data={"title": title, "filter_settings": json.dumps([])},
        files={
            "raw_audio": ("raw.webm", b"raw-audio-data", "audio/webm"),
            "filtered_audio": ("filtered.wav", b"filtered-audio-data", "audio/wav"),
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_soundboard_with_tracks(auth_client):
    clip_a = await _upload_clip(auth_client, "A")
    clip_b = await _upload_clip(auth_client, "B")
    clip_c = await _upload_clip(auth_client, "C")

    resp = await auth_client.post(
        "/api/soundboards",
        json={
            "title": "My Board",
            "tracks": [
                {"clip_ids": [clip_a, clip_b]},
                {"clip_ids": [clip_c]},
            ],
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Board"
    assert data["track_count"] == 2
    assert data["pad_count"] == 3
    assert [t["position"] for t in data["tracks"]] == [0, 1]
    assert [p["clip"]["id"] for p in data["tracks"][0]["pads"]] == [clip_a, clip_b]
    assert [p["clip"]["id"] for p in data["tracks"][1]["pads"]] == [clip_c]


@pytest.mark.asyncio
async def test_create_empty_board(auth_client):
    resp = await auth_client.post(
        "/api/soundboards", json={"title": "Empty", "tracks": []}
    )
    assert resp.status_code == 201
    assert resp.json()["track_count"] == 0


@pytest.mark.asyncio
async def test_create_without_auth(client):
    resp = await client.post(
        "/api/soundboards", json={"title": "x", "tracks": []}
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_rejects_unknown_clip(auth_client):
    resp = await auth_client.post(
        "/api/soundboards",
        json={"title": "Board", "tracks": [{"clip_ids": ["does-not-exist"]}]},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_rejects_other_users_clip(auth_client, client):
    clip_id = await _upload_clip(auth_client, "Mine")

    reg = await client.post(
        "/api/auth/register",
        json={"username": "other", "password": "otherpass"},
    )
    other_token = reg.json()["token"]

    resp = await client.post(
        "/api/soundboards",
        json={"title": "Steal", "tracks": [{"clip_ids": [clip_id]}]},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_soundboards(auth_client):
    clip = await _upload_clip(auth_client)
    await auth_client.post(
        "/api/soundboards",
        json={"title": "One", "tracks": [{"clip_ids": [clip]}]},
    )
    await auth_client.post("/api/soundboards", json={"title": "Two", "tracks": []})

    resp = await auth_client.get("/api/soundboards")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert {b["title"] for b in data} == {"One", "Two"}
    assert "tracks" not in data[0]
    assert all("track_count" in b for b in data)


@pytest.mark.asyncio
async def test_list_scoped_to_user(auth_client, client):
    await auth_client.post("/api/soundboards", json={"title": "Mine", "tracks": []})

    reg = await client.post(
        "/api/auth/register",
        json={"username": "other", "password": "otherpass"},
    )
    other_token = reg.json()["token"]

    resp = await client.get(
        "/api/soundboards",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_soundboard(auth_client):
    clip = await _upload_clip(auth_client)
    create = await auth_client.post(
        "/api/soundboards",
        json={"title": "B", "tracks": [{"clip_ids": [clip]}]},
    )
    board_id = create.json()["id"]

    resp = await auth_client.get(f"/api/soundboards/{board_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == board_id
    assert len(body["tracks"]) == 1
    assert len(body["tracks"][0]["pads"]) == 1


@pytest.mark.asyncio
async def test_get_soundboard_not_found(auth_client):
    resp = await auth_client.get("/api/soundboards/nope")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_soundboard_as_non_owner(auth_client, client):
    clip = await _upload_clip(auth_client)
    create = await auth_client.post(
        "/api/soundboards",
        json={"title": "B", "tracks": [{"clip_ids": [clip]}]},
    )
    board_id = create.json()["id"]

    reg = await client.post(
        "/api/auth/register",
        json={"username": "other", "password": "otherpass"},
    )
    other_token = reg.json()["token"]

    resp = await client.get(
        f"/api/soundboards/{board_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_replaces_tracks(auth_client):
    clip_a = await _upload_clip(auth_client, "A")
    clip_b = await _upload_clip(auth_client, "B")
    clip_c = await _upload_clip(auth_client, "C")

    create = await auth_client.post(
        "/api/soundboards",
        json={"title": "Board", "tracks": [{"clip_ids": [clip_a, clip_b]}]},
    )
    board_id = create.json()["id"]

    resp = await auth_client.put(
        f"/api/soundboards/{board_id}",
        json={
            "title": "Renamed",
            "tracks": [
                {"clip_ids": [clip_c]},
                {"clip_ids": [clip_a, clip_b]},
            ],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Renamed"
    assert data["track_count"] == 2
    assert [p["clip"]["id"] for p in data["tracks"][0]["pads"]] == [clip_c]
    assert [p["clip"]["id"] for p in data["tracks"][1]["pads"]] == [clip_a, clip_b]


@pytest.mark.asyncio
async def test_update_title_only(auth_client):
    create = await auth_client.post(
        "/api/soundboards", json={"title": "Orig", "tracks": []}
    )
    board_id = create.json()["id"]

    resp = await auth_client.put(
        f"/api/soundboards/{board_id}", json={"title": "New"}
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_update_as_non_owner(auth_client, client):
    create = await auth_client.post(
        "/api/soundboards", json={"title": "B", "tracks": []}
    )
    board_id = create.json()["id"]

    reg = await client.post(
        "/api/auth/register",
        json={"username": "other", "password": "otherpass"},
    )
    other_token = reg.json()["token"]

    resp = await client.put(
        f"/api/soundboards/{board_id}",
        json={"title": "Hacked"},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_soundboard(auth_client):
    create = await auth_client.post(
        "/api/soundboards", json={"title": "B", "tracks": []}
    )
    board_id = create.json()["id"]

    resp = await auth_client.delete(f"/api/soundboards/{board_id}")
    assert resp.status_code == 204

    resp = await auth_client.get(f"/api/soundboards/{board_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_as_non_owner(auth_client, client):
    create = await auth_client.post(
        "/api/soundboards", json={"title": "B", "tracks": []}
    )
    board_id = create.json()["id"]

    reg = await client.post(
        "/api/auth/register",
        json={"username": "other", "password": "otherpass"},
    )
    other_token = reg.json()["token"]

    resp = await client.delete(
        f"/api/soundboards/{board_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403
