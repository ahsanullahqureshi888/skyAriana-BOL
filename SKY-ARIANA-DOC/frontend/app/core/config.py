from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SKY ARIANA & BALAM BAR BARAN Invoice System"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "supersecretkeychangeinproduction12345"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = "sqlite:///./invoices.db"
    UPLOAD_DIR: str = "uploads"

    class Config:
        case_sensitive = True

settings = Settings()
