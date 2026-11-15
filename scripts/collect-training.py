"""Fetch a bounded selection of unadjusted A-share daily bars for the static training page."""

import argparse
import json
import re
import time
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from tempfile import NamedTemporaryFile

SHANGHAI = timezone(timedelta(hours=8))
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "data" / "training" / "training.json"
EASTMONEY_COLUMNS = ("日期", "开盘", "最高", "最低", "收盘", "成交量")
TENCENT_COLUMNS = ("date", "open", "high", "low", "close", "volume")


def stock_arg(value):
    code, _, name = value.partition("=")
    name = name.strip() or code
    if not re.fullmatch(r"(?:60|00)\d{4}", code) or len(name) > 80:
        raise argparse.ArgumentTypeError("Use a supported main-board code, optionally CODE=NAME")
    return code, name


def normalize_rows(rows, lot_size, start, end):
    candles = []
    previous = None
    for row in rows:
        day, opening, high, low, close, volume = row
        current = date.fromisoformat(str(day))
        prices = [Decimal(str(value)) for value in (opening, high, low, close)]
        if not start <= current <= end or (previous is not None and current <= previous):
            raise ValueError("Dates are outside the requested range or are not strictly increasing")
        if any(not price.is_finite() or not 0 < price < 1_000_000 or price * 100 % 1 for price in prices):
            raise ValueError(f"Invalid unadjusted OHLC on {day}")
        opening, high, low, close = map(float, prices)
        shares = Decimal(str(volume)) * lot_size
        if high < max(opening, close) or low > min(opening, close):
            raise ValueError(f"Inconsistent OHLC on {day}")
        if not shares.is_finite() or not 0 <= shares <= 2**53 - 1 or shares % 1:
            raise ValueError(f"Invalid share volume on {day}")
        candles.append(dict(date=str(current), open=opening, high=high, low=low, close=close, vol=int(shares)))
        previous = current
    if len(candles) < 2:
        raise ValueError("The provider returned fewer than two daily bars")
    return candles


def collect(ak, provider, code, start, end):
    dates = {"start_date": start.strftime("%Y%m%d"), "end_date": end.strftime("%Y%m%d"), "adjust": ""}
    if provider == "eastmoney":
        frame = ak.stock_zh_a_hist_em(symbol=code, period="daily", **dates)
        columns, lot_size = EASTMONEY_COLUMNS, 100
    else:
        frame = ak.stock_zh_a_hist_tx(symbol=code, **dates)
        columns, lot_size = TENCENT_COLUMNS, 1
    if frame.empty:
        raise ValueError("No history returned for this code and interval")
    rows = frame.loc[:, list(columns)].sort_values(columns[0]).itertuples(index=False, name=None)
    return normalize_rows(rows, lot_size, start, end)


def save(snapshot, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    file = NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False)
    temporary = Path(file.name)
    try:
        with file:
            json.dump(snapshot, file, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
            file.write("\n")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stock", action="append", type=stock_arg, required=True, metavar="CODE[=NAME]")
    parser.add_argument("--start", type=date.fromisoformat, required=True)
    parser.add_argument("--end", type=date.fromisoformat, required=True)
    parser.add_argument("--provider", choices=("tencent", "eastmoney"), default="tencent")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    today = datetime.now(SHANGHAI).date()
    if not args.start < args.end < today or (args.end - args.start).days > 366 * 5:
        parser.error("Choose a completed historical interval of up to five years")
    if not 1 <= len(args.stock) <= 5 or len(dict(args.stock)) != len(args.stock):
        parser.error("Provide 1 to 5 distinct stock codes")

    try:
        import akshare as ak
    except ImportError:
        parser.exit(1, "Install the collector dependency with: python -m pip install akshare==1.20.63\n")

    instruments = []
    for index, (code, name) in enumerate(args.stock):
        if index:
            time.sleep(1)
        try:
            candles = collect(ak, args.provider, code, args.start, args.end)
        except Exception as error:
            parser.exit(1, f"{args.provider} could not fetch {code}: {type(error).__name__}: {error}\n")
        instruments.append({"code": code, "name": name, "candles": candles})

    source = "东方财富" if args.provider == "eastmoney" else "腾讯证券"
    save({
        "schema": "quantflow-training-v1",
        "source": f"AKShare / {source}",
        "collectedAt": datetime.now(SHANGHAI).isoformat(timespec="seconds"),
        "priceBasis": "unadjusted",
        "volumeUnit": "shares",
        "instruments": instruments,
    }, args.output)
    print(f"Saved {sum(len(item['candles']) for item in instruments)} bars to {args.output}")


if __name__ == "__main__":
    main()
