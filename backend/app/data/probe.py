"""Bounded serial BaoStock sampling for local source verification, never an API route."""

import argparse
import csv
import hashlib
import importlib.metadata
import json
import re
import socket
import subprocess
import sys
import time
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

DEFAULT_SYMBOLS = ["sh.600000", "sh.600036", "sh.600519", "sz.000001", "sz.000333"]
FIELDS = "date,code,open,high,low,close,preclose,volume,amount,adjustflag,tradestatus,isST"
DATA_ROOT = Path(__file__).resolve().parents[3] / "data" / "source-validation" / "baostock"


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def write_json(path: Path, value: object) -> None:
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def validate_request(start: str, end: str, symbols: list[str]) -> None:
    if not all(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) for value in (start, end)):
        raise ValueError("Dates must use YYYY-MM-DD")
    first, last = date.fromisoformat(start), date.fromisoformat(end)
    today_shanghai = (datetime.now(UTC) + timedelta(hours=8)).date()
    if first > last or (last - first).days > 365 or last >= today_shanghai:
        raise ValueError("Use a past interval of at most 366 calendar dates")
    if not 1 <= len(symbols) <= 5 or len(set(symbols)) != len(symbols):
        raise ValueError("Provide 1-5 distinct symbols")
    if not all(re.fullmatch(r"(?:sh\.60|sz\.00)\d{4}", symbol) for symbol in symbols):
        raise ValueError("This probe only samples sh.60xxxx / sz.00xxxx stocks")


def initial_manifest(start: str, end: str, symbols: list[str]) -> dict:
    return {
        "schema_version": "source-probe-v1",
        "source_id": "baostock",
        "source_url": "https://www.baostock.com",
        "client_version": importlib.metadata.version("baostock"),
        "started_at": utc_now(),
        "completed_at": None,
        "retrieval_status": "pending",
        "run_status": "pending",
        "mode": "replay",
        "date_range": {"start": start, "end": end},
        "symbols": symbols,
        "sampling": "manually selected stocks, not a historical universe",
        "timezone": "Asia/Shanghai",
        "price_basis": "unadjusted",
        "adjustflag": "3",
        "units": {"prices": "CNY", "amount": "CNY", "volume": "shares"},
        "usage": {
            "local_research": "provider_documented",
            "public_display": "unconfirmed",
            "redistribution": "unconfirmed",
            "publishable": False,
        },
        "limitations": [
            "Download-time reconstruction; not point-in-time revision history.",
            "Not a complete historical stock universe or full-market ranking sample.",
            "Price limits and corporate actions are not retrieved; not execution-ready.",
            "Quality success does not grant public display or redistribution rights.",
        ],
        "requests": [],
        "files": [],
    }


def collect_rows(result) -> list[dict[str, str]]:
    if result.error_code != "0":
        raise RuntimeError("PROVIDER_QUERY_FAILED")
    if not result.fields or len(set(result.fields)) != len(result.fields):
        raise RuntimeError("PROVIDER_INVALID_FIELDS")
    rows = []
    while result.next():
        values = result.get_row_data()
        if len(values) != len(result.fields):
            raise RuntimeError("PROVIDER_FIELD_COUNT_MISMATCH")
        rows.append(dict(zip(result.fields, values, strict=True)))
        if len(rows) > 366:
            raise RuntimeError("PROVIDER_ROW_LIMIT_EXCEEDED")
    if result.error_code != "0":
        raise RuntimeError("PROVIDER_PAGINATION_FAILED")
    if not rows:
        raise RuntimeError("PROVIDER_EMPTY_RESULT")
    return rows


