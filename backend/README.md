# QuantFlow AI 后端

当前有可独立启动的FastAPI基础（S11a）与本地历史数据采样/质量校验（S03），不是交易服务。前端仍使用原演示数据。没有行情业务API、数据库、持久化、访客身份或个人行情Token需求；候选、训练、账户和回测仍待实现。

## 环境与安装

当前支持Python 3.12.x；本机使用CPython 3.12.14。使用backend/.venv隔离依赖，无需修改系统PATH或全局安装库。

常规Python安装后，在仓库根目录执行：

~~~powershell
py -3.12 -m venv backend/.venv
Set-Location backend
& './.venv/Scripts/python.exe' -m pip install -c requirements.lock -e '.[dev]'
& './.venv/Scripts/python.exe' -m pip check
~~~

本机py启动器未检测到系统Python，此次用Codex提供的CPython 3.12.14创建环境：

~~~powershell
& 'C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m venv backend/.venv
~~~

该绝对路径是本机替代命令，队友应使用自己的Python 3.12；Codex缓存移动/删除后需重建.venv。requirements.lock记录本轮实测依赖版本；初始安装需要能访问PyPI，其他系统和干净克隆需另验收。pyproject.toml给出兼容范围，团队安装同时使用约束文件，更新依赖时重新验收并更新快照。

## 启动

在仓库根目录执行（前端8000与后端9000分开）：

~~~powershell
./scripts/start-backend.ps1
~~~

开发时可加-Reload；端口冲突可加-Port 9001，同时调整调用地址。不需要管理员权限，不修改PowerShell执行策略。脚本不自动安装依赖。

也可以在backend目录直接运行：

~~~powershell
& './.venv/Scripts/python.exe' -m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 9000 --no-access-log
~~~

服务仅绑定本机；Ctrl+C停止。未选定公网部署方案，也没有对外发布。

| 地址 | 实际用途 |
| --- | --- |
| http://127.0.0.1:9000/api/v1/health | API进程存活，database/market_data明确not_configured |
| http://127.0.0.1:9000/api/v1/capabilities | 已实现与未实现能力列表，不伪装空业务结果 |
| http://127.0.0.1:9000/api/v1/docs | Swagger交互文档；界面资源由FastAPI默认CDN加载 |
| http://127.0.0.1:9000/api/v1/openapi.json | 当前路由的机器可读协议，不依赖Swagger CDN |

health的ok仅代表API进程可响应，不表示市场数据、数据库或交易就绪。未注册业务路径返回404。

## 配置与错误

默认可直接启动，无需复制.env。可用backend/.env或环境变量覆盖，示例在.env.example：

- QF_ENVIRONMENT：development/test/production，仅配置环境标记，不自动创建生产安全边界。
- QF_DOCS_ENABLED：控制docs与OpenAPI入口是否开放。
- QF_CORS_ORIGINS：JSON数组，只接受明确HTTP(S)origin，禁止通配符和路径；默认localhost:8000与127.0.0.1:8000。当前只允许GET，不发送凭证。

应用响应包含服务端生成的X-Request-ID；应用错误正文统一为error.code/message/details与request_id。验证错误只返回body/query等顶层来源，不回显输入、动态字段名或字典键，500不返回异常文本或堆栈。CORS预检由外层标准中间件处理：OPTIONS允许/拒绝响应为标准文本，无应用request_id，不采用业务错误JSON。默认关闭访问日志，应用仅记录错误关联ID；当前没有请求内容日志或完整诊断平台。

## 检查

在backend目录执行：

~~~powershell
& './.venv/Scripts/python.exe' -m pytest
& './.venv/Scripts/python.exe' -m ruff check app tests
& './.venv/Scripts/python.exe' -m pip check
~~~

当前126项测试覆盖基础API、配置、CORS、错误边界、离线数据质量/采样失败处理及部署HTTP检查工具（包含静态导出模式），不代表交易规则验证。详见[基础验收](../docs/backend-foundation-verification.md)、[数据来源验证](../docs/data-source-validation.md)、[部署核对](../docs/deployment-validation.md)和[静态导出验收](../docs/static-export-verification.md)。

## 本地数据采样

可选安装数据依赖，在backend目录执行：

~~~powershell
& './.venv/Scripts/python.exe' -m pip install -c requirements.lock -e '.[dev,data]'
& './.venv/Scripts/python.exe' -m app.data.probe
~~~

默认串行请求5只股票2025年上半年不复权日线和日历，写入根data/source-validation/baostock的新版本目录。最多5只沪深主板股票、366个自然日，只允许过去日期。BaoStock禁止并发连接，不能同时运行多个采样进程。原始价格与金额保留字符串，CSV附SHA256和质量报告；失败保留部分文件和失败原因，不自动重试。0/2/1退出码分别表示质量通过、质量失败、运行失败。

首批实测585条日线、117个交易日通过质量检查，文件均在Git忽略的根data内。公开展示/再分发权限未确认，未采涨跌停和权益事件，不能作为可成交或可公开发布的数据版本；不会自动进入前端或health数据状态。详细来源、字段、实际时间和离线复读命令见[数据验证记录](../docs/data-source-validation.md)。

## 模块与下一步

app/api存放已实现路由与Pydantic响应模型；config.py/main.py/errors.py提供配置、工厂及错误边界。app/data已有有界采样与离线质量检查，尚无业务读取API；quant、execution、backtest、training、storage保留职责，不导出假业务服务。migrations在有实际表结构后再接入。

[数据契约草案](../docs/data-contract.md)供S10a对齐字段；S03本地采样、S04a平台能力核验与S04b前端本地静态导出已完成并记录限制。Sites不运行FastAPI，优先保留现有后端并核验独立HTTPS托管。S04实际部署、S10正式冻结与S11部署兼容验收仍待完成，之后推进S12版本读取、统一执行引擎、事务存储与训练API；前端接入后才替换现有内存模拟。
