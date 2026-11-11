import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger("quantflow.api")


def internal_error_response(request: Request):
    logger.error("Unhandled request failure request_id=%s", request.state.request_id)
    return error_response(request, 500, "INTERNAL_ERROR", "服务暂时无法处理请求")


def error_response(request: Request, status: int, code: str, message: str, details=None):
    request_id = getattr(request.state, "request_id", None) or uuid4().hex
    return JSONResponse(
        status_code=status,
        content={
            "error": {"code": code, "message": message, "details": details or []},
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id, "Cache-Control": "no-store"},
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        messages = {
            404: ("NOT_FOUND", "接口不存在"),
            405: ("METHOD_NOT_ALLOWED", "请求方法不支持"),
        }
        code, message = messages.get(exc.status_code, ("HTTP_ERROR", "请求无法完成"))
        response = error_response(request, exc.status_code, code, message)
        if exc.headers and "Allow" in exc.headers:
            response.headers["Allow"] = exc.headers["Allow"]
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Nested locations can contain user-supplied dictionary keys or extra field names.
        # Until schemas declare safe field paths, only expose the transport location.
        details = [
            {
                "location": [item["loc"][0]]
                if item["loc"] and item["loc"][0] in {"body", "query", "path", "header", "cookie"}
                else [],
                "code": item["type"],
            }
            for item in exc.errors()
        ]
        return error_response(request, 422, "VALIDATION_ERROR", "请求参数不符合接口约定", details)

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception):
        return internal_error_response(request)
