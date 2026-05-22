# config.py
# 환경변수 설정 담당
# .env 파일에서 환경변수를 읽어와 앱 전체에서 사용할 수 있도록 관리

from pathlib import Path

from pydantic_settings import BaseSettings

# DUR 마스터 pickle 기본 경로 — backend/ml_data (현재 파일 기준 ../ml_data).
# 도커 컨테이너(./backend:/app 마운트)에서도 /app/ml_data 로 동일 해석됨.
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_ML_DATA_DIR = str(_BACKEND_ROOT / "ml_data")


class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # Database
    DB_HOST: str = ""
    DB_PORT: int = 3306
    DB_NAME: str = ""
    DB_USER: str = ""
    DB_PASSWORD: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    # Frontend
    FRONTEND_URL: str = ""

    # ML data (DUR 마스터 pickle 등)
    ML_DATA_DIR: str = _DEFAULT_ML_DATA_DIR

    class Config:
        env_file = ".env"

settings = Settings()