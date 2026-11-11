# 本地后端基础验收

- 日期：2026-11-11；开发、独立审查与验证：Codex。
- 用户授权：开始构建后端。本轮拆出S10a内部契约草案与S11a本地基础；原S10正式冻结/S11部署兼容仍待S03/S04，不把未满足前置条件的任务整体标成完成。

## 文件与范围

- backend/pyproject.toml、requirements.lock、.env.example：Python3.12项目、实测版本约束、无密钥配置。
- backend/app/main.py、config.py、errors.py：应用工厂、CORS配置与统一错误边界。
- backend/app/api：health/capabilities路由与Pydantic响应模型。
- backend/app/data、quant、execution、backtest、training、storage：只有职责占位，不是已实现引擎。
- backend/tests/test_api.py、test_config.py：27项基础行为/安全边界测试。
- scripts/start-backend.ps1、backend/README.md：本机启动脚本和可复用安装指引。
- docs/data-contract.md：金额、时间、模式、来源/版本、无效原因、幂等/状态版本与隔离的内部草案。
- 根README、AGENTS、项目计划书v2.2、分步计划同步当前边界；.gitignore补充egg-info/build产物排除。

## 环境与依赖

系统python/uv命令不可用，py --list-paths未检测到系统Python。使用Codex运行依赖提供的CPython3.12.14在backend/.venv创建隔离环境，不改系统PATH、不全局安装库。本机解释器路径见backend/README.md，普通权限创建环境返回WinError5，授权提升后成功。

安装实测FastAPI0.162.4、Pydantic2.14.3、Uvicorn0.54.0、pytest9.2.0、Ruff0.17.4，完整传递依赖版本在requirements.lock。固定版本约束的dry-run解析成功；并未从干净克隆重新安装，也未验证Linux或其他Python版本。pip freeze遭遇中文Git路径解析问题，改用pip list --format=freeze --exclude-editable取得真实版本快照，未包含本机路径或凭证。

## 命令与结果

在backend执行：

~~~powershell
& './.venv/Scripts/python.exe' -m pip install -e '.[dev]'
& './.venv/Scripts/python.exe' -m pytest -p no:cacheprovider
& './.venv/Scripts/python.exe' -m ruff check app tests --no-cache
& './.venv/Scripts/python.exe' -m pip check
& './.venv/Scripts/python.exe' -m pip install --dry-run -c requirements.lock -e '.[dev]'
~~~

- 27/27测试通过；Ruff通过；pip check无依赖冲突；约束安装dry-run成功。
- pytest有1条上游Starlette TestClient/httpx弃用提示；未隐藏警告，当前功能测试通过。后续按上游稳定方案升级测试客户端，不影响此轮运行接口。
- 测试验证health真实表达未配置依赖、capabilities未实现列表、仅两个业务路由、配置隔离、文档开关、404/405、每请求ID、422不回显值/额外键/动态字典键、500脱敏及允许来源CORS。
- 独立复核发现422 loc可能泄漏动态键，已改为仅返回顶层来源并添加回归测试；CORS标准预检文本与无应用ID例外已写明。

在仓库根目录用./scripts/start-backend.ps1实际启动并重启成功，默认127.0.0.1:9000。实际HTTP验证：

| 请求 | 结果 |
| --- | --- |
| GET /api/v1/health | 200，stage=foundation，database/market_data=not_configured，含X-Request-ID |
| GET /api/v1/capabilities | 200，仅health/capabilities可用，数据模式为空、persistent_accounts=false |
| GET /api/v1/openapi.json | 200，paths只包含health/capabilities的GET |
| GET /api/v1/docs | 200，Swagger HTML引用当前OpenAPI；CDN界面未做浏览器验收 |
| GET /api/v1/training/sessions | 404、NOT_FOUND、标准JSON，未伪装业务成功 |

健康状态只表示进程存活，不代表业务就绪；CORS不是身份认证。Swagger默认依赖外部CDN，OpenAPI JSON本机可直接读取。服务仅本机监听。

## 限制与下一步

没有真实行情、数据库、训练状态持久化、访客凭证、执行引擎、候选/回测计算或前端接入；没有公开部署。S03先验证数据来源/许可/日历，S04验证部署，再冻结S10并接入S12数据。原前端保持演示行为，本轮未改前端源码，未重复前端构建。未提交、推送；本地工作不作为Qoder过程证据。
