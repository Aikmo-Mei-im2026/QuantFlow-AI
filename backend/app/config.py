"""Validated local configuration; never returned by the API."""

from typing import Literal
from urllib.parse import urlsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="QF_", env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    environment: Literal["development", "test", "production"] = "development"
    cors_origins: list[str] = ["http://localhost:8000", "http://127.0.0.1:8000"]
    docs_enabled: bool = True

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(cls, values: list[str]) -> list[str]:
        for value in values:
            url = urlsplit(value)
            if (
                value == "*"
                or url.scheme not in {"http", "https"}
                or not url.hostname
                or url.username
                or url.password
                or url.path
                or url.query
                or url.fragment
            ):
                raise ValueError("CORS origins must be explicit HTTP(S) origins without paths")
            try:
                _ = url.port  # Accessing the property validates the numeric port range.
            except ValueError as exc:
                raise ValueError("Invalid CORS origin port") from exc
        return list(dict.fromkeys(values))
