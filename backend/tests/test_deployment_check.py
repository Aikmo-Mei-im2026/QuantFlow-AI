"""Offline HTTP smoke checks, including 200 error pages and missing deployment assets."""

import gzip
import importlib.util
from pathlib import Path

import httpx
import pytest

MODULE_PATH = Path(__file__).resolve().parents[2] / "scripts" / "check_deployment.py"
SPEC = importlib.util.spec_from_file_location("check_deployment", MODULE_PATH)
smoke = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(smoke)

FRONTEND = "https://site.example.test"
API = "https://api.example.test"
PAGE_TEXT = {
    "/zh": "从看懂市场，到形成自己的判断。",
    "/zh/workspace": "知识学习室：先看懂市场，再开始练习。",
    "/zh/lab": "策略实验室：搜索样例股票，读懂评分依据。",
    "/zh/training": "K 线训练场 模拟账户 提交委托",
    "/zh/experiments": "实验记录 当前展示：记录格式样例",
    "/zh/docs": "QuantFlow AI 帮助文档 四个模块怎么用",
    "/zh/docs/factors": "八个基础因子 ATR 计算",
    "/zh/docs/rules": "交易与费用规则 当前合成演示",
}


def html(text, status=200):
    return httpx.Response(
        status, text="<!doctype html><html><body>" + text + "</body></html>",
        headers={"Content-Type": "text/html; charset=utf-8"},
    )


def good_response(request):
    path = request.url.path
    if path == "/":
        return httpx.Response(307, headers={"Location": "/zh", "Set-Cookie": "session=secret"})
    if path in PAGE_TEXT:
        return html(PAGE_TEXT[path])
    if path in {"/en/training", "/zh/__quantflow_missing_page__"}:
        return html("Page not found", 404)
    if path == "/favicon.ico":
        return httpx.Response(
            200, content=b"\x00\x00\x01\x00icon", headers={"Content-Type": "image/x-icon"}
        )
    if path == "/_pagefind/pagefind.js":
        return httpx.Response(
            200, text="export function search() {}", headers={"Content-Type": "text/javascript"}
        )
    if path == "/_pagefind/pagefind-entry.json":
        return httpx.Response(200, json={
            "version": "1.5.2",
            "languages": {"zh": {"hash": "zh_abc123", "wasm": None, "page_count": 8}},
        })
    if path == "/_pagefind/pagefind.zh_abc123.pf_meta":
        return httpx.Response(200, content=gzip.compress(b"pagefind_dcdmetadata"))
    if path == "/_pagefind/wasm.unknown.pagefind":
        return httpx.Response(200, content=gzip.compress(b"pagefind_dcd\x00asm\x01\x00\x00\x00"))
    if path == "/api/v1/health":
        return httpx.Response(200, json={"status": "ok", "service": "quantflow-api"}, headers={
            "Access-Control-Allow-Origin": FRONTEND,
        })
    if path == "/api/v1/capabilities":
        return httpx.Response(200, json={
            "api_version": "v1", "available": ["health", "capabilities"],
            "persistent_accounts": False,
        })
    if path == "/api/v1/openapi.json":
        return httpx.Response(200, json={"openapi": "3.1.0", "paths": {
            "/api/v1/health": {}, "/api/v1/capabilities": {},
        }})
    raise AssertionError(f"Unexpected network target: {request.url}")


def failed(report):
    return {item["check"] for item in report["checks"] if not item["passed"]}


def test_happy_path_is_explicitly_limited_and_read_only():
    calls = []

    def handler(request):
        calls.append(request)
        assert request.method == "GET"
        assert "authorization" not in request.headers
        assert "cookie" not in request.headers
        if request.url.host == "api.example.test":
            assert request.headers["origin"] == FRONTEND
        return good_response(request)

    report = smoke.run_checks(FRONTEND, API, transport=httpx.MockTransport(handler))
    assert report["passed"] is True
    assert report["scope"] == "http_smoke_only"
    assert len(report["checks"]) == 20
    assert len(calls) == 19
    assert report["not_verified"]


