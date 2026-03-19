import json
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./cps_agent.db"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = '["http://localhost:3000","http://localhost:5173"]'

    @property
    def allowed_origins_list(self) -> list[str]:
        return json.loads(self.ALLOWED_ORIGINS)

    class Config:
        env_file = ".env"


settings = Settings()
