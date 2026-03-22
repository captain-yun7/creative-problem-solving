import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./cps_agent.db"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'

    @property
    def allowed_origins_list(self) -> list[str]:
        raw = self.ALLOWED_ORIGINS.strip()
        # JSON 배열 형태면 파싱, 아니면 콤마 구분
        if raw.startswith("["):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                pass
        return [o.strip().strip('"').strip("'") for o in raw.split(",") if o.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
