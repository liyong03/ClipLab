import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    resp = await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    assert data["user"]["username"] == "alice"


@pytest.mark.asyncio
async def test_register_duplicate(client):
    await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    resp = await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "other456"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_register_missing_fields(client):
    resp = await client.post("/api/auth/register", json={"username": "a"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_short_username(client):
    resp = await client.post(
        "/api/auth/register",
        json={"username": "ab", "password": "secret123"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password(client):
    resp = await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "short"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "secret123"},
    )
    assert resp.status_code == 200
    assert "token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"username": "alice", "password": "wrongpass"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    resp = await client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "secret123"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_with_valid_token(client):
    reg_resp = await client.post(
        "/api/auth/register",
        json={"username": "alice", "password": "secret123"},
    )
    token = reg_resp.json()["token"]
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


@pytest.mark.asyncio
async def test_me_with_invalid_token(client):
    resp = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalidtoken"},
    )
    assert resp.status_code == 401
