# config.py
# 환경변수 설정 담당
# .env 파일에서 환경변수를 읽어와 앱 전체에서 사용할 수 있도록 관리

from pydantic_settings import BaseSettings

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

    # RAG / ChromaDB
    CHROMA_EXERCISE_DIR: str = "/app/ml_data/exercise_guide/chroma_db"
    CHROMA_DIET_DIR: str = "/app/ml_data/diet_guide/chroma_db"
    CHROMA_MEDICATION_DIR: str = "/app/ml_data/medication_guide/chroma_db"

    # RAG / LLM 모델 설정
    # EMBEDDING_MODEL 은 배포 chroma 인덱스와 동일해야 함 (현재 1536차원=3-small).
    # 주의: EMBEDDING_MODEL 을 바꾸면 chroma_db 를 그 모델로 전체 재구축해야 함.
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    GENERATION_MODEL: str = "gpt-4o"
    GENERATION_TEMPERATURE: float = 0.0

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587

    # Frontend
    FRONTEND_URL: str = ""

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = "firebase_key.json"

    class Config:
        env_file = ".env"

settings = Settings()