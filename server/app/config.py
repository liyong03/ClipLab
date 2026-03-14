from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 8000
    jwt_secret: str = "dev-secret-change-in-production"
    db_path: str = "./data/cliplab.db"
    storage_provider: str = "local"
    storage_local_path: str = "./uploads"
    storage_s3_bucket: str = ""
    storage_s3_region: str = "us-east-1"

    model_config = {"env_file": ".env"}


settings = Settings()
