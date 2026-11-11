from fastapi import APIRouter

from app import __version__
from app.api.schemas import CapabilitiesResponse, HealthResponse

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="检查 API 进程是否可用")
def health() -> HealthResponse:
    """仅检查进程；未配置的数据与数据库不代表已就绪。"""
    return HealthResponse(version=__version__)


@router.get("/capabilities", response_model=CapabilitiesResponse, summary="查询当前实现范围")
def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse()
