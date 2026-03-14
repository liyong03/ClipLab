import os
from typing import AsyncIterator

import aiofiles
import aiofiles.os

from app.storage.base import StorageProvider


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str):
        self.base_path = os.path.abspath(base_path)
        os.makedirs(self.base_path, exist_ok=True)

    def _full_path(self, key: str) -> str:
        return os.path.join(self.base_path, key)

    async def save(self, key: str, data: bytes) -> str:
        path = self._full_path(key)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        async with aiofiles.open(path, "wb") as f:
            await f.write(data)
        return key

    async def get(self, key: str) -> bytes:
        path = self._full_path(key)
        if not os.path.exists(path):
            raise FileNotFoundError(f"File not found: {key}")
        async with aiofiles.open(path, "rb") as f:
            return await f.read()

    async def get_stream(self, key: str) -> AsyncIterator[bytes]:
        path = self._full_path(key)
        if not os.path.exists(path):
            raise FileNotFoundError(f"File not found: {key}")
        async with aiofiles.open(path, "rb") as f:
            while chunk := await f.read(8192):
                yield chunk

    async def delete(self, key: str) -> None:
        path = self._full_path(key)
        if os.path.exists(path):
            await aiofiles.os.remove(path)

    def get_url(self, key: str) -> str:
        return f"/uploads/{key}"
