from abc import ABC, abstractmethod
from typing import AsyncIterator


class StorageProvider(ABC):
    @abstractmethod
    async def save(self, key: str, data: bytes) -> str:
        """Save data and return the storage key."""
        ...

    @abstractmethod
    async def get(self, key: str) -> bytes:
        """Get data by key. Raises FileNotFoundError if not found."""
        ...

    @abstractmethod
    async def get_stream(self, key: str) -> AsyncIterator[bytes]:
        """Get data as an async iterator of chunks."""
        ...

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete data by key."""
        ...

    @abstractmethod
    def get_url(self, key: str) -> str:
        """Get a URL/path for serving the file."""
        ...
