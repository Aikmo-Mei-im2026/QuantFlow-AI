"""Read-only HTTP smoke checks for QuantFlow; not a browser or deployment acceptance test."""

import argparse
import gzip
import io
import json
import re
import zlib
from datetime import UTC, datetime
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

import httpx

MAX_BYTES = 5_000_000
PAGES = {
    "/zh": ("从看懂市场", "到形成自己的判断"),
    "/zh/workspace": ("知识学习室", "先看懂市场，再开始练习"),
    "/zh/lab": ("策略实验室", "搜索样例股票，读懂评分依据"),
    "/zh/training": ("K 线训练场", "模拟账户", "提交委托"),
    "/zh/experiments": ("实验记录", "当前展示：记录格式样例"),
    "/zh/docs": ("QuantFlow AI 帮助文档", "四个模块怎么用"),
    "/zh/docs/factors": ("八个基础因子", "ATR 计算"),
    "/zh/docs/rules": ("交易与费用规则", "当前合成演示"),
}


def origin(value: str) -> str:
    """Accept only explicitly supplied HTTP(S) origins, never embedded credentials."""
    parsed = urlsplit(value)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or any(character.isspace() for character in value)
    ):
        raise ValueError("Expected an HTTP(S) origin without credentials, path, query or fragment")
    try:
        _ = parsed.port
    except ValueError as exc:
        raise ValueError("Invalid origin port") from exc
    return value.rstrip("/")


