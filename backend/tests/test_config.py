import pytest
from pydantic import ValidationError

from app.config import Settings


@pytest.mark.parametrize(
    "origin",
    [
        "*",
        "https://frontend.example/path",
        "https://frontend.example/",
        "https://frontend.example?token=secret",
        "https://frontend.example#section",
        "https://user:password@frontend.example",
        "ftp://frontend.example",
        "http://",
        "http://localhost:70000",
        "http://localhost:wrong",
    ],
)
def test_invalid_cors_origins_fail_at_startup(origin):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="test", cors_origins=[origin])


def test_explicit_origins_are_deduplicated_without_widening_access():
    settings = Settings(
        _env_file=None,
        environment="test",
        cors_origins=["http://localhost:8000", "https://frontend.example", "http://localhost:8000"],
    )
    assert settings.cors_origins == ["http://localhost:8000", "https://frontend.example"]


def test_settings_read_prefixed_environment_and_explicit_values_take_precedence(monkeypatch):
    monkeypatch.setenv("QF_ENVIRONMENT", "production")
    monkeypatch.setenv("QF_DOCS_ENABLED", "false")
    monkeypatch.setenv("QF_CORS_ORIGINS", '["https://frontend.example"]')
    settings = Settings(_env_file=None)
    assert settings.environment == "production"
    assert settings.docs_enabled is False
    assert settings.cors_origins == ["https://frontend.example"]
    override = Settings(_env_file=None, environment="test", docs_enabled=True, cors_origins=[])
    assert override.environment == "test"
    assert override.docs_enabled is True
    assert override.cors_origins == []