def save_csv(folder: Path, filename: str, rows: list[dict[str, str]], fields: list[str]) -> dict:
    path = folder / filename
    with path.open("x", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    content = path.read_bytes()
    return {
        "name": filename, "rows": len(rows), "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(), "fields": fields,
    }


def worker(folder: Path, start: str, end: str, symbols: list[str]) -> int:
    import baostock as bs

    from app.data.quality import validate_sample

    previous_timeout = socket.getdefaulttimeout()
    socket.setdefaulttimeout(15)
    manifest_path = folder / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["retrieval_status"] = "collecting"
    write_json(manifest_path, manifest)
    logged_in = False

    def request(name, call, expected_fields):
        entry = {"operation": name, "started_at": utc_now(), "status": "pending"}
        manifest["requests"].append(entry)
        write_json(manifest_path, manifest)
        result = None
        try:
            result = call()
            entry["provider_code"] = result.error_code
            if result.error_code == "0" and result.fields != expected_fields:
                raise RuntimeError("PROVIDER_UNEXPECTED_FIELDS")
            rows = collect_rows(result)
            filename = name + ".csv"
            manifest["files"].append(save_csv(folder, filename, rows, result.fields))
        except Exception as exc:
            if result is not None:
                entry["provider_code"] = result.error_code
            reason = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
            entry.update(status="failed", reason=reason, completed_at=utc_now())
            write_json(manifest_path, manifest)
            raise
        entry.update(status="succeeded", rows=len(rows), completed_at=utc_now())
        write_json(manifest_path, manifest)
        time.sleep(0.5)  # Provider forbids concurrent connections; one serial session only.
        return rows

    try:
        login = bs.login()  # Documented anonymous session; no personal credentials.
        manifest["login_code"] = login.error_code
        if login.error_code != "0":
            raise RuntimeError("PROVIDER_LOGIN_FAILED")
        logged_in = True
        calendar = request(
            "calendar", lambda: bs.query_trade_dates(start_date=start, end_date=end),
            ["calendar_date", "is_trading_day"],
        )
        bars = {}
        for symbol in symbols:
            bars[symbol] = request(
                "bars-" + symbol,
                lambda symbol=symbol: bs.query_history_k_data_plus(
                    symbol, FIELDS, start_date=start, end_date=end, frequency="d", adjustflag="3"
                ),
                FIELDS.split(","),
            )
        quality = validate_sample(bars, calendar, start, end)
        write_json(folder / "quality-report.json", quality)
        manifest["quality_passed"] = quality["passed"]
        manifest["retrieval_status"] = "succeeded"
        return 0 if quality["passed"] else 2
    except Exception as exc:
        manifest["retrieval_status"] = "failed"
        manifest["failure"] = str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__
        return 1
    finally:
        manifest["completed_at"] = utc_now()
        manifest["logout_status"] = "pending" if logged_in else "not_logged_in"
        write_json(manifest_path, manifest)
        try:
            if logged_in:
                logout = bs.logout()
                manifest["logout_status"] = "succeeded" if logout.error_code == "0" else "failed"
        except Exception as exc:
            manifest["logout_status"] = "failed"
            manifest["logout_error"] = type(exc).__name__
        finally:
            socket.setdefaulttimeout(previous_timeout)
            write_json(manifest_path, manifest)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default="2025-01-01")
    parser.add_argument("--end", default="2025-06-30")
    parser.add_argument("--symbols", nargs="+", default=DEFAULT_SYMBOLS)
    parser.add_argument("--worker", type=Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        validate_request(args.start, args.end, args.symbols)
    except ValueError as exc:
        parser.error(str(exc))
    if args.worker:
        return worker(args.worker, args.start, args.end, args.symbols)
    try:
        manifest = initial_manifest(args.start, args.end, args.symbols)
    except importlib.metadata.PackageNotFoundError:
        parser.error("Install optional data dependencies: pip install -e '.[data]'")
    folder = DATA_ROOT / (datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ-") + uuid4().hex[:8])
    folder.mkdir(parents=True, exist_ok=False)
    manifest["dataset_version"] = folder.name
    manifest_path = folder / "manifest.json"
    write_json(manifest_path, manifest)
    command = [
        sys.executable, "-m", "app.data.probe", "--worker", str(folder),
        "--start", args.start, "--end", args.end, "--symbols", *args.symbols,
    ]
    timed_out = False
    try:
        completed = subprocess.run(command, capture_output=True, timeout=150, check=False)
        code = completed.returncode
    except subprocess.TimeoutExpired:
        code = 1
        timed_out = True
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest["retrieval_status"] in {"pending", "collecting"}:
        code = 1
        manifest.update(
            retrieval_status="failed", failure="WORKER_TIMEOUT_OR_EXIT", completed_at=utc_now()
        )
        for entry in manifest["requests"]:
            if entry["status"] == "pending":
                entry.update(
                    status="failed", reason="WORKER_TIMEOUT_OR_EXIT", completed_at=utc_now()
                )
    if timed_out:
        manifest["worker_failure"] = "WORKER_TIMEOUT"
    manifest["run_status"] = (
        "succeeded" if code == 0 else "quality_failed" if code == 2 else "failed"
    )
    manifest["worker_exit_code"] = code
    manifest["worker_completed_at"] = utc_now()
    write_json(manifest_path, manifest)
    print(json.dumps({"directory": str(folder), "status": manifest["run_status"]}))
    return code


if __name__ == "__main__":
    raise SystemExit(main())
