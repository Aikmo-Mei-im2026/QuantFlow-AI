from copy import deepcopy

import pytest

from app.data.quality import validate_sample

SYMBOL = "sh.600000"
START, END = "2026-01-02", "2026-01-05"


def bar(day="2026-01-02", **overrides):
    return {
        "date": day, "code": SYMBOL, "open": "10.00", "high": "12.00", "low": "9.00",
        "close": "11.00", "preclose": "10.50", "volume": "100", "amount": "1050.00",
        "adjustflag": "3", "tradestatus": "1", "isST": "0", **overrides,
    }


def sample():
    # Explicit calendar fixture, not a weekday-based calendar generator.
    return {SYMBOL: [bar(), bar("2026-01-05")]}, [
        {"calendar_date": "2026-01-02", "is_trading_day": "1"},
        {"calendar_date": "2026-01-03", "is_trading_day": "0"},
        {"calendar_date": "2026-01-04", "is_trading_day": "0"},
        {"calendar_date": "2026-01-05", "is_trading_day": "1"},
    ]


def codes(report):
    return {error["code"] for error in report["errors"]}


def test_complete_sample_has_independent_counts_and_does_not_mutate_inputs():
    bars, calendar = sample()
    original = deepcopy((bars, calendar))
    result = validate_sample(bars, calendar, START, END)
    assert result["passed"] is True
    assert result["execution_ready"] is False
    assert result["errors"] == []
    assert result["calendar"] == {
        "row_count": 4, "trading_day_count": 2, "missing_dates": []
    }
    assert result["summary"][SYMBOL] == {
        "row_count": 2, "first_date": START, "last_date": END,
        "suspended_count": 0, "missing_dates": [],
    }
    assert (bars, calendar) == original


def test_missing_market_day_is_reported_not_replaced_with_zero():
    bars, calendar = sample()
    bars[SYMBOL].pop()
    result = validate_sample(bars, calendar, START, END)
    assert result["passed"] is False
    assert result["summary"][SYMBOL]["missing_dates"] == [END]
    assert result["summary"][SYMBOL]["row_count"] == 1
    assert codes(result) == {"MISSING_TRADING_DAYS"}


@pytest.mark.parametrize(
    ("field", "value", "expected"),
    [
        ("open", "NaN", "INVALID_PRICE"),
        ("close", "Infinity", "INVALID_PRICE"),
        ("low", "0", "INVALID_PRICE"),
        ("preclose", "", "INVALID_PRICE"),
        ("high", "10.00", "INVALID_OHLC"),
        ("volume", "100.5", "INVALID_VOLUME"),
        ("volume", "-1", "INVALID_VOLUME"),
        ("amount", "-0.01", "INVALID_AMOUNT"),
        ("amount", "NaN", "INVALID_AMOUNT"),
        ("adjustflag", "2", "UNEXPECTED_ADJUSTMENT"),
        ("code", "sz.000001", "SYMBOL_MISMATCH"),
        ("tradestatus", "", "UNKNOWN_TRADING_STATUS"),
        ("isST", "unknown", "UNKNOWN_ST_STATUS"),
        ("date", "2026-02-30", "INVALID_BAR_DATE"),
        ("date", "20260102", "INVALID_BAR_DATE"),
        ("date", "2026-01-01", "BAR_DATE_OUT_OF_RANGE"),
    ],
)
def test_invalid_rows_have_explicit_reasons(field, value, expected):
    bars, calendar = sample()
    bars[SYMBOL][0][field] = value
    result = validate_sample(bars, calendar, START, END)
    assert result["passed"] is False
    assert expected in codes(result)


def test_duplicate_unsorted_bars_are_not_silently_deduplicated():
    bars, calendar = sample()
    bars[SYMBOL] = [bar(END), bar(), bar()]
    result = validate_sample(bars, calendar, START, END)
    assert codes(result) == {"DUPLICATE_BAR_DATE", "UNSORTED_BARS"}
    assert result["summary"][SYMBOL]["row_count"] == 3


def test_calendar_must_cover_closed_dates_too():
    bars, calendar = sample()
    del calendar[1]
    result = validate_sample(bars, calendar, START, END)
    assert result["calendar"]["missing_dates"] == ["2026-01-03"]
    assert "MISSING_CALENDAR_DATES" in codes(result)


def test_calendar_duplicate_and_reverse_order_fail_even_with_same_coverage():
    bars, calendar = sample()
    calendar = [calendar[1], calendar[0], *calendar[1:]]
    result = validate_sample(bars, calendar, START, END)
    assert codes(result) == {"DUPLICATE_CALENDAR_DATE", "UNSORTED_CALENDAR"}


def test_unknown_calendar_status_and_closed_day_bar_are_invalid():
    bars, calendar = sample()
    calendar[0]["is_trading_day"] = "unknown"
    bars[SYMBOL].insert(1, bar("2026-01-03"))
    result = validate_sample(bars, calendar, START, END)
    assert "INVALID_CALENDAR_STATUS" in codes(result)
    assert "BAR_ON_NONTRADING_DAY" in codes(result)


@pytest.mark.parametrize("price", ["10.50", ""])
def test_suspension_is_explicit_and_never_counts_as_tradable(price):
    bars, calendar = sample()
    bars[SYMBOL][0] = bar(
        tradestatus="0", volume="0", amount="0",
        open=price, high=price, low=price, close=price, preclose=price,
    )
    result = validate_sample(bars, calendar, START, END)
    assert result["passed"] is True
    assert result["execution_ready"] is False
    assert result["summary"][SYMBOL]["suspended_count"] == 1
    assert {"code": "SUSPENDED_NOT_TRADABLE", "symbol": SYMBOL, "date": START} in result[
        "warnings"
    ]


def test_suspended_row_with_activity_or_nonflat_prices_fails():
    bars, calendar = sample()
    bars[SYMBOL][0]["tradestatus"] = "0"
    result = validate_sample(bars, calendar, START, END)
    assert codes(result) == {"NONZERO_SUSPENDED_TRADING", "NONFLAT_SUSPENDED_PRICES"}


def test_empty_sources_do_not_report_success():
    result = validate_sample({}, [], START, END)
    assert {"EMPTY_SAMPLE", "EMPTY_CALENDAR", "MISSING_CALENDAR_DATES", "NO_TRADING_DAYS"} <= codes(
        result
    )
    assert result["passed"] is False


def test_empty_symbol_has_no_invented_bounds_and_lists_all_missing_days():
    _, calendar = sample()
    result = validate_sample({SYMBOL: []}, calendar, START, END)
    assert result["summary"][SYMBOL] == {
        "row_count": 0, "first_date": None, "last_date": None,
        "suspended_count": 0, "missing_dates": [START, END],
    }
    assert codes(result) == {"EMPTY_SYMBOL", "MISSING_TRADING_DAYS"}


@pytest.mark.parametrize(("start", "end"), [(END, START), ("2026-2-1", END), (START, "bad")])
def test_invalid_range_is_rejected(start, end):
    bars, calendar = sample()
    result = validate_sample(bars, calendar, start, end)
    assert codes(result) == {"INVALID_DATE_RANGE"}
