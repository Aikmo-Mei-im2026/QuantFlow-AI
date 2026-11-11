"""Offline source-probe checks: no provider calls or market-data fixtures."""

import csv
import hashlib
import json
import subprocess
import sys
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.data import probe


class FakeResult:
    def __init__(self, fields, rows, code="0", final_code="0"):
        self.fields = fields
        self.rows = iter(rows)
        self.error_code = code
        self.final_code = final_code
        self.current = None

    def next(self):
        self.current = next(self.rows, None)
        if self.current is None:
            self.error_code = self.final_code
            return False
        return True

    def get_row_data(self):
        return self.current


class FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        # UTC is still January 2, but Shanghai has reached January 3.
        return cls(2025, 1, 2, 17, 0, tzinfo=UTC).astimezone(tz)


@pytest.mark.parametrize(
    ("start", "end", "symbols"),
    [
        ("2024-01-01", "2024-12-31", ["sh.600000"]),
        ("2024-12-31", "2024-12-31", probe.DEFAULT_SYMBOLS),
        ("2025-01-02", "2025-01-02", ["sz.000001"]),
    ],
)
def test_request_accepts_bounded_past_intervals(monkeypatch, start, end, symbols):
    monkeypatch.setattr(probe, "datetime", FixedDatetime)
    probe.validate_request(start, end, symbols)


@pytest.mark.parametrize(
    ("start", "end", "symbols"),
    [
        ("2024-1-01", "2024-01-02", ["sh.600000"]),
        ("2024-02-30", "2024-03-01", ["sh.600000"]),
        ("2024-01-02", "2024-01-01", ["sh.600000"]),
        ("2024-01-01", "2025-01-01", ["sh.600000"]),
        ("2025-01-02", "2025-01-03", ["sh.600000"]),
        ("2025-01-04", "2025-01-04", ["sh.600000"]),
        ("2024-01-01", "2024-01-02", []),
        ("2024-01-01", "2024-01-02", ["sh.600000", "sh.600000"]),
        ("2024-01-01", "2024-01-02", [*probe.DEFAULT_SYMBOLS, "sh.601398"]),
        ("2024-01-01", "2024-01-02", ["sh.688001"]),
        ("2024-01-01", "2024-01-02", ["sz.300001"]),
        ("2024-01-01", "2024-01-02", ["../sh.600000"]),
    ],
)
def test_request_rejects_invalid_or_out_of_scope_values(monkeypatch, start, end, symbols):
    monkeypatch.setattr(probe, "datetime", FixedDatetime)
    with pytest.raises(ValueError):
        probe.validate_request(start, end, symbols)


def test_manifest_marks_local_research_and_unconfirmed_public_use(monkeypatch):
    monkeypatch.setattr(probe.importlib.metadata, "version", lambda name: "test-client")
    manifest = probe.initial_manifest("2025-01-02", "2025-01-02", ["sh.600000"])
    assert manifest["client_version"] == "test-client"
    assert manifest["retrieval_status"] == "pending"
    assert manifest["mode"] == "replay"
    assert manifest["price_basis"] == "unadjusted"
    assert manifest["units"] == {"prices": "CNY", "amount": "CNY", "volume": "shares"}
    assert manifest["usage"]["publishable"] is False
    assert manifest["usage"]["public_display"] == "unconfirmed"
    assert manifest["usage"]["redistribution"] == "unconfirmed"


def test_collect_rows_preserves_string_precision_and_blank_values():
    rows = probe.collect_rows(FakeResult(["price", "missing"], [["1.23000000", ""]]))
    assert rows == [{"price": "1.23000000", "missing": ""}]


@pytest.mark.parametrize(
    ("result", "reason"),
    [
        (FakeResult(["x"], [["1"]], code="100"), "PROVIDER_QUERY_FAILED"),
        (FakeResult(["x"], []), "PROVIDER_EMPTY_RESULT"),
        (FakeResult(["x", "y"], [["1"]]), "PROVIDER_FIELD_COUNT_MISMATCH"),
        (FakeResult(["x"], [["1"]], final_code="100"), "PROVIDER_PAGINATION_FAILED"),
        (FakeResult(["x"], [["1"]] * 367), "PROVIDER_ROW_LIMIT_EXCEEDED"),
        (FakeResult(["x", "x"], [["1", "2"]]), "PROVIDER_INVALID_FIELDS"),
    ],
)
def test_collect_rows_rejects_provider_failures(result, reason):
    with pytest.raises(RuntimeError, match=f"^{reason}$"):
        probe.collect_rows(result)


def test_collect_rows_accepts_exact_calendar_day_limit():
    assert len(probe.collect_rows(FakeResult(["x"], [["1"]] * 366))) == 366


