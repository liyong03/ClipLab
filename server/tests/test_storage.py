import os
import tempfile

import pytest

from app.storage.local import LocalStorageProvider


@pytest.fixture
def tmp_storage():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield LocalStorageProvider(base_path=tmpdir)


@pytest.mark.asyncio
async def test_save_and_get(tmp_storage):
    await tmp_storage.save("test.wav", b"audio-data-123")
    data = await tmp_storage.get("test.wav")
    assert data == b"audio-data-123"


@pytest.mark.asyncio
async def test_save_creates_file_on_disk(tmp_storage):
    await tmp_storage.save("test.wav", b"data")
    path = os.path.join(tmp_storage.base_path, "test.wav")
    assert os.path.exists(path)


@pytest.mark.asyncio
async def test_get_nonexistent_raises(tmp_storage):
    with pytest.raises(FileNotFoundError):
        await tmp_storage.get("nonexistent.wav")


@pytest.mark.asyncio
async def test_delete(tmp_storage):
    await tmp_storage.save("test.wav", b"data")
    await tmp_storage.delete("test.wav")
    with pytest.raises(FileNotFoundError):
        await tmp_storage.get("test.wav")


@pytest.mark.asyncio
async def test_get_stream(tmp_storage):
    content = b"stream-data-content"
    await tmp_storage.save("stream.wav", content)
    chunks = []
    async for chunk in tmp_storage.get_stream("stream.wav"):
        chunks.append(chunk)
    assert b"".join(chunks) == content


@pytest.mark.asyncio
async def test_get_stream_nonexistent_raises(tmp_storage):
    with pytest.raises(FileNotFoundError):
        async for _ in tmp_storage.get_stream("nope.wav"):
            pass


@pytest.mark.asyncio
async def test_get_url(tmp_storage):
    url = tmp_storage.get_url("test.wav")
    assert url == "/uploads/test.wav"


@pytest.mark.asyncio
async def test_save_roundtrip_binary(tmp_storage):
    binary_data = bytes(range(256))
    await tmp_storage.save("binary.bin", binary_data)
    result = await tmp_storage.get("binary.bin")
    assert result == binary_data
