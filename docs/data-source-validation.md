# S03 数据来源与小样本验证

验证日期：2026-11-11。由Codex实施，并由独立代理复核来源、采集边界及实际文件；未联系数据提供方、未注册账号、未提交推送或公开发布原始行情。

**结论：BaoStock本地研究采样与离线质量验证通过。公开展示/再分发条件仍未确认，交易执行尚未就绪。** S03的调查与实测已完成并记录限制，不代表正式数据发布门槛通过，也不替代S10协议冻结、S11部署或S12业务读取验收。

## 1. 官方来源和使用范围

以下页面于2026-11-11实际读取。网站使用SPA，文档正文来自其官方helpdocs接口，免责声明来自官方articleMall接口；表中链接为供人阅读的正常入口。

| 来源 | 核对结果 | 本项目处理 |
| --- | --- | --- |
| [平台介绍](https://www.baostock.com/mainContent?file=home.md) | 免费、无需注册，支持将数据全部保存本地后分析；交易日17:30更新日线、18:00更新复权因子 | 采用匿名串行SDK会话，仅本地分析；不能称实时行情 |
| [访问规则](https://www.baostock.com/blacklist) | API每天不超过50000次，不能并发连接访问 | 一个会话内串行请求，调用间隔0.5秒；使用者也不能同时运行多个采样进程 |
| [免责声明](https://www.baostock.com/disclaimer) V1.0.0第5节 | 网站文字、图片、代码、设计等未经书面许可不得复制、传播或商业使用；没有找到单独明确授予行情API公开展示/再分发的条款 | 本地保存条件有依据；公开展示与再分发记为unconfirmed，publishable=false |
| [日K线字段](https://www.baostock.com/mainContent?file=stockKData.md) | 提供复权标记、停牌/ST状态、OHLC、成交量和成交额 | 保留原始字符串及不复权口径，不将缺失填0 |
| [证券/日历接口](https://www.baostock.com/mainContent?file=StockBasicInfoAPI.md) | query_trade_dates返回全部自然日；query_all_stock可指定历史日，含股票和指数，也可能成功但空结果 | 本次只请求日历和日线；没有取得完整历史股票池 |
| [基本资料](https://www.baostock.com/mainContent?file=stockBasic.md) | type区分股票、指数、其他、可转债、ETF；status为上市状态 | 当前名称和上市状态不能代替过去时点状态；本次不采ETF |
| [Python包元数据](https://pypi.org/pypi/baostock/json) | 使用baostock 0.9.4，包声明BSD许可 | 软件包代码许可与行情使用许可分别判断 |

平台宣称股票日/周/月线始于1990-12-19、ETF始于2005-02-23；本次仅验证下面的半年区间，不能据此确认整个覆盖范围。官方SDK使用公开主机public-api.baostock.com的TCP 10030端口，环境需允许该出站连接；没有使用个人凭证或绕过访问限制。

## 2. 实际采样结果

- 请求区间：2025-01-01至2025-06-30，日线，adjustflag=3（不复权）。
- 人工预先选定5只沪深主板股票用于工程验证，没有按期间收益挑选；不构成完整历史股票池。
- 采集开始：2026-11-11T00:27:47.090421Z；数据与质量报告完成：00:27:55.994317Z（北京时间08:27:47至08:27:55）。
- SDK登录、1次日历与5次日线查询均返回代码0；采样命令退出码0。
- 本地版本目录：data/source-validation/baostock/20261111T002747Z-1b9d1540/。

| 文件 | 行数 | 观测范围 | 质量结果 |
| --- | ---: | --- | --- |
| calendar.csv | 181 | 2025-01-01至2025-06-30，117个交易日 | 自然日无缺漏/重复，状态有效 |
| bars-sh.600000.csv | 117 | 2025-01-02至2025-06-30 | 通过 |
| bars-sh.600036.csv | 117 | 同上 | 通过 |
| bars-sh.600519.csv | 117 | 同上 | 通过 |
| bars-sz.000001.csv | 117 | 同上 | 通过 |
| bars-sz.000333.csv | 117 | 同上 | 通过 |

共585条日线，没有缺失交易日、重复、倒序、非交易日行情或本校验器识别的数值异常；这5只样本期间没有停牌行。停牌分支由离线构造测试覆盖，不能声称已用实际停牌数据验证。价格未与第二数据源交叉核对。

manifest.json保存来源、客户端版本、采集时间、请求状态、单位、使用条件与每个CSV的SHA256、字节数、行数、表头。quality-report.json保存错误/警告、每只股票覆盖范围与日历统计。六个CSV均已离线复读，校验值/行数/表头与清单一致，重新校验结果与保存报告完全一致。

首批manifest以目录名作为版本标识；后续CLI显式写入dataset_version、run_status、worker_exit_code及logout_status。首批记录保留原样，不倒填未观测的注销过程。后续失败处理的修正通过离线注入验证，没有为测试而重复请求提供方。

## 3. 字段口径

| 原始字段 | 官方语义 | 当前保存/未来转换约束 |
| --- | --- | --- |
| date / calendar_date | 交易所日期 / 自然日 | YYYY-MM-DD，Asia/Shanghai；不能按普通工作日生成日历 |
| code | sh.600000或sz.000001等 | 原始代码保留；未来规范代码SSE:600000/SZSE:000001另行映射 |
| open/high/low/close | CNY价格 | 原始十进制字符串，无浮点往返；质量计算使用Decimal |
| preclose | 前收盘参考价 | 除权日可能为交易所调整参考值，不强制等于上一行close |
| volume | 股 | 原始非负整数字符串，未来标准API再转安全整数 |
| amount | 人民币元成交额 | 原始十进制字符串；未来映射turnover，不乘100或10000 |
| adjustflag | 1后复权、2前复权、3不复权 | 本次只允许3；不能用复权价直接记交易账本 |
| tradestatus | 1交易、0停牌 | 不能仅据此判断可成交；停牌不默认成交 |
| isST | 1是、0否 | 保留逐日状态；不能只凭该字段推导所有历史涨跌停规则 |
| is_trading_day | 1交易日、0非交易日 | 使用提供方日历，记录版本 |

官方描述停牌OHLC为前收盘价，量额0，换手率空；本校验器也容许停牌价格缺失，但量额必须显式0，报告停牌不可交易警告。turn/pctChg未采集；如后续使用，两者官方单位为百分数，不能直接当比率。不同提供方复权算法可能不同，本次没有下载复权因子。

## 4. 代码、边界和复现

- backend/app/data/probe.py：有界串行采样CLI，最多5只sh.60xxxx/sz.00xxxx股票、366个自然日，区间必须早于上海当日；每次新建版本目录，不覆盖旧CSV。
- backend/app/data/quality.py：离线检查日期、日历、代码、复权、停牌/ST状态、价格有限性/OHLC与量额；错误明确报告，不修补或制造数据。
- backend/tests/test_data_probe.py与test_data_quality.py：使用构造的独立期望值及模拟SDK，不在pytest中联网。
- 可选data依赖及实际版本纳入pyproject.toml和requirements.lock。基础API运行不要求导入BaoStock。

在backend目录安装并采样，**一次只启动一个采样进程**：

~~~powershell
& './.venv/Scripts/python.exe' -m pip install -c requirements.lock -e '.[dev,data]'
& './.venv/Scripts/python.exe' -m app.data.probe --start 2025-01-01 --end 2025-06-30 --symbols sh.600000 sh.600036 sh.600519 sz.000001 sz.000333
~~~

默认参数就是上述样本。命令只访问来源并写根data，不新增HTTP业务接口。SDK有15秒socket超时，父进程150秒总上限；失败保留已经下载的文件并写失败清单，无自动重试或合成替代。退出码0表示采集及质量通过，2表示采集完成但质量不通过，1表示运行失败。retrieval_status、quality_passed、run_status分别解释下载、质量和整个进程；注销失败另行记录。提供方可能修订历史数据，重新采样不承诺相同SHA256，准确复现使用保留的本地版本。

离线复读已有样本，不会再次请求提供方：

~~~powershell
@'
import csv, hashlib, json
from pathlib import Path
from app.data.quality import validate_sample
p = Path('../data/source-validation/baostock/20261111T002747Z-1b9d1540')
m = json.loads((p / 'manifest.json').read_text(encoding='utf-8'))
tables = {}
for item in m['files']:
    f = p / item['name']
    raw = f.read_bytes()
    assert len(raw) == item['bytes']
    assert hashlib.sha256(raw).hexdigest() == item['sha256']
    with f.open(encoding='utf-8', newline='') as stream:
        reader = csv.DictReader(stream)
        assert reader.fieldnames == item['fields']
        tables[item['name']] = list(reader)
    assert len(tables[item['name']]) == item['rows']
bars = {s: tables['bars-' + s + '.csv'] for s in m['symbols']}
q = validate_sample(bars, tables['calendar.csv'], m['date_range']['start'], m['date_range']['end'])
assert q == json.loads((p / 'quality-report.json').read_text(encoding='utf-8'))
assert q['passed'] is True and q['execution_ready'] is False
print('6 CSV verified; 585 bars; 117 trading days; execution_ready=False')
'@ | & './.venv/Scripts/python.exe' -
~~~

本地验收（2026-11-11）：

~~~powershell
& './.venv/Scripts/python.exe' -m pytest -p no:cacheprovider
# 92 passed, 1 warning
& './.venv/Scripts/python.exe' -m ruff check app tests --no-cache
# All checks passed!
& './.venv/Scripts/python.exe' -m pip check
# No broken requirements found.
~~~

包含原基础27项、质量30项、采样35项。保留既有Starlette TestClient/httpx弃用警告，未为消警告替换依赖。约束安装成功（含可编辑包构建）；一次关闭构建隔离的尝试因本环境未装setuptools失败，恢复正常隔离构建后通过。未验全新克隆或其他平台。本轮没有前端修改，不重复前端构建。

Git核对：根data与backend/.venv被忽略，backend/app/data源码没有被data规则误排除。原始文件仅存在本机；没有公开发布数据或声称队友已能取得。

## 5. 剩余门槛

1. 公开站点使用：明确行情展示/再分发条件，或选择授权清楚的替代样本；目前publishable=false。
2. 交易可用性：补齐逐日涨跌停、权益事件和适用规则；当前execution_ready=false，不能据OHLC完整就允许成交。
3. 数据完整性：小样本不是历史股票池；没有验证退市、新股、停牌实样、ETF或全部年份。下载版本不是当时原样可得数据的修订历史。
4. 工程接入：S04部署路线优先验证，然后正式冻结S10并推进S11/S12版本读取、S13执行与存储、S14训练API。此次没有数据库、业务读取API、前端真实行情或正式回测。
