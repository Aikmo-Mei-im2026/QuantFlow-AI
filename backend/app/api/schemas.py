from typing import Literal

from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(ApiModel):
    location: list[str | int]
    code: str


class ErrorBody(ApiModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(ApiModel):
    error: ErrorBody
    request_id: str


class HealthResponse(ApiModel):
    status: Literal["ok"] = "ok"
    service: Literal["quantflow-api"] = "quantflow-api"
    version: str
    stage: Literal["foundation"] = "foundation"
    dependencies: dict[str, Literal["not_configured"]] = {
        "database": "not_configured",
        "market_data": "not_configured",
    }


class CapabilitiesResponse(ApiModel):
    api_version: Literal["v1"] = "v1"
    stage: Literal["foundation"] = "foundation"
    available: list[str] = ["health", "capabilities"]
    unavailable: list[str] = [
        "market_data", "stock_search", "screenings", "backtests", "training", "experiments"
    ]
    supported_data_modes: list[Literal["demo", "replay", "live"]] = []
    persistent_accounts: bool = False