class VisibleText(HTMLParser):
    """Ignore script/style/template data so embedded app bundles cannot satisfy page markers."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hidden = 0
        self.parts = []
        self.tags = set()
        self.links = []
        self.current_link = None

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag)
        if tag in {"script", "style", "template"}:
            self.hidden += 1
        if tag == "a" and not self.hidden:
            self.current_link = [dict(attrs).get("href"), []]

    def handle_endtag(self, tag):
        if tag in {"script", "style", "template"} and self.hidden:
            self.hidden -= 1
        if tag == "a" and self.current_link is not None:
            self.links.append(self.current_link)
            self.current_link = None

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)
            if self.current_link is not None:
                self.current_link[1].append(data)


def html_markers(response: httpx.Response, markers: tuple[str, ...]) -> bool:
    if response.status_code != 200 or "text/html" not in response.headers.get("content-type", ""):
        return False
    parser = VisibleText()
    parser.feed(response.text)
    text = " ".join(" ".join(parser.parts).split())
    return {"html", "body"}.issubset(parser.tags) and all(marker in text for marker in markers)


def static_root_entry(response: httpx.Response) -> bool:
    """Check the exported fallback link, not whether browser JavaScript redirects."""
    if not html_markers(response, ("QuantFlow AI", "进入中文首页")):
        return False
    parser = VisibleText()
    parser.feed(response.text)
    return any(
        href == "/zh/" and "进入中文首页" in "".join(parts)
        for href, parts in parser.links
    )


def json_body(response: httpx.Response) -> dict | None:
    content_type = response.headers.get("content-type", "")
    if response.status_code != 200 or "application/json" not in content_type:
        return None
    try:
        body = response.json()
    except ValueError:
        return None
    return body if isinstance(body, dict) else None


def pagefind_binary(response: httpx.Response, *, wasm: bool = False) -> bool:
    if response.status_code != 200 or "text/html" in response.headers.get("content-type", ""):
        return False
    data = response.content
    try:
        if data.startswith(b"\x1f\x8b"):
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data = stream.read(MAX_BYTES + 1)
    except (OSError, EOFError, zlib.error):
        return False
    prefix = b"pagefind_dcd" + (b"\x00asm" if wasm else b"")
    return len(data) <= MAX_BYTES and data.startswith(prefix) and len(data) > len(prefix)


def run_checks(
    frontend_origin: str, api_origin: str | None = None, *, static_export=False, transport=None
) -> dict:
    frontend_origin = origin(frontend_origin)
    api_origin = origin(api_origin) if api_origin else None
    checks = []

    def record(name, passed, **details):
        checks.append({"check": name, "passed": bool(passed), **details})

    # No auth, environment proxy credentials, cookies or redirects are carried to another origin.
    with httpx.Client(
        timeout=10, follow_redirects=False, trust_env=False, transport=transport
    ) as client:
        def get(name: str, base: str, path: str, *, headers=None):
            client.cookies.clear()
            try:
                with client.stream("GET", base + path, headers=headers) as response:
                    chunks, length = [], 0
                    for chunk in response.iter_bytes():
                        length += len(chunk)
                        if length > MAX_BYTES:
                            record(name, False, reason="RESPONSE_TOO_LARGE")
                            return None
                        chunks.append(chunk)
                    response_headers = dict(response.headers)
                    response_headers.pop("content-encoding", None)
                    response_headers.pop("content-length", None)
                    return httpx.Response(
                        response.status_code, headers=response_headers, content=b"".join(chunks),
                        request=response.request,
                    )
            except httpx.HTTPError as exc:
                record(name, False, reason=type(exc).__name__)
                return None

        root_check = "root_static_entry" if static_export else "root_redirect"
        response = get(root_check, frontend_origin, "/")
        if response is not None and static_export:
            record(root_check, static_root_entry(response), status=response.status_code)
        elif response is not None:
            try:
                location = urljoin(frontend_origin + "/", response.headers.get("location", ""))
                _ = urlsplit(location).port
            except ValueError:
                record("root_redirect", False, reason="INVALID_REDIRECT")
            else:
                record(
                    "root_redirect", response.status_code in {301, 302, 307, 308}
                    and location in {frontend_origin + "/zh", frontend_origin + "/zh/"},
                    status=response.status_code,
                )
        for path, markers in PAGES.items():
            request_path = path + "/" if static_export else path
            response = get("page:" + path, frontend_origin, request_path)
            if response is not None:
                record("page:" + path, html_markers(response, markers), status=response.status_code)
        for path in ("/en/training", "/zh/__quantflow_missing_page__"):
            response = get("not_found:" + path, frontend_origin, path)
            for _ in range(3):
                if response is None or response.status_code not in {301, 302, 307, 308}:
                    break
                try:
                    target = urlsplit(
                        urljoin(str(response.url), response.headers.get("location", ""))
                    )
                    _ = target.port
                except ValueError:
                    record("not_found:" + path, False, reason="INVALID_REDIRECT")
                    response = None
                    break
                # Locale proxy may prefix /zh. Never follow external, credentialed or query URLs.
                if (
                    target.scheme + "://" + target.netloc != frontend_origin
                    or target.query or target.fragment
                ):
                    break
                response = get("not_found:" + path, frontend_origin, target.path)
            if response is not None:
                record(
                    "not_found:" + path, response.status_code == 404, status=response.status_code
                )

        response = get("favicon", frontend_origin, "/favicon.ico")
        if response is not None:
            record(
                "favicon", response.status_code == 200
                and response.content.startswith(b"\x00\x00\x01\x00")
                and "image/" in response.headers.get("content-type", ""),
                status=response.status_code,
            )
        response = get("pagefind_js", frontend_origin, "/_pagefind/pagefind.js")
        if response is not None:
            record(
                "pagefind_js", response.status_code == 200
                and "javascript" in response.headers.get("content-type", "")
                and "export" in response.text and "search" in response.text,
                status=response.status_code,
            )
        response = get("pagefind_index", frontend_origin, "/_pagefind/pagefind-entry.json")
        entry = json_body(response) if response is not None else None
        language = (entry or {}).get("languages", {})
        chinese = language.get("zh", {}) if isinstance(language, dict) else {}
        if not isinstance(chinese, dict):
            chinese = {}
        page_hash = chinese.get("hash")
        count = chinese.get("page_count")
        valid_index = (
            isinstance(page_hash, str) and re.fullmatch(r"zh_[a-zA-Z0-9]+", page_hash) is not None
            and isinstance(count, int) and not isinstance(count, bool) and count >= len(PAGES)
            and isinstance((entry or {}).get("version"), str)
        )
        if response is not None:
            record("pagefind_index", valid_index, status=response.status_code)
        if valid_index:
            response = get(
                "pagefind_metadata", frontend_origin, f"/_pagefind/pagefind.{page_hash}.pf_meta"
            )
            if response is not None:
                record("pagefind_metadata", pagefind_binary(response), status=response.status_code)
            wasm_id = chinese.get("wasm") or "unknown"
            if isinstance(wasm_id, str) and re.fullmatch(r"[a-zA-Z0-9_-]+", wasm_id):
                response = get(
                    "pagefind_wasm", frontend_origin, f"/_pagefind/wasm.{wasm_id}.pagefind"
                )
                if response is not None:
                    record(
                        "pagefind_wasm", pagefind_binary(response, wasm=True),
                        status=response.status_code,
                    )
            else:
                record("pagefind_wasm", False, reason="INVALID_WASM_ID")
        else:
            record("pagefind_metadata", False, reason="INDEX_UNAVAILABLE")
            record("pagefind_wasm", False, reason="INDEX_UNAVAILABLE")

        if api_origin:
            headers = {"Origin": frontend_origin}
            response = get("api_health", api_origin, "/api/v1/health", headers=headers)
            if response is not None:
                body = json_body(response) or {}
                record("api_health", body.get("status") == "ok"
                       and body.get("service") == "quantflow-api", status=response.status_code)
                record(
                    "api_cors_get",
                    response.headers.get("access-control-allow-origin") == frontend_origin,
                )
            response = get("api_capabilities", api_origin, "/api/v1/capabilities", headers=headers)
            if response is not None:
                body = json_body(response) or {}
                available = body.get("available")
                record(
                    "api_capabilities", body.get("api_version") == "v1"
                    and isinstance(available, list)
                    and "health" in available and "capabilities" in available
                    and isinstance(body.get("persistent_accounts"), bool),
                    status=response.status_code,
                )
            response = get("api_openapi", api_origin, "/api/v1/openapi.json", headers=headers)
            if response is not None:
                body = json_body(response) or {}
                paths = body.get("paths")
                record(
                    "api_openapi", isinstance(body.get("openapi"), str)
                    and isinstance(paths, dict)
                    and {"/api/v1/health", "/api/v1/capabilities"}.issubset(paths),
                    status=response.status_code,
                )

    return {
        "schema_version": "deployment-http-smoke-v1",
        "checked_at": datetime.now(UTC).isoformat(),
        "scope": "http_smoke_only",
        "frontend_origin": frontend_origin,
        "frontend_mode": "static_export" if static_export else "next_server",
        "api_origin": api_origin,
        "passed": all(check["passed"] for check in checks),
        "checks": checks,
        "not_verified": [
            "Browser execution of the static root entry redirect",
            "Browser JavaScript, interaction and actual Pagefind query results",
            "Qoder Sites runtime compatibility, public anonymous access and clean installation",
            "HTTPS certificate configuration beyond this client's default TLS verification",
            "POST/preflight/session isolation, persistence, market-data rights and trading rules",
        ],
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--frontend-origin", required=True, help="Explicit HTTP(S) origin; no default"
    )
    parser.add_argument(
        "--api-origin", help="Optional API HTTP(S) origin; no authentication is sent"
    )
    parser.add_argument(
        "--static-export", action="store_true",
        help="Check a static root entry and trailing-slash pages; no browser execution",
    )
    args = parser.parse_args(argv)
    try:
        report = run_checks(
            args.frontend_origin, args.api_origin, static_export=args.static_export
        )
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
