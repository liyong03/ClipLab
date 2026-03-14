import tempfile

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.main import app
from app.models import Base
from app.routes.clips import get_storage
from app.storage.local import LocalStorageProvider

test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
test_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with test_session() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db(tmp_path):
    # Override storage to use temp directory
    test_storage = LocalStorageProvider(base_path=str(tmp_path / "uploads"))
    app.dependency_overrides[get_storage] = lambda: test_storage

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    app.dependency_overrides[get_storage] = lambda: test_storage


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_client(client: AsyncClient):
    """A client that is already authenticated."""
    resp = await client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "testpass123"},
    )
    token = resp.json()["token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
