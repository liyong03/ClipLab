from app.config import settings
from app.storage.base import StorageProvider
from app.storage.local import LocalStorageProvider
from app.storage.s3 import S3StorageProvider


def create_storage_provider() -> StorageProvider:
    if settings.storage_provider == "s3":
        return S3StorageProvider(
            bucket=settings.storage_s3_bucket,
            region=settings.storage_s3_region,
        )
    return LocalStorageProvider(base_path=settings.storage_local_path)