def test_csv_bytes_checksum_and_no_overwrite(tmp_path):
    rows = [{"price": "0.10000000000000001", "missing": ""}]
    fields = ["price", "missing"]
    expected = b"price,missing\r\n0.10000000000000001,\r\n"
    metadata = probe.save_csv(tmp_path, "sample.csv", rows, fields)
    assert (tmp_path / "sample.csv").read_bytes() == expected
    assert metadata == {
        "name": "sample.csv", "rows": 1, "bytes": len(expected),
        "sha256": hashlib.sha256(expected).hexdigest(), "fields": fields,
    }
    with (tmp_path / "sample.csv").open(encoding="utf-8", newline="") as handle:
        assert list(csv.DictReader(handle)) == rows
    with pytest.raises(FileExistsError):
        probe.save_csv(tmp_path, "sample.csv", [], fields)
    assert (tmp_path / "sample.csv").read_bytes() == expected


@pytest.fixture
def worker_context(monkeypatch, tmp_path):
    monkeypatch.setattr(probe.importlib.metadata, "version", lambda name: "test-client")
    monkeypatch.setattr(probe.socket, "setdefaulttimeout", lambda seconds: None)
    monkeypatch.setattr(probe.time, "sleep", lambda seconds: None)
    calls = []

    def query_trade_dates(**kwargs):
        calls.append(("calendar", kwargs))
        return FakeResult(["calendar_date", "is_trading_day"], [["2025-01-02", "1"]])

    def query_history(symbol, fields, **kwargs):
        calls.append(("bars", symbol, fields, kwargs))
        return FakeResult(
            fields.split(","),
            [["2025-01-02", symbol, "10.00", "11.00", "9.00", "10.50",
              "10.00", "100", "1050.00", "3", "1", "0"]],
        )

    def logout():
        calls.append(("logout",))
        return SimpleNamespace(error_code="0")

    client = SimpleNamespace(
        login=lambda: SimpleNamespace(error_code="0"),
        logout=logout,
        query_trade_dates=query_trade_dates,
        query_history_k_data_plus=query_history,
    )
    monkeypatch.setitem(sys.modules, "baostock", client)
    manifest = probe.initial_manifest("2025-01-02", "2025-01-02", ["sh.600000"])
    probe.write_json(tmp_path / "manifest.json", manifest)
    return tmp_path, client, calls


def read_manifest(folder):
    return json.loads((folder / "manifest.json").read_text(encoding="utf-8"))


def test_worker_serial_success_persists_quality_and_source_files(worker_context):
    folder, _, calls = worker_context
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 0
    manifest = read_manifest(folder)
    report = json.loads((folder / "quality-report.json").read_text(encoding="utf-8"))
    assert manifest["retrieval_status"] == "succeeded"
    assert manifest["quality_passed"] is True
    assert report["execution_ready"] is False
    assert report["calendar"]["trading_day_count"] == 1
    assert report["summary"]["sh.600000"]["row_count"] == 1
    assert [entry["name"] for entry in manifest["files"]] == [
        "calendar.csv", "bars-sh.600000.csv",
    ]
    assert calls == [
        ("calendar", {"start_date": "2025-01-02", "end_date": "2025-01-02"}),
        ("bars", "sh.600000", probe.FIELDS, {
            "start_date": "2025-01-02", "end_date": "2025-01-02",
            "frequency": "d", "adjustflag": "3",
        }),
        ("logout",),
    ]


def test_worker_login_failure_records_failure_without_query_or_logout(worker_context):
    folder, client, calls = worker_context
    client.login = lambda: SimpleNamespace(error_code="100")
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 1
    manifest = read_manifest(folder)
    assert manifest["retrieval_status"] == "failed"
    assert manifest["failure"] == "PROVIDER_LOGIN_FAILED"
    assert manifest["files"] == []
    assert calls == []


def test_worker_query_failure_retains_partial_files_and_failed_request(worker_context):
    folder, client, calls = worker_context
    client.query_history_k_data_plus = lambda *a, **kw: FakeResult([], [], code="200")
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 1
    manifest = read_manifest(folder)
    assert manifest["retrieval_status"] == "failed"
    assert manifest["failure"] == "PROVIDER_QUERY_FAILED"
    assert manifest["requests"][-1]["status"] == "failed"
    assert manifest["requests"][-1]["provider_code"] == "200"
    assert [entry["name"] for entry in manifest["files"]] == ["calendar.csv"]
    assert (folder / "calendar.csv").exists()
    assert not (folder / "quality-report.json").exists()
    assert calls[-1] == ("logout",)


