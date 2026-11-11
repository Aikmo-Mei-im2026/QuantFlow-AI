import re

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from app.config import Settings
from app.main import create_app

ALLOWED_ORIGIN = "http://localhost:8000"
REJECTED_ORIGIN = "https://untrusted.example"


def make_app(**overrides):
    values = {
        "environment": "test",
        "cors_origins": [ALLOWED_ORIGIN],
        "docs_enabled": True,
        **overrides,
    }
    return create_app(Settings(_env_file=None, **values))


@pytest.fixture
def client():
    with TestClient(make_app()) as instance:
        yield instance


def assert_error(response, status, code):
    assert response.status_code == status
    body = response.json()
    assert set(body) == {"error", "request_id"}
    assert set(body["error"]) == {"code", "message", "details"}
    assert body["error"]["code"] == code
    assert body["request_id"] == response.headers["x-request-id"]
    assert re.fullmatch(r"[0-9a-f]{32}", body["request_id"])
    assert response.headers["cache-control"] == "no-store"
    return body


def test_health_reports_process_health_without_business_readiness(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "quantflow-api",
        "version": "0.1.0",
        "stage": "foundation",
        "dependencies": {"database": "not_configured", "market_data": "not_configured"},
    }
    assert response.headers["cache-control"] == "no-store"


def test_capabilities_does_not_claim_unimplemented_business_features(client):
    response = client.get("/api/v1/capabilities")
    assert response.status_code == 200
    assert response.json() == {
        "api_version": "v1",
        "stage": "foundation",
        "available": ["health", "capabilities"],
        "unavailable": [
            "market_data",
            "stock_search",
            "screenings",
            "backtests",
            "training",
            "experiments",
        ],
        "supported_data_modes": [],
        "persistent_accounts": False,
    }


def test_openapi_contains_only_implemented_routes(client):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert set(response.json()["paths"]) == {"/api/v1/health", "/api/v1/capabilities"}
    for path in response.json()["paths"].values():
        assert set(path) == {"get"}
        assert path["get"]["responses"]["500"]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErrorResponse"
        }
    docs = client.get("/api/v1/docs")
    assert docs.status_code == 200
    assert "/api/v1/openapi.json" in docs.text


def test_request_ids_are_generated_per_request_and_do_not_trust_client(client):
    first = client.get("/api/v1/health", headers={"X-Request-ID": "client-controlled"})
    second = client.get("/api/v1/health")
    assert re.fullmatch(r"[0-9a-f]{32}", first.headers["x-request-id"])
    assert first.headers["x-request-id"] != second.headers["x-request-id"]
    assert "client-controlled" not in first.text


def test_unknown_business_route_returns_a_real_404(client):
    body = assert_error(client.get("/api/v1/training/sessions"), 404, "NOT_FOUND")
    assert body["error"]["details"] == []


def test_unsupported_method_returns_405_with_allowed_method(client):
    response = client.post("/api/v1/health", json={"token": "secret-do-not-echo"})
    assert_error(response, 405, "METHOD_NOT_ALLOWED")
    assert "GET" in response.headers["allow"]
    assert "secret-do-not-echo" not in response.text


def test_validation_error_preserves_transport_location_without_echoing_input():
    app = make_app()

    class Payload(BaseModel):
        quantity: int

    @app.post("/test/validate", include_in_schema=False)
    def validate(payload: Payload):
        return payload

    with TestClient(app) as client:
        response = client.post("/test/validate", json={"quantity": "sensitive-rejected-value"})
    body = assert_error(response, 422, "VALIDATION_ERROR")
    assert body["error"]["details"] == [
        {"location": ["body"], "code": "int_parsing"}
    ]
    assert "sensitive-rejected-value" not in response.text
    assert "input" not in body["error"]["details"][0]


def test_validation_error_does_not_echo_extra_fields_or_dynamic_dictionary_keys():
    app = make_app()

    class Payload(BaseModel):
        model_config = ConfigDict(extra="forbid")
        values: dict[str, int]

    @app.post("/test/keys", include_in_schema=False)
    def validate(payload: Payload):
        return payload

    with TestClient(app) as client:
        response = client.post(
            "/test/keys",
            json={"values": {"private-key": "private-value"}, "extra-secret": "secret"},
        )
    body = assert_error(response, 422, "VALIDATION_ERROR")
    for secret in ("private-key", "private-value", "extra-secret"):
        assert secret not in response.text
    assert {item["code"] for item in body["error"]["details"]} == {
        "int_parsing", "extra_forbidden"
    }
    assert all(item["location"] == ["body"] for item in body["error"]["details"])


def test_internal_error_is_redacted_and_remains_readable_to_allowed_browser():
    app = make_app()

    @app.get("/test/failure", include_in_schema=False)
    def fail():
        raise RuntimeError("secret-db-password=/private/path")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test/failure", headers={"Origin": ALLOWED_ORIGIN})
    assert_error(response, 500, "INTERNAL_ERROR")
    assert "secret-db-password" not in response.text
    assert "/private/path" not in response.text
    assert "Traceback" not in response.text
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "X-Request-ID" in response.headers["access-control-expose-headers"]


def test_cors_allows_exact_origin_without_enabling_credentials(client):
    response = client.get("/api/v1/health", headers={"Origin": ALLOWED_ORIGIN})
    assert response.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
    assert "access-control-allow-credentials" not in response.headers
    assert "X-Request-ID" in response.headers["access-control-expose-headers"]


def test_cors_does_not_grant_browser_access_to_an_unknown_origin(client):
    response = client.get("/api/v1/health", headers={"Origin": REJECTED_ORIGIN})
    # CORS controls browser access; it is not authentication or a network firewall.
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers


@pytest.mark.parametrize(
    ("origin", "method", "status"),
    [
        (ALLOWED_ORIGIN, "GET", 200),
        (REJECTED_ORIGIN, "GET", 400),
        (ALLOWED_ORIGIN, "POST", 400),
    ],
)
def test_cors_preflight_enforces_origin_and_current_read_only_methods(
    client, origin, method, status
):
    response = client.options(
        "/api/v1/health",
        headers={"Origin": origin, "Access-Control-Request-Method": method},
    )
    assert response.status_code == status
    if status == 200:
        assert response.headers["access-control-allow-methods"] == "GET"


def test_disabled_documentation_is_absent_and_other_app_settings_are_isolated():
    with TestClient(make_app(docs_enabled=False, cors_origins=[])) as hidden:
        assert_error(hidden.get("/api/v1/docs"), 404, "NOT_FOUND")
        assert_error(hidden.get("/api/v1/openapi.json"), 404, "NOT_FOUND")
        assert hidden.get("/api/v1/health").status_code == 200
        denied = hidden.get("/api/v1/health", headers={"Origin": ALLOWED_ORIGIN})
        assert "access-control-allow-origin" not in denied.headers
    with TestClient(make_app()) as visible:
        assert visible.get("/api/v1/docs").status_code == 200
        allowed = visible.get("/api/v1/health", headers={"Origin": ALLOWED_ORIGIN})
        assert allowed.headers["access-control-allow-origin"] == ALLOWED_ORIGIN
