from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    keitaro_url: str
    keitaro_api_key: str
    default_domain_id: int = 1813
    default_group_id: int = 10332
    default_source_id: int = 836
    database_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()