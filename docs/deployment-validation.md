# S04 部署路线验证

核对日期：2026-11-11。由Codex检查仓库、官方文档和Qoder CN桌面入口，并经用户授权交由Qoder核对实际Sites技能。**S04a能力核验与S04b本地静态导出已完成，公开Sites托管及独立FastAPI部署尚未验收。** Sites不执行云端源码构建，S04保持进行中。S04b源码、命令、产物及浏览器证据见[静态导出验收](static-export-verification.md)。下方保留S04a当时的源码事实与Qoder核验记录，当前配置以S04b为准。

## 官方资料

2026-11-11实际读取，以下中文页面均返回HTTP 200；正文可由同路径.md读取：

- [Qoder CN：站点](https://docs.qoder.cn/qoder/sites)
- [Qoder CLI CN：Sites站点构建与托管](https://docs.qoder.cn/cli/sites)
- [官方文档索引](https://docs.qoder.cn/llms.txt)

| 官方明确内容 | 本项目结论 |
| --- | --- |
| sites-building可从零或从现有项目构建、打包并准备发布 | 存在现有项目路线，但未列出Next16/Nextra/MDX/Proxy、Node24、pnpm或子目录构建保证 |
| 支持静态页面，以及数据库、Server Functions、对象存储的Agent App | 不能直接等同任意Python/ASGI进程或Next Node服务 |
| 个人Free仅静态网页，不支持数据库和存储；其他套餐有相关能力 | 当前账户套餐及可用额度待核对；SQLite、磁盘挂载和重启持久性未证实 |
| 个人版可设置任何人访问；Teams/Enterprise仅组织内分享 | 赛事需匿名公开访问，必须核对账号类型和最终访问权限 |
| 新站点默认仅自己可访问；预览、发布、公开访问是不同步骤 | 预览/链接存在不能作为公开交付证据 |
| Cloud Agents可执行数据任务并写入站点数据库/存储 | 任意外部FastAPI访问、CSP和CORS仍需实测 |
| 上线初期限时免费、账户合并额度可动态调整 | 不将宣传当作本账户免费额度或赛事期可用性保证，不自动购买服务 |

公开CLI支持operations、describe、list等只读入口。prepare_site、publish_site和写入/权限修改需由正式Sites工作流驱动；不自行拼接内部接口绕过确认。

## S04a核验时的仓库部署要求（S04b前）

| 检查项 | 源码事实与所需验证 |
| --- | --- |
| 前端目录 | 安装、构建工作目录为frontend，根目录无前端package.json |
| 运行时 | Node24.x、Next16.3.5、Nextra4.6.1；当前next.config.ts未配置静态导出，src/proxy.ts使用nextra/locales代理 |
| 静态导出候选路线 | S04b需验证Next静态导出并适配Proxy依赖；不能将.next文件夹直接视为静态站点包，SPA回退不能代替导出 |
| 安装 | 保留pnpm-lock.yaml、.npmrc、pnpm-workspace.yaml及信任/构建脚本规则；pnpm版本差异和干净安装尚未解决 |
| 构建 | 本地需完整执行Next、next-sitemap、Pagefind，并验证最终静态输出含搜索资源；public/_pagefind为生成物，不在Git中，Sites不代执行postbuild |
| 启动 | 本地start固定7000；Sites托管静态产物，不运行Next服务进程，无应用PORT或启动命令配置 |
| 域名 | SITE_URL用于metadata和sitemap，默认example.com；真实域名确认后构建时注入 |
| 路由与资源 | /到/zh、8内容页、MDX深层刷新、非法语言404；保留/_next/static、/img、/_pagefind、favicon、XML与robots |
| Python后端 | Python3.12/FastAPI/ASGI；目前仅health/capabilities/OpenAPI。本地脚本绑定127.0.0.1:9000，不能作为公网API地址 |
| API调用 | 前端尚无业务API地址配置；后端GET-only、无凭证CORS，仅允许本机8000来源。公网须精确origin、HTTPS并验证浏览器读取 |
| 持久化 | storage模块占位，无数据库。平台可写目录不等于重启/重新部署持久化，不能提前宣称SQLite可用 |
| 数据 | BaoStock本地样本publishable=false；不上传原始data或随页面请求采集，初次预览使用现有合成演示 |

源码依据：frontend/package.json、next.config.ts、next-sitemap.config.mjs、src/proxy.ts；backend/pyproject.toml、app/main.py、app/config.py；scripts/start-backend.ps1。独立代理完成只读复核，没有修改框架或重跑前端构建。

## 桌面入口实际观察

1. Qoder CN已有QuantFlow-AI工作区，未确认套餐额度。
2. “站点”页正常加载；“我的站点”显示“开始你的第一个站点”，未显示已建站点。
3. “创建站点”打开带站点标签的新任务输入框和模板列表，没有立即导入或发布项目。
4. 本轮没有提交模板、创建凭证、上传文件、改变站点公开权限或购买服务。
5. 首次导航的自动审批超时；重新观察并按工具允许重试后导航成功，不属于安全拒绝。

上述是Codex通过UI观察的事实，不写成Qoder生成代码或部署证据。原始界面含账户和其他工作区信息，未将整屏截图写入仓库。

## Qoder能力核验任务

具体任务已整理在[qoder-sites-validation-task.md](qoder-sites-validation-task.md)。2026-11-11用户明确授权发送，仅核对能力，不上传、不发布、不购买服务。09:03北京时间已发送至Qoder CN的QuantFlow-AI任务“遍历文件夹内容”，09:06观察到任务完成及本文件新增结果。中途误触Esc后经用户明确要求恢复；没有将中断时未发送的草案记为成功。结果保留在下方Qoder段落，Codex复核说明另列。

## 当前验收状态

| 项目 | 状态 |
| --- | --- |
| 官方资料和桌面入口 | 已核对 |
| 本地前端/API响应 | 2026-11-11实测localhost:8000/zh与127.0.0.1:9000/api/v1/health均200；health依赖仍not_configured |
| 当前账号套餐、实际额度 | 未核对 |
| 本地Next/MDX静态导出与平台托管 | S04b本地导出11/11、搜索与深层刷新通过；平台托管未验；云端源码安装/构建与Next服务进程不适用该托管模式 |
| 匿名HTTPS公开访问与实际搜索 | 未执行 |
| 站点到FastAPI的浏览器请求 | 未执行 |
| Python运行、持久存储、重启恢复 | Qoder随附技能明确不能运行任意Python/ASGI进程；独立后端及持久化仍未实测 |
| S04完成 | 未完成，不进入S11部署兼容完成状态 |

继续按最小预览方案核对平台实际能力，明确上传范围与费用后再处理发布。若平台不支持当前框架，先提出最小适配方案；不自动重写前端，不用外链壳或其他托管链接替代赛事要求。

## Qoder 能力核验任务执行结果（2026-11-11，Qoder 会话）

本段由Qoder会话实际执行任务[qoder-sites-validation-task.md](qoder-sites-validation-task.md)后追加，Codex随后修正文案中的构建证据归属与SPA表述；只核对能力，未prepare_site/publish_site、未上传、未发布、未购买、未创建凭证、未提交推送。

### 能力来源（实际读取）

- 官方用户文档：[Qoder CN 站点](https://docs.qoder.cn/qoder/sites)（同路径 .md 正文，2026-11-11 读取）。
- Sites 插件随附技能（本机安装，由Qoder实际读取）：`sites-building/SKILL.md` 及 `references/environment.md`、`static-site.md`、`functions.md`、`function-backend.md`、`sites-hosting/references/limits.md`。
- 只读工具实测：`list_sites` 返回 `{"scope":"owned","projects":[]}`，即查询时当前账号的owned站点列表为空；不据此推断历史上从未创建过站点。

### 逐项结论

| 核验项 | 结论 | 依据 |
| --- | --- | --- |
| 导入本地现有项目 | 支持「原项目工作流」：保留本地构建与输出目录，构建产物作为 webDirectory 上传 | environment.md「Project and source」；static-site.md「Project and build」 |
| 子目录构建（frontend/） | 支持：projectRoot 指向 frontend，webDirectory 用真实构建输出；输出目录须在会话目录内且与项目根不同 | static-site.md「Packaging requirements」 |
| Node 24 / pnpm / 锁文件 | 平台**不编译源码、不安装依赖、不解析锁文件**；Node24/pnpm只影响本地构建。本机Node24.16有既有构建记录，pnpm12.14为依赖安装记录，不能推断本轮以该版本重建 | environment.md「Runtime and output」；static-site.md:38–41 |
| Next 服务/SSR/Proxy | **不支持**：Sites 只托管静态产物，不运行 Node SSR、框架服务进程或 middleware；`src/proxy.ts`（nextra/locales 代理）在静态部署下不生效 | environment.md:39 原文「Do not assume a Node server, framework SSR process…」 |
| 完整 postbuild（sitemap+Pagefind） | Pagefind 产物 `public/_pagefind` 是静态文件，可随 webDirectory 上传；sitemap 需构建时注入真实 SITE_URL（默认 example.com） | static-site.md；本地 build 日志 |
| public 资源/favicon/_next/static/img/robots | 均为静态文件，可上传；平台保留命名空间 /api、/functions、/storage、/rest/v1、/supabase 等不得占用 | static-site.md「Browser paths」 |
| 环境变量 | 静态构建不注入运行时 env；应用 Secret 仅 Functions 通过 Deno.env.get 读取（名称前缀 QODER_/SUPABASE_/POSTGRES_/DATABASE_URL 保留） | functions.md「Secret configuration」 |
| 动态端口 | 平台无端口概念；本地 8000/7000 仅开发用。浏览器到服务端走同源 `/functions/v1/app` | environment.md「Runtime and output」 |
| Python 3.12 / FastAPI / ASGI | **不支持**：无法运行任意 ASGI/Python 进程 | environment.md「Runtime and output」 |
| 外部 HTTPS API 调用 | 静态页可 fetch 外部 HTTPS API，取决于对方 CORS/契约；Sites 不代持 | static-site.md:32 |
| 持久存储 | 数据库为 Supabase（function_backend），文件为平台 Storage；**无 SQLite/文件系统持久化**；个人 Free 仅静态、不支持数据库与存储 | function-backend.md；官方文档 Info |
| 休眠/重启/实例数/额度 | 官方未列明，标**未知**；打包限额已知：单文件 50MiB、Web 原始 450MiB、Function 50MiB、产物 50MiB（Worker 更严）、每目录扫描 1 万文件 | static-site.md:41；limits.md |

### 对 QuantFlow-AI 的最小改动（未执行，仅方案）

- **前端（候选改造路线，待实测）**：先验证`next.config.ts`增加`output: 'export'`能否完整导出；SPA回退不能代替Next静态导出。`src/proxy.ts`的nextra/locales代理需改为预生成`/zh/...`路由及根入口，深层刷新与正确404另行验证。Pagefind输出与sitemap域名一并适配；此改造是否成立**需实测**，未验证不标通过。
- **后端（两条路线，均未验证）**：a) FastAPI 部署到独立 HTTPS 主机，前端同源/跨域调用（需精确 origin、CORS、HTTPS、费用）；b) 重写为 Deno Edge Function + Supabase（个人 Free 不支持数据库/存储，需升级套餐）。二者都不能以「前端可预览」宣称可用。
- **上传输入清单（拟定）**：仅 frontend 构建产物（html/_next/static/img/_pagefind/sitemap/robots/favicon）。排除 data/、references/、.git、.env*、.venv、node_modules、日志；BaoStock 样本 publishable=false 不上传。

### 费用与额度

- 官方：站点功能上线初期限时免费、设有使用额度、额度动态调整，用量较高站点可能暂停公开访问；个人 Free 仅静态部署。当前账户实际套餐/额度**未核对，标未知**；定价见 https://qoder.cn/pricing。
- 公开访问：个人版支持「任何人都可访问」（需点击允许公开访问确认），企业版不支持组织外公开；赛事需公开，须确保账号为个人版并完成公开授权。

### 结论与边界

静态前端为候选路线，需先实测静态导出与去proxy依赖；后端FastAPI不在Sites运行模型内，需验证独立HTTPS主机或Edge Function方案及其套餐条件。本轮未创建站点、未上传、未发布、未购买；静态产物托管、匿名HTTPS访问和站点到API请求均未执行，S04保持进行中，不进入S11完成状态。

## Codex收口复核与本地验收（2026-11-11）

上段保留Qoder真实执行结果，需按以下边界理解：

- “前端能部署/静态路线可行”仅指平台接受静态产物；**本项目静态导出尚未验证**。开启SPA回退不能代替Next静态导出，也不能让SSR、Proxy或Python获得运行能力。
- Sites不执行云端源码安装/构建，后续应验收本地导出和平台静态产物托管。前端当前本地构建证据来自既有完整工具链记录，不能把pnpm12.14安装记录等同于本轮用该版本重新构建。
- Python/FastAPI不在Sites运行模型内；数据库/Storage是平台服务，不是挂载SQLite文件的承诺。外部HTTPS API“可调用”仍受浏览器CORS/CSP、服务可用性和赛事部署组合要求约束，尚未实测。
- 当前账户类型、套餐和实际额度仍未知；不据“Free不支持数据库”推断本账户必须购买升级。没有发布、上传或费用发生。

新增[scripts/check_deployment.py](../scripts/check_deployment.py)与[离线测试](../backend/tests/test_deployment_check.py)，只向显式指定的origin执行GET，无认证或Cookie，超时及响应体大小有界。检查根跳转、8页特征正文、非法路径最终404、favicon、Pagefind JS/索引/metadata/WASM、可选API健康/能力/OpenAPI与精确GET CORS来源。非法语言允许最多3次同源跳转，不跟随外站登录跳转。

仓库根目录执行：

~~~powershell
& './backend/.venv/Scripts/python.exe' scripts/check_deployment.py --frontend-origin http://localhost:8000 --api-origin http://127.0.0.1:9000
~~~

北京时间09:08本地20/20项通过，报告为[deployment-http-local.json](verification/deployment-http-local.json)，明确scope=http_smoke_only。该报告未包含响应正文或凭证；它不证明浏览器交互、真实搜索结果、Sites兼容、匿名公网、账户隔离或重启持久化。

backend目录执行：

~~~powershell
& './.venv/Scripts/python.exe' -m pytest -p no:cacheprovider
# 117 passed, 1 existing Starlette/httpx deprecation warning
& './.venv/Scripts/python.exe' -m ruff check app tests ../scripts/check_deployment.py --no-cache
# All checks passed!
& './.venv/Scripts/python.exe' -m pip check
# No broken requirements found.
~~~

其中新增25项离线冒烟工具测试，包括独立复核发现并修复的异常重定向解析问题：服务器返回非法Location时记录INVALID_REDIRECT，不崩溃或误报用户参数错误。未改业务框架或依赖、未重新全量构建前端、未提交推送。本轮拆为S04a能力核验与验收准备完成；S04公开部署继续未完成。

上述S04a结束时提出S04b。随后用户要求”下一步”，S04b已完成本地静态导出、索引与浏览器验证；详见[独立验收记录](static-export-verification.md)。当前下一项为S04c实际Sites托管验证：仅以frontend/out作为拟上传目录，取得实际域名后注入SITE_URL并完整重建，再验证目录索引、404、搜索与匿名HTTPS。上传/发布范围尚未获明确授权，本轮未执行。后端继续优先保留FastAPI，核验独立HTTPS与持久化。

## S04c Sites私有预览（2026-11-11，Qoder会话）

本段由Qoder会话实际执行，Codex未参与本轮上传/发布操作。用户明确授权：仅创建私有预览站点，不公开、不购买、不提交推送Git。

### 实际操作

1. 读取Sites技能（sites-hosting、references/deployment.md、workflow-examples.md）与prepare_site/get_context工具schema。
2. `get_context`返回当前会话目录`D:\项目\QuantFlow-AI`、无已绑定站点；`list_sites`返回owned空列表。
3. 首次`prepare_site`（actionId=11111111-2222-4333-8444-555555555555，projectRoot=frontend，webDirectory=out，slug=quantflow-ai，spa=false）→ 创建项目`01a1c85f-8ae1-72bc-aa29-812826c20cb0`与站点`01a1c85f-8ae4-7be3-bb00-79173924c05d`，descriptorStatus=written。
4. `get_site`返回实际域名**quantflow-ai-15w46njhdic.qoder.zone**，access_mode=private。
5. 以`SITE_URL=https://quantflow-ai-15w46njhdic.qoder.zone`重建静态产物：
   - `node ./node_modules/next/dist/bin/next build`：11/11通过，TypeScript通过；
   - `node scripts/postbuild.mjs`：sitemap 8条URL、Pagefind 8页/923词；
   - `out/sitemap-0.xml`与`out/robots.txt`已替换为真实域名。
6. 再次`prepare_site`（新actionId=aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee，同projectId）→ descriptorStatus=written。
7. `get_publish_status`：artifactReady=true，dependenciesReady=true，canPublish=true，blockers=[]。
8. `publish_site` → publishOperationId=01a1c863-0567-7631-b05b-0593f38380be；轮询后`published=true`，operation.state=succeeded/committed=true，readiness=publication_completed。
9. `show_publish_confirmation`返回Desktop预览卡片（filePreview=true）。
10. 浏览器导航`https://quantflow-ai-15w46njhdic.qoder.zone/zh/` → 跳转account.aliyun.com SSO登录页，截图显示”登录后即可访问”与站点域名，确认私有访问门控生效。

### 产物与范围

- 上传目录：仅`frontend/out`（108文件，约3.0MiB），含8内容页HTML、_next/static、_pagefind、sitemap/robots、favicon、LICENSE.txt、Next导航TXT载荷。
- 排除：backend、data、references、.git、.env*、.venv、node_modules、日志。
- 未开启公开访问（access_mode=private）；未购买/升级套餐；未提交推送Git。

### 浏览器验收状态

| 验收项 | 状态 | 说明 |
| --- | --- | --- |
| 根→中文首页 | 未进入 | 登录门控阻断，需用户在Qoder Desktop预览或已登录浏览器中访问 |
| 四模块+帮助打开 | 未进入 | 同上 |
| 深层页面（如/zh/docs/factors/）刷新 | 未进入 | 同上 |
| /en/training/及非法路径404 | 未进入 | 同上 |
| 帮助搜索”量价” | 未进入 | 同上 |
| 样式/图标/图表/Pagefind/Next导航载荷 | 未进入 | 同上 |
| 桌面+移动端宽度 | 未进入 | 同上 |

**阻断原因**：当前Chrome DevTools MCP会话未登录Qoder账号，导航到私有站点触发SSO登录页（account.aliyun.com）。登录门控本身证明私有访问生效；7项业务验收需在用户已登录Qoder的浏览器或Desktop Canvas预览中完成。

### 限制与下一项

- **公开访问**：赛事要求匿名可访问，需确认当前账户为个人版后调用`update_access_policy`开启”任何人都可访问”，或用户手动在Sites Settings中授权。本轮未执行。
- **7项浏览器验收**：待用户在已登录Qoder的浏览器中打开`https://quantflow-ai-15w46njhdic.qoder.zone/zh/`逐项核对；或Desktop Canvas预览打开后由Qoder会话继续验收。
- **独立后端**：FastAPI不在Sites运行模型内，仍拟保留并另行HTTPS托管；本轮未涉及。
- **套餐/额度**：官方标”上线初期限时免费、额度动态调整”，当前账户实际套餐与剩余额度未核对。
- **S04整体**：S04a能力核验、S04b本地静态导出、S04c私有预览均已完成；公开部署与匿名HTTPS仍待后续授权执行。

## S04c-2 路由修正与每日访问额度阻断（2026-11-11，Qoder会话）

### 实际观察到的Sites路由事实

登录后用ETag（内含本地产物MD5）反查服务端实际返回的文件，确认Sites固定关闭目录索引：

| 请求路径 | HTTP | 实际返回文件 | 判定 |
| --- | --- | --- | --- |
| `/` | 200 | `out/index.html` | 正确 |
| `/zh/index.html` | 200 | `out/zh/index.html` | 正确（文件式地址可用） |
| `/zh/workspace/index.html` | 200 | `out/zh/workspace/index.html` | 正确，页面完整渲染 |
| `/zh/`、`/zh/workspace/`、`/zh/docs/factors/` | 200 | **`out/index.html`** | 尾斜杠路径全部落到根入口 |
| `/nope/`、`/zh/nope/`、`/en/training/` | **200** | **`out/index.html`** | 未知路径未404，回退首页 |
| `/nope.html` | 404 | — | 文件式未知路径确实404 |

根入口的客户端跳转使任何尾斜杠路径刷新后都停在「QuantFlow AI / 进入中文首页」。这与本地`preview-static.mjs`（支持目录index与308尾斜杠）行为不同，不能据本地预览推断平台路由。产物本身完整，缺失的是路由解析而非文件。

### 采用的修正（路线A：扁平路由）

- `frontend/next.config.ts`：`trailingSlash`由`true`改为`false`；
- `frontend/next-sitemap.config.mjs`：`trailingSlash`同步改为`false`；
- 未改框架、页面、组件或设计，未新增语言或路由。

构建前需停止占用`out`的本地静态预览进程：首次`next build`在Finalizing阶段返回`EBUSY: resource busy or locked, rmdir 'frontend\out'`，确认该进程为本项目`scripts/preview-static.mjs`（PID 14180）后停止，重建通过。

### 重建与发布结果

- `node ./node_modules/next/dist/bin/next build`：11/11通过，构建内TypeScript通过；
- `node scripts/postbuild.mjs`：sitemap生成8条扁平URL（`/zh`、`/zh/docs`、`/zh/docs/factors`、`/zh/docs/rules`、`/zh/experiments`、`/zh/lab`、`/zh/training`、`/zh/workspace`），Pagefind 8页/923词；
- 产物结构：`out/zh.html`、`out/zh/workspace.html`、`out/zh/docs/factors.html`等扁平HTML，`out/404.html`为中文404，107文件约2.9MiB；根入口链接改为`href="/zh"`，站内链接无尾斜杠；
- `prepare_site`（新actionId=cccccccc-dddd-4eee-8fff-000000000001，同projectId）→校验Operation succeeded、descriptorStatus=written；
- `publish_site` → publishOperationId=01a1c8dd-d4ee-7211-9782-6a1917c1de85，`published=true`、committed=true、`access_mode`仍为private。

### 阻断：今日访问额度已用完

发布后浏览器访问`https://quantflow-ai-15w46njhdic.qoder.zone/`返回Qoder Sites平台页「暂时无法访问此站点 / 今日访问额度已用完。请在额度重置后再试」，页面显示站点域名与**预计恢复时间11月12日08:00（本地时间UTC+8）**，即该额度按日重置。

- 这是每日访问频次限制，不是站点或存储数量上限，也不是网站内容或本次发布失败；本轮已上传产物与`published=true`状态不受影响。
- 因此S04c的7项浏览器验收（根→中文首页、四模块与帮助、深层页面刷新、非法路径404、中文「量价」搜索、资源加载、桌面/移动宽度）**本轮未能执行**，不记为通过。
- 未通过改变域名、新建站点、开启公开访问或购买服务来绕过该限制；等待额度重置后复用同一站点继续验收。

### 当前结论

Sites静态托管路线本身可用：文件式地址能完整渲染中文页面，产物与搜索索引均正常上传。尾斜杠路由与平台不兼容已改为扁平路由，正确性需待额度恢复后用浏览器实测确认。S04仍为进行中，公开访问与匿名HTTPS未执行。
