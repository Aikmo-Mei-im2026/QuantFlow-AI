# 在 Qoder Sites 使用 K 线训练与历史行情

## 训练操作

- **指定模式**选择数据源、股票代码、起始日期和初始资金，点击「开始训练」。休市日顺延到该数据源下一条可用日线。
- **盲盒模式**使用相同的数据源、起始日期和初始资金设置。点击「开始训练」后，从所选来源里随机抽取一只有行情覆盖该日期、且还能推进的股票。两种模式均可回放到抽中或指定股票的最后一根可用日线。盲盒结束时揭示股票。
- 切换日线或周线后，指标按当前周期计算。点击「下一根 K 线」推进一个已收录交易日，同步更新当日详情、成交量和指标。周线使用本周已经回放的日线，随日推进更新。
- 训练使用浏览器内的模拟账户。导入数据后同样以虚拟委托练习，成交规则仍为下一交易日尝试按开盘价撮合。权益事件、交易所规则与持久化仍在正式交易模块范围内。

## 采集并导入

在仓库根目录执行。下面使用项目的 Python 虚拟环境，从腾讯证券采集不复权日线并将成交量统一保存为股。

~~~powershell
./backend/.venv/Scripts/python.exe -m pip install akshare==1.20.63
./backend/.venv/Scripts/python.exe -X utf8 ./scripts/collect-training.py --stock "000001=平安银行" --start 2024-01-01 --end 2025-12-31
~~~

默认输出 data/training/training.json，训练页「导入行情 JSON」可直接打开，导入发生在访客浏览器。可重复加 --stock 采集最多五只当前受模拟撮合支持的沪深主板股票（60xxxx、00xxxx），或加 --provider eastmoney 改用东方财富。可用日期取决于上游和标的。为了让周线 BOLL 有足够历史，可以给选定起始日预留至少 20 周的数据。 [AKShare 项目与数据说明](https://github.com/akfamily/akshare)

## 更新既有 Qoder Sites

1. 在 frontend 目录设置实际站点域名并执行完整静态构建。打开[本地训练页](http://127.0.0.1:7000/zh/training.html)验证页面和数据源。

   ~~~powershell
   $env:SITE_URL = 'https://quantflow-ai-v2-gyqxmmmb6gw.qoder.zone'
   pnpm build
   pnpm start
   ~~~

   如果本机的默认 Turbopack 构建停在编译阶段，可依次运行 `node ./node_modules/next/dist/bin/next build --webpack` 和 `node scripts/postbuild.mjs`，再启动预览。

2. 在 Qoder 的现有 QuantFlow AI 站点任务中，使用 frontend 为项目目录、out 为静态发布目录，沿用既有站点配置（spa=true）。检查预览后发布一个新版本，访问发布域名下的 /zh/training。 [Qoder Sites 既有项目与发布说明](https://docs.qoder.com/zh/cli/sites)
3. 若需要所有访客看到同一批历史数据，确认数据的公开展示与分发条件后，将授权 JSON 放到 frontend/public/market-data/training.json，设置 NEXT_PUBLIC_TRAINING_SNAPSHOT=1 再重新构建。此文件会进入 out，能通过站点直接访问。默认构建使用合成样例和本地导入入口。

## 需要自动更新时

| 方案 | 何时采用 | 需要接入的部分 |
| --- | --- | --- |
| 定期采集后更新静态快照 | 教学或演示使用固定股票池，按日或按周更新即可 | 在可联网环境运行采集脚本，校验授权快照，重新构建并更新既有站点 |
| Qoder Sites Server Function | 账号启用服务器函数，希望用户输入代码即可查询 | 检验函数对授权行情 HTTPS API 的出站可用性、额度和延迟；由函数请求、缓存并返回相同日线格式 |
| 独立 Python 服务，Qoder Sites 托管界面 | 必须长期运行 Python 采集、缓存或查询多只股票 | 通过 HTTPS API 给站点读取，配置允许站点来源的 CORS。用于赛事前确认第三方部署是否符合交付要求 |

本地采集已验证腾讯证券的 000001 在 2024-01-01 至 2025-12-31 区间返回 485 根日线。东方财富这次触发上游限流。现有 Qoder Sites 发布记录曾遇到月度子路径配额限制，本轮以本地构建与验证为交付。 [Qoder CN 站点计划与能力](https://docs.qoder.cn/qoder/sites)
