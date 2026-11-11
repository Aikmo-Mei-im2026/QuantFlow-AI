from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.schemas import ErrorResponse
from app.api.system import router
from app.config import Settings
from app.errors import internal_error_response, register_error_handlers


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    app = FastAPI(
        title="QuantFlow AI API",
        description="本地后端基础；行情、交易、训练和持久化接口尚未实现。",
        version=__version__,
        debug=False,
        docs_url="/api/v1/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if settings.docs_enabled else None,
        responses={
            404: {"model": ErrorResponse},
            422: {"model": ErrorResponse},
            500: {"model": ErrorResponse},
        },
    )
    app.state.settings = settings

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        # IDs are generated here, not accepted from an untrusted client header.
        request.state.request_id = uuid4().hex
        try:
            response = await call_next(request)
        except Exception:
            # Handle errors inside CORS so allowed clients can read sanitized failures.
            response = internal_error_response(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["Cache-Control"] = "no-store"
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["Accept", "Content-Type"],
        expose_headers=["X-Request-ID"],
    )
    register_error_handlers(app)
    app.include_router(router)
    return app