def test_worker_quality_failure_is_distinct_from_download_failure(worker_context):
    folder, client, _ = worker_context
    original = client.query_history_k_data_plus

    def impossible_price(*args, **kwargs):
        result = original(*args, **kwargs)
        rows = list(result.rows)
        rows[0][3] = "8.00"  # High is below open and close; no repair should occur.
        result.rows = iter(rows)
        return result

    client.query_history_k_data_plus = impossible_price
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 2
    manifest = read_manifest(folder)
    assert manifest["retrieval_status"] == "succeeded"
    assert manifest["quality_passed"] is False
    assert (folder / "bars-sh.600000.csv").exists()


def test_main_timeout_records_failure_without_inventing_data(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(probe, "DATA_ROOT", tmp_path)
    monkeypatch.setattr(probe.importlib.metadata, "version", lambda name: "test-client")
    monkeypatch.setattr(sys, "argv", ["probe", "--start", "2024-01-01", "--end", "2024-01-02"])

    def timeout(*args, **kwargs):
        assert kwargs["timeout"] == 150
        raise subprocess.TimeoutExpired(args[0], 150)

    monkeypatch.setattr(probe.subprocess, "run", timeout)
    assert probe.main() == 1
    output = json.loads(capsys.readouterr().out)
    assert output["status"] == "failed"
    folders = list(tmp_path.iterdir())
    assert len(folders) == 1
    manifest = read_manifest(folders[0])
    assert manifest["retrieval_status"] == "failed"
    assert manifest["completed_at"] is not None
    assert manifest["files"] == []
    assert list(folders[0].glob("*.csv")) == []


def test_worker_request_exception_ends_pending_request(worker_context):
    folder, client, _ = worker_context

    def fail(**kwargs):
        raise TimeoutError("sensitive provider detail")

    client.query_trade_dates = fail
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 1
    manifest = read_manifest(folder)
    request = manifest["requests"][0]
    assert request["status"] == "failed"
    assert request["reason"] == "TimeoutError"
    assert request["completed_at"] is not None
    assert manifest["files"] == []


def test_worker_logout_failure_preserves_valid_data_and_records_cleanup(worker_context):
    folder, client, _ = worker_context

    def fail():
        raise ConnectionError("sensitive provider detail")

    client.logout = fail
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 0
    manifest = read_manifest(folder)
    assert manifest["retrieval_status"] == "succeeded"
    assert manifest["quality_passed"] is True
    assert manifest["logout_status"] == "failed"
    assert manifest["logout_error"] == "ConnectionError"


def test_worker_rejects_unexpected_provider_schema(worker_context):
    folder, client, _ = worker_context
    client.query_trade_dates = lambda **kw: FakeResult(["date", "is_trading_day"], [["x", "1"]])
    assert probe.worker(folder, "2025-01-02", "2025-01-02", ["sh.600000"]) == 1
    manifest = read_manifest(folder)
    assert manifest["failure"] == "PROVIDER_UNEXPECTED_FIELDS"
    assert manifest["files"] == []


@pytest.mark.parametrize("stage", ["collecting", "succeeded"])
def test_main_timeout_finishes_request_and_reports_failed_run(monkeypatch, tmp_path, stage):
    monkeypatch.setattr(probe, "DATA_ROOT", tmp_path)
    monkeypatch.setattr(probe.importlib.metadata, "version", lambda name: "test-client")
    monkeypatch.setattr(sys, "argv", ["probe", "--start", "2024-01-01", "--end", "2024-01-02"])

    def timeout(command, **kwargs):
        folder = next(tmp_path.iterdir())
        manifest = read_manifest(folder)
        manifest["retrieval_status"] = stage
        manifest["requests"] = [{
            "operation": "calendar", "status": "pending" if stage == "collecting" else "succeeded",
        }]
        if stage == "succeeded":
            manifest["quality_passed"] = True
            manifest["logout_status"] = "pending"
        probe.write_json(folder / "manifest.json", manifest)
        raise subprocess.TimeoutExpired(command, 150)

    monkeypatch.setattr(probe.subprocess, "run", timeout)
    assert probe.main() == 1
    manifest = read_manifest(next(tmp_path.iterdir()))
    assert manifest["run_status"] == "failed"
    assert manifest["worker_failure"] == "WORKER_TIMEOUT"
    assert manifest["worker_exit_code"] == 1
    if stage == "collecting":
        assert manifest["retrieval_status"] == "failed"
        assert manifest["requests"][0]["status"] == "failed"
    else:
        assert manifest["retrieval_status"] == "succeeded"
        assert manifest["quality_passed"] is True