@pytest.mark.parametrize("path, expected", [
    ("/zh/workspace", "page:/zh/workspace"),
    ("/_pagefind/pagefind.js", "pagefind_js"),
    ("/_pagefind/pagefind-entry.json", "pagefind_index"),
    ("/_pagefind/pagefind.zh_abc123.pf_meta", "pagefind_metadata"),
    ("/_pagefind/wasm.unknown.pagefind", "pagefind_wasm"),
    ("/favicon.ico", "favicon"),
    ("/api/v1/health", "api_health"),
])
def test_status_200_error_page_does_not_pass(path, expected):
    def handler(request):
        if request.url.path == path:
            return html("Authentication required")
        return good_response(request)

    report = smoke.run_checks(FRONTEND, API, transport=httpx.MockTransport(handler))
    assert report["passed"] is False
    assert expected in failed(report)


def test_script_payload_does_not_masquerade_as_rendered_page():
    response = html(
        '<h1>Application error</h1><script>"知识学习室 先看懂市场，再开始练习"</script>'
    )
    assert not smoke.html_markers(response, ("知识学习室", "先看懂市场，再开始练习"))


def test_root_redirect_never_follows_an_external_login_target():
    calls = []

    def handler(request):
        calls.append(request.url.host)
        if request.url.path == "/":
            return httpx.Response(302, headers={"Location": "https://login.example.test/zh"})
        return good_response(request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert "root_redirect" in failed(report)
    assert set(calls) == {"site.example.test"}
    assert report["api_origin"] is None


def test_network_failure_returns_report_without_trace_or_request_details():
    def handler(request):
        raise httpx.ConnectTimeout("sensitive network details", request=request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert report["passed"] is False
    assert report["checks"][0]["reason"] == "ConnectTimeout"
    assert "sensitive" not in str(report)


def test_cors_header_must_match_exact_frontend_origin():
    def handler(request):
        response = good_response(request)
        if request.url.path == "/api/v1/health":
            response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    report = smoke.run_checks(FRONTEND, API, transport=httpx.MockTransport(handler))
    assert failed(report) == {"api_cors_get"}


@pytest.mark.parametrize("value", [
    "file:///etc/passwd", "https://user:password@example.test", "https://example.test/app",
    "https://example.test/?token=secret", "https://example.test/#token", "https://example.test:abc",
])
def test_origin_rejects_credentials_and_non_origin_values(value):
    with pytest.raises(ValueError):
        smoke.origin(value)


def test_malformed_provider_json_cannot_crash_or_select_external_asset():
    calls = []

    def handler(request):
        calls.append(str(request.url))
        if request.url.path == "/_pagefind/pagefind-entry.json":
            return httpx.Response(200, json={"version": "1", "languages": {"zh": {
                "hash": "../external", "wasm": "https://external.test/", "page_count": True,
            }}})
        if request.url.path == "/api/v1/capabilities":
            return httpx.Response(200, json={"api_version": "v1", "available": [{}]})
        return good_response(request)

    report = smoke.run_checks(FRONTEND, API, transport=httpx.MockTransport(handler))
    expected = {"pagefind_index", "pagefind_metadata", "pagefind_wasm", "api_capabilities"}
    assert expected <= failed(report)
    assert not any("external" in url for url in calls)


def test_gzip_http_encoding_is_decoded_only_once():
    def handler(request):
        if request.url.path == "/zh":
            body = '<html><body>从看懂市场，到形成自己的判断。</body></html>'.encode()
            return httpx.Response(200, content=gzip.compress(body), headers={
                "Content-Type": "text/html; charset=utf-8", "Content-Encoding": "gzip",
            })
        return good_response(request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert report["passed"] is True


@pytest.mark.parametrize("target", ["/zh/en/training", "https://external.test/error"])
def test_invalid_language_follows_only_same_origin_redirects(target):
    calls = []

    def handler(request):
        calls.append(str(request.url))
        if request.url.path == "/en/training":
            return httpx.Response(307, headers={"Location": target})
        if request.url.path == "/zh/en/training":
            return html("Page not found", 404)
        return good_response(request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert report["passed"] is target.startswith("/")
    assert not any("external.test" in url for url in calls)


def test_broken_pagefind_gzip_is_a_failed_check():
    response = httpx.Response(200, content=b"\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\x00bad")
    assert smoke.pagefind_binary(response) is False


@pytest.mark.parametrize("path, check", [
    ("/", "root_redirect"), ("/en/training", "not_found:/en/training"),
])
def test_invalid_redirect_returns_structured_failure(path, check):
    def handler(request):
        if request.url.path == path:
            return httpx.Response(307, headers={"Location": "http://[invalid"})
        return good_response(request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert report["passed"] is False
    item = next(item for item in report["checks"] if item["check"] == check)
    assert item["reason"] == "INVALID_REDIRECT"


def static_response(request):
    path = request.url.path
    if path == "/":
        return html('<h1>QuantFlow AI</h1><a href="/zh/">进入中文首页</a>')
    if path.endswith("/") and path[:-1] in PAGE_TEXT:
        return html(PAGE_TEXT[path[:-1]])
    if path in PAGE_TEXT:
        return httpx.Response(308, headers={"Location": path + "/"})
    return good_response(request)


def test_static_export_checks_entry_and_trailing_slash_pages_without_claiming_browser_redirect():
    calls = []

    def handler(request):
        calls.append(request.url.path)
        assert request.method == "GET"
        assert "authorization" not in request.headers
        assert "cookie" not in request.headers
        return static_response(request)

    report = smoke.run_checks(
        FRONTEND, static_export=True, transport=httpx.MockTransport(handler)
    )
    assert report["passed"] is True
    assert report["frontend_mode"] == "static_export"
    assert report["scope"] == "http_smoke_only"
    assert len(report["checks"]) == 16
    assert {path + "/" for path in PAGE_TEXT} <= set(calls)
    assert not set(PAGE_TEXT) & set(calls)
    assert report["checks"][0] == {
        "check": "root_static_entry", "passed": True, "status": 200,
    }
    assert any("static root entry redirect" in item for item in report["not_verified"])


@pytest.mark.parametrize("body", [
    'Authentication required',
    '<h1>QuantFlow AI</h1><p>进入中文首页</p>',
    '<h1>QuantFlow AI</h1><a href="https://login.example.test/zh/">进入中文首页</a>',
    '<h1>QuantFlow AI</h1><script><a href="/zh/">进入中文首页</a></script>',
    '<h1>QuantFlow AI</h1><template><a href="/zh/">进入中文首页</a></template>',
])
def test_static_export_rejects_fake_or_non_clickable_entry(body):
    def handler(request):
        return html(body) if request.url.path == "/" else static_response(request)

    report = smoke.run_checks(
        FRONTEND, static_export=True, transport=httpx.MockTransport(handler)
    )
    assert failed(report) == {"root_static_entry"}


def test_static_export_rejects_spa_fallback_on_unknown_path():
    def handler(request):
        if request.url.path == "/zh/__quantflow_missing_page__":
            return html(PAGE_TEXT["/zh"])
        return static_response(request)

    report = smoke.run_checks(
        FRONTEND, static_export=True, transport=httpx.MockTransport(handler)
    )
    assert failed(report) == {"not_found:/zh/__quantflow_missing_page__"}


def test_server_mode_still_requires_http_root_redirect():
    def handler(request):
        if request.url.path == "/":
            return static_response(request)
        return good_response(request)

    report = smoke.run_checks(FRONTEND, transport=httpx.MockTransport(handler))
    assert report["frontend_mode"] == "next_server"
    assert failed(report) == {"root_redirect"}


def test_cli_passes_static_export_mode_explicitly(monkeypatch, capsys):
    def run_checks(frontend_origin, api_origin, *, static_export):
        assert frontend_origin == FRONTEND
        assert api_origin is None
        assert static_export is True
        return {"passed": True, "scope": "http_smoke_only"}

    monkeypatch.setattr(smoke, "run_checks", run_checks)
    assert smoke.main(["--frontend-origin", FRONTEND, "--static-export"]) == 0
    assert '"http_smoke_only"' in capsys.readouterr().out
