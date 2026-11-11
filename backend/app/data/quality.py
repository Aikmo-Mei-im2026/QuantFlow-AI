"""Offline BaoStock daily-sample checks, without repair or execution assumptions.

A passing report covers the supplied data only. It does not establish source accuracy,
redistribution rights, price-limit support, corporate actions, or trading eligibility.
"""

import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

PRICE_FIELDS = ("open", "high", "low", "close", "preclose")


def _date(value: str | None) -> date | None:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _decimal(value: str | None) -> Decimal | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        number = Decimal(value)
    except InvalidOperation:
        return None
    return number if number.is_finite() else None


def _check_numbers(row: dict[str, str], suspended: bool, report) -> None:
    prices: dict[str, Decimal] = {}
    for field in PRICE_FIELDS:
        raw = row.get(field)
        if suspended and raw in (None, ""):
            continue
        number = _decimal(raw)
        if number is None or number < 0 or (not suspended and number == 0):
            report("INVALID_PRICE", field=field)
        else:
            prices[field] = number

    if all(field in prices for field in ("open", "high", "low", "close")):
        if not (
            prices["low"] <= min(prices["open"], prices["close"])
            <= max(prices["open"], prices["close"]) <= prices["high"]
        ):
            report("INVALID_OHLC")
        if suspended and len({prices[field] for field in ("open", "high", "low", "close")}) > 1:
            report("NONFLAT_SUSPENDED_PRICES")

    volume_raw = row.get("volume", "")
    volume = None
    if isinstance(volume_raw, str) and re.fullmatch(r"[0-9]+", volume_raw):
        volume = int(volume_raw)
    if volume is None:
        report("INVALID_VOLUME", field="volume")

    amount = _decimal(row.get("amount"))
    if amount is None or amount < 0:
        report("INVALID_AMOUNT", field="amount")
    if suspended and (volume not in (None, 0) or amount not in (None, Decimal(0))):
        report("NONZERO_SUSPENDED_TRADING")


def validate_sample(
    bars: dict[str, list[dict[str, str]]],
    calendar: list[dict[str, str]],
    start_date: str,
    end_date: str,
) -> dict[str, object]:
    """Validate raw string rows; preserve inputs and report gaps instead of filling them."""
    errors: list[dict[str, object]] = []
    warnings: list[dict[str, object]] = [{"code": "EXECUTION_READINESS_NOT_EVALUATED"}]
    summary: dict[str, dict[str, object]] = {}
    result: dict[str, object] = {
        "passed": False,
        "execution_ready": False,
        "errors": errors,
        "warnings": warnings,
        "summary": summary,
    }
    start, end = _date(start_date), _date(end_date)
    if start is None or end is None or start > end:
        errors.append({"code": "INVALID_DATE_RANGE"})
        return result

    expected_days = {start + timedelta(days=offset) for offset in range((end - start).days + 1)}
    calendar_days: set[date] = set()
    trading_days: set[date] = set()
    previous_day = None
    if not calendar:
        errors.append({"code": "EMPTY_CALENDAR"})
    for row in calendar:
        day_text = row.get("calendar_date", "")
        day = _date(day_text)
        if day is None:
            errors.append({"code": "INVALID_CALENDAR_DATE", "date": day_text})
            continue
        if day in calendar_days:
            errors.append({"code": "DUPLICATE_CALENDAR_DATE", "date": day_text})
        if previous_day is not None and day < previous_day:
            errors.append({"code": "UNSORTED_CALENDAR", "date": day_text})
        previous_day = day
        calendar_days.add(day)
        if day not in expected_days:
            errors.append({"code": "CALENDAR_DATE_OUT_OF_RANGE", "date": day_text})
        status = row.get("is_trading_day")
        if status not in {"0", "1"}:
            errors.append({"code": "INVALID_CALENDAR_STATUS", "date": day_text})
        elif status == "1" and day in expected_days:
            trading_days.add(day)
    missing_calendar = sorted(day.isoformat() for day in expected_days - calendar_days)
    if missing_calendar:
        errors.append({"code": "MISSING_CALENDAR_DATES", "dates": missing_calendar})
    if not trading_days:
        errors.append({"code": "NO_TRADING_DAYS"})
    result["calendar"] = {
        "row_count": len(calendar),
        "trading_day_count": len(trading_days),
        "missing_dates": missing_calendar,
    }

    if not bars:
        errors.append({"code": "EMPTY_SAMPLE"})
    for symbol, rows in bars.items():
        observed_days: set[date] = set()
        previous_bar = None
        suspended_count = 0
        if not rows:
            errors.append({"code": "EMPTY_SYMBOL", "symbol": symbol})
        for row in rows:
            day_text = row.get("date", "")

            def report(code: str, *, symbol=symbol, day_text=day_text, **extra):
                errors.append({"code": code, "symbol": symbol, "date": day_text, **extra})

            day = _date(day_text)
            if day is None:
                report("INVALID_BAR_DATE")
            else:
                if day in observed_days:
                    report("DUPLICATE_BAR_DATE")
                if previous_bar is not None and day < previous_bar:
                    report("UNSORTED_BARS")
                previous_bar = day
                observed_days.add(day)
                if day not in expected_days:
                    report("BAR_DATE_OUT_OF_RANGE")
                if day not in calendar_days:
                    report("BAR_WITHOUT_CALENDAR")
                elif day not in trading_days:
                    report("BAR_ON_NONTRADING_DAY")
            if row.get("code") != symbol:
                report("SYMBOL_MISMATCH")
            if row.get("adjustflag") != "3":
                report("UNEXPECTED_ADJUSTMENT")
            status = row.get("tradestatus")
            if status not in {"0", "1"}:
                report("UNKNOWN_TRADING_STATUS")
            if row.get("isST") not in {"0", "1"}:
                report("UNKNOWN_ST_STATUS")
            suspended = status == "0"
            if suspended:
                suspended_count += 1
                warnings.append(
                    {"code": "SUSPENDED_NOT_TRADABLE", "symbol": symbol, "date": day_text}
                )
            _check_numbers(row, suspended, report)
        missing = sorted(day.isoformat() for day in trading_days - observed_days)
        if missing:
            errors.append({"code": "MISSING_TRADING_DAYS", "symbol": symbol, "dates": missing})
        summary[symbol] = {
            "row_count": len(rows),
            "first_date": min(observed_days).isoformat() if observed_days else None,
            "last_date": max(observed_days).isoformat() if observed_days else None,
            "suspended_count": suspended_count,
            "missing_dates": missing,
        }
    result["passed"] = not errors
    return result
