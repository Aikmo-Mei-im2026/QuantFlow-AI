# G1 前端演示修复与训练设计验收

- 完成日期：2026-11-11；执行工具：Codex。
- 范围：用户授权处理项目检查问题，并指定 KLinePlayground 为训练设计参考；按配置、数据/评分、交易函数、界面集成分为独立子任务。
- 本地完成 S05–S09；真实数据、正式后端、干净克隆及 Sites 不在本轮验收范围。

## 修改文件与结果

| 范围 | 主要文件 | 结果 |
| --- | --- | --- |
| 日期与样例 | frontend/src/lib/mock-data.ts | UTC 工作日序列；42 根、6 组独立合成 OHLC；无初始持仓、订单或未来成交；样例佣金和实验日期修正 |
| 训练执行 | frontend/src/lib/demo-execution.ts | 十万元空仓，整数分和 BigInt 中间计算；下一日开盘加减 5bp；佣金、T+1、预约资金/股数、拒单及期末保护 |
| 训练界面 | TrainingView.tsx、TrainingChart.tsx、demo-chart.ts | 账户/主图/控制三栏；20 根观察窗口；成交量、MA5/10/20、十字线、日期/价格刻度、B/S 标记、缩放与历史窗口；回放速度、暂停和重置 |
| 研究展示 | WorkspaceView.tsx、LabView.tsx、ExperimentsView.tsx | 评分从固定标准分统一计算；禁用未接入参数；固定记录明确标注，不再把抽样净值当日频回撤 |
| 路由/环境 | layout.tsx、get-dictionary.ts、图标、package.json、tsconfig.json、README | favicon 成功；未知语言安全404；Node 24.x；README格式修复；Node原生TS测试入口 |
| 文案/帮助 | i18n/zh.ts、i18n/en.ts、content/zh/docs | 明确人工/合成数据、佣金范围和目标后端规则；不宣称真实行情、持久化或服务端隔离 |

文件均位于 frontend 内；保留既有未提交文件。没有安装新依赖、修改锁文件或关闭信任策略。

## 验收命令

在 frontend 运行：

```powershell
node --test tests/demo-execution.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
node ./node_modules/next/dist/bin/next build
node ./node_modules/next-sitemap/bin/next-sitemap.mjs --config next-sitemap.config.mjs
node ./node_modules/pagefind/lib/runner/bin.cjs --site .next/server/app --output-path public/_pagefind
node ./node_modules/next/dist/bin/next start -p 7000
```

- Node v24.16.0，pnpm命令入口11.25.0；使用已有依赖，安装记录仍是12.14.0，未声称干净安装通过。
- 独立期望测试 **19/19通过**：11项执行、6项数据/评分、2项均线。
- TypeScript通过；只读ESLint **0错误、5个既有警告**（未使用的模板组件及类型），不隐藏规则。
- Next生产构建10/10；sitemap成功；Pagefind索引8页、中文1种语言。
- 构建前通过进程命令行确认并停止当前项目8000开发服务。普通权限写.next/trace及格式化个别文件遭EPERM，使用获准权限重试成功。
- Nextra提示未提交MDX无法取得Git修改时间；SITE_URL仍为example.com，本地生成物不代表公开部署。
- 首轮生产复测发现/api/no-such-route仍500；补齐MDX页面与metadata语言守卫后，重新完整构建与后处理，最终复测404。

## 交互与手算

生产预览7000：8个内容入口、favicon.ico、SVG、Pagefind资源均200；/zh/missing、/en、/xx、/api/no-such-route均404。

浏览器从2026-08-28、十万元空仓开始：

1. 600036买入100股，于08-31按38.58成交，佣金5元；现金96,137元；当日收盘38.79，市值3,879元、净资产100,016元；可卖量0。
2. 提交下一日卖单，09-01按38.74卖出100股、佣金5元；现金与净资产100,006元、空仓。手算 `100000 - 3858 - 5 + 3874 - 5 = 100006`。
3. 图表显示两日买卖标记；缩放第一次即20→10根；切证券时图表和参考价同步。
4. 自动播放推进日期，暂停停止；重置清空账户并回到观察窗口；刷新及重新进入同样重置。旧版集成阶段已实测末日两个操作按钮禁用，新引擎期末另有独立样例。
5. 研究工作台显示茅台71.5025，日期/风格禁用；实验室费用136.96、22.25、30.77，回撤/换手“未提供”，成交全部位于显示区间内。
6. 390px窄屏下DOM body/document宽375，viewport390，无横向溢出；已恢复默认视口。不是所有设备的完整体验验收。

独立复核助手另从dayIndex=19连续执行22笔交替买卖，每步现金等于全部成交净额，最终现金9,980,800分；未发现交易核心阻断。指出的现金标签及初次缩放问题已修正。团队成员交接复核仍待后续。

截图由本次Codex浏览器验收生成：

- [新版全貌](verification/training-redesign-overview.jpg)
- [新版买卖闭环](verification/training-redesign-desktop.jpg)
- [改版前逻辑验收](verification/training-roundtrip.jpg)（8月3日起点，仅记录早期修复过程，不作为新版截图）

## 剩余限制与下一项

仅合成主板教学环境，佣金之外的正式税费、真实行情/交易所日历、公司行动、后端持久化和服务端截断未实现。状态只存浏览器内存；实验记录页是固定样例。均线是展示指标，正式因子和评分接口仍待后端。

设计取舍及来源见[kline-design-reference.md](kline-design-reference.md)。没有引入参考项目的Flask/PyWebView、AI或登录系统；不是Qoder开发证据。未提交或推送，未验收干净克隆。下一项仍为S03真实来源小样本与S04 Sites路线，后续按S10契约建立后端。

## 2026-11-14 路线A展示增强：训练场账户净值曲线（Qoder会话）

- 依据：用户指令「根据这个文件按路线A运行，BC暂不做考虑，优先完善网页展示功能」，路线A来自[sites-capability-assessment.md](sites-capability-assessment.md)（纯静态 L0/L1，不依赖 Function、数据库或外部 API）。
- 范围：只新增展示层与配套纯函数；未改交易引擎规则、费用模型、样例数据，未触碰后端、部署与访问策略。

### 修改文件与结果

| 文件 | 结果 |
| --- | --- |
| frontend/src/lib/demo-execution.ts | 抽出 DEMO_INITIAL_CASH_CENTS 常量；新增 replayDemoEquity()，按已成交记录逐日重建净值，拒单跳过，缺失收盘价输出 null 点加原因，序列不越过 state.dayIndex |
| frontend/src/components/quantflow/charts.tsx | 新增 AccountEquityChart（手写SVG，未引入图表库）：期初基准虚线、null处断线、缺口日琥珀竖线、区间退化保护、role=img与aria-label；EquityChart、CandleChart 未改动 |
| frontend/src/components/quantflow/TrainingView.tsx | K线卡片与委托标签卡片之间新增可折叠「账户净值」面板；摘要行显示最新净值与较期初变动；曲线只取本次练习起始日之后的样例日 |
| frontend/src/i18n/zh.ts、en.ts | 新增 training.equity 的 title/latest/change/empty/gap/note，中英同结构，无孤儿键 |
| frontend/tests/demo-execution.test.ts | 新增6项：手算四点净值、末日与 valueDemoAccount 同源一致、缺失收盘产出 null 与含代码的原因、拒单不影响净值、日期无效返回错误且空点集 |

未安装新依赖、未修改锁文件、未关闭信任策略；保留既有未提交文件。

### 验收命令与实际结果

在 frontend 运行：

```powershell
node --test tests/demo-execution.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
node ./node_modules/eslint/bin/eslint.js src tests
node ./node_modules/next/dist/bin/next build
node ./node_modules/next-sitemap/bin/next-sitemap.mjs --config next-sitemap.config.mjs
node ./node_modules/pagefind/lib/runner/bin.cjs --site .next/server/app --output-path public/_pagefind
node --test tests/preview-static.test.mjs
```

- 演示测试 **25/25 通过**（本轮前为19项）。
- TypeScript 通过；ESLint 在 src 与 tests 上 **0错误、7个既有警告**（未使用的模板类型等，未隐藏规则）。全仓仍有6个错误，全部位于本轮未触碰的 dev/spa-fallback-test.mjs，按既有约定保留待用户决定。
- Next 静态导出 11/11 页成功；sitemap 生成成功；Pagefind 索引 8 页、2604 词、中文1种语言。
- 本地静态预览回归测试 tests/preview-static.test.mjs **8/8 通过**。
- Nextra 仍提示未提交 MDX 取不到 Git 修改时间；SITE_URL 仍为 example.com，本地生成物不代表公开部署。

### 浏览器观测

在本地静态预览 `http://127.0.0.1:7000/zh/training.html`（该 preview 对无扩展名 clean URL 返回 404，只服务 .html 文件形式，属本地脚本行为）：

1. 从 2026-09-01 起 600036 买入 100 股并提交委托，推进两个样例日到 2026-09-03。账户读数：现金 ¥96,161.00、持仓市值 ¥3,789.00、净资产 ¥99,950.00、累计盈亏 ¥-50.00。
2. 净值面板绘出 5 个点，摘要为「最新净值 ¥99,950.00 · 较期初 -¥50.00」，与上方净资产同源一致；面板在展开/收起与推进日后均随状态更新。
3. 375px 宽容器下 body/document 无横向溢出（overflow 0）。

### 剩余限制

- 本次内嵌浏览器没有可见输出面，未生成截图，也没有像素级核对；结论来自 DOM 读数、手算与单元测试三方一致。
- 曲线是客户端由已成交记录重建的展示结果，不是服务端权威账本；刷新即重置，无持久化，也不是真实收益。
- 未部署、未发布、未提交或推送 Git；线上站点仍是 2026-11-13 发布的版本，不含本节改动。
- 仍是仅合成主板教学样例；税费、停牌、涨跌停与公司行动未建模。

## 2026-11-14 路线A展示增强：实验记录页类型/状态筛选（Qoder会话）

- 依据：同一指令「按路线A运行，BC暂不做考虑，优先完善网页展示功能」的第二个展示增量，仍为纯静态 L0/L1。
- 范围：只在实验记录页新增本地筛选视图；未改 mockExperiments 数据、未加依赖、未触碰后端与部署。

### 修改文件与结果

| 文件 | 结果 |
| --- | --- |
| frontend/src/components/quantflow/ExperimentsView.tsx | 新增类型与状态两组筛选chip（每项带命中计数）、命中计数行、清除筛选入口与无匹配空状态；ChipGroup 为文件内局部泛型组件，筛选值只存 React state，不写URL与存储 |
| frontend/src/i18n/zh.ts、en.ts | 新增 experiments.filter 的 all/reset/showing/empty，中英同结构；同时启用既有但无人引用的 table.type、table.status 作为筛选项标签，避免重复文案 |

### 验收命令与实际结果

命令与上一节相同（另加 `node ./node_modules/eslint/bin/eslint.js --fix src/components/quantflow/ExperimentsView.tsx`）：

- 演示测试 **25/25**、`preview-static.test.mjs` **8/8**、TypeScript 通过。
- ESLint 首次 `src tests` 报 **12个错误**，全部位于本次新增代码（内联 type 导入风格与排序、多行类型成员分隔符、JSX 属性花括号空格）。仅对该单文件执行 `--fix` 后回到 **0错误、7个既有警告**；dev/spa-fallback-test.mjs 的6个错误本轮仍未触碰、保留待用户决定。
- Next 静态导出 11/11；postbuild sitemap 1 索引/1 站点图；Pagefind 8 页、**2625 词**（上一节为2604，新增文案导致上升，非索引退化）。
- `--fix` 后 ExperimentsView.tsx 出现1处 LF 混行，已统一为与仓库工作区一致的 CRLF；其余文件行尾未变。
- 说明：`node --test tests/` 以目录形式运行会尝试把目录当测试文件而报1项失败，本项目的运行入口是 package.json 的 test:demo 三文件列举方式，未改脚本。

### 浏览器观测

本地静态预览 `http://127.0.0.1:7000/zh/experiments.html`：

1. 初始读数：类型项 全部5 / 选股2 / 回测2 / 训练1，状态项 全部5 / 运行中0 / 成功3 / 失败1 / 已中断1，列表5条，计数行「共 5 条样例记录，当前显示 5 条」，横向溢出0。
2. 点「回测」：列表2条（EXP-0011、EXP-0010），计数行改为「当前显示 2 条」，出现「清除筛选」。
3. 再叠加「运行中」（该状态本就0条）：列表0条并显示「没有符合当前筛选的样例记录。」，两个chip同时为按下态。
4. 点「清除筛选」：回到5条，两组筛选均回到「全部」，清除入口消失。
5. 375px 同源 iframe：`scrollWidth` 360 等于 `clientWidth` 360，无横向溢出，10 个筛选项全部渲染。
6. 训练页回归：重建产物后初始仍为「最新净值 ¥100,000.00 · 较期初 +¥0.00」，与净资产 ¥100,000.00 一致。
7. 控制台仅有本地 preview 对 `/zh`、`/zh/docs`、`/zh/lab`、`/zh/training` 链接预取返回404（该脚本只服务 .html 文件形式），无 JS 异常。

### 剩余限制

- 内嵌浏览器无可视面，未截图、未做像素级核对；以上均为 DOM 读数。
- 筛选只是固定5条人工样例上的客户端视图过滤，不会新增或改变记录；S18「用户实验记录持久化」仍需 L3/L4，本轮未涉及。
- 停止预览服务时按命令行关键字匹配进程，事后核对 7000/8000/7100 均无监听、系统内无残留 node 进程；该匹配方式同时命中了查询命令自身的包装进程，后续应改为按端口取 PID。
- 未安装依赖、未修改锁文件、未部署、未发布、未提交或推送 Git；线上站点仍是 2026-11-13 版本，不含 11-14 前三节改动。

## 2026-11-14 本机练习档案「登录」界面（Qoder会话）

- 依据：用户要求「在网页基础上做一个登录界面」，在说明 Qoder Sites 纯静态托管无法做真实鉴权后选定「本地练习档案（纯前端）」：昵称 + 起始资金写入本机 localStorage，页面明示这不是身份认证。仍属路线A（L0 构建期静态 + L1 浏览器端计算），路线B/C 未启动。
- 底线：所选起始资金必须真正驱动训练引擎，而不是装饰；因此档案值进入 `DemoAccount.initialCashCents`，现金、净资产基准、累计盈亏与净值曲线基准全部由它派生。

### 修改文件与结果

| 文件 | 结果 |
| --- | --- |
| frontend/src/lib/demo-profile.ts | 新建：档案读写纯函数、昵称空白折叠与24字符上限、起始资金四档白名单（¥1万/10万/50万/100万）、读写失败返回可显示的错误、跨标签订阅与同标签广播 |
| frontend/src/hooks/useDemoProfile.ts、index.ts | 新建 `useSyncExternalStore` 读取：原始串未变则复用已解析对象，服务端快照返回 undefined 使静态HTML不含昵称；barrel 补导出 |
| frontend/src/components/quantflow/LoginView.tsx、src/content/zh/login.mdx、src/content/zh/_meta.tsx | 新建登录页视图与MDX入口，导航项「登录（本机）」；当前档案卡 + 建立/修改表单 + 警示框 + 退出并清除 |
| frontend/src/widgets/profile-chip.tsx、navbar-extras.tsx | 新建顶栏档案chip（昵称或「登录」）并挂到导航栏 |
| frontend/src/lib/demo-execution.ts | `DemoAccount` 增加 `initialCashCents` 与默认常量；`advanceDemoDay` 改为展开保留该字段；`replayDemoEquity` 以档案资金为曲线基准 |
| frontend/src/components/quantflow/TrainingView.tsx | 新增 rebaseline 动作（仅挂载时按档案重建账户，他标签改档案不会丢弃进行中会话）、账户卡「练习者」「期初资金」两行、盈亏与曲线基准改用 `account.initialCashCents` |
| frontend/src/app/page.tsx | 壳路由 ROUTES 增加 `/zh/login`（8→9 条） |
| frontend/src/i18n/zh.ts、en.ts | 新增 `quantflow.login` 24 个键与 `quantflow.training.initialCash`，中英同结构 |
| frontend/tests/demo-profile.test.ts、demo-execution.test.ts | 新增 7 项档案测试与 1 项「档案资金贯穿引擎」测试；初始账户深比较含 `initialCashCents` |
| frontend/package.json | `test:demo` 入口补上 demo-profile.test.ts（此前只列三文件） |
| scripts/check_deployment.py、backend/tests/test_deployment_check.py | 部署检查页表加 `/zh/login`，标记为「进入练习」+「正在读取本机档案」（静态HTML里只有加载行）；离线用例计数与 pagefind 页数夹具同步 |

### 验收命令与实际结果

- `node ./node_modules/eslint/bin/eslint.js src tests`：**0 错误、7 个既有警告**。中途因 `useState`+`useEffect` 读取档案出现过 6 个 `react/set-state-in-effect` 警告与 4 个 `style/jsx-one-expression-per-line` 错误，改用 `useSyncExternalStore` 并把 `¥` 与金额拆行后清零，未关闭任何规则。
- `node ./node_modules/typescript/bin/tsc --noEmit --incremental false`：通过。
- `node --test tests/demo-execution.test.ts tests/demo-profile.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs`：**33/33 通过**。
- `next build` + `node scripts/postbuild.mjs`：静态页 11→**12**，`out/zh/login.html` 已导出；Pagefind **9 页 / 2641 词 / 1 语言**（上一节 8 页 2625 词）；sitemap 仍 1 索引。
- `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_deployment_check.py -q`：**34 通过**。本轮新建该 venv 仅装 httpx 0.28.1 与 pytest 9.2.0（`.venv/` 已被 .gitignore 忽略），未改 `requirements.lock`、未装 FastAPI 依赖。
- `scripts/check_deployment.py --frontend-origin http://127.0.0.1:7000 --static-export`：`passed=false`，**9 个页面检查全部 404**（含既有 8 页），favicon/pagefind/404 检查通过——本机 preview 只服务 `.html` 文件路径、不映射 clean URL，属既有行为而非本页缺陷。
- 用检查器自身的 `VisibleText` 解析器复核 `out/zh/login.html`：两个标记均在可见文本中（脚本内的重复文案不会被计入）。
- 行尾：`git ls-files --eol` 显示仓库索引为 LF、工作区因 `core.autocrlf=true` 为 CRLF；本轮 5 个新文件写成 LF，提交时与既有文件同样归一为 LF，无需转换。

### 浏览器观测

内嵌浏览器对本机静态预览（`127.0.0.1:7000`，页面用 `.html` 形式访问）。注意：该面的 `click` 工具未把事件送达元素（radio 与按钮点了无效），交互改用页面内 DOM 事件与 React 原生 setter 驱动，读数用可访问性快照与 `innerText`；同一页面状态与存储读写均正常，故属工具限制而非应用失效。

1. 冷启动登录页：标题「进入练习」+「演示数据」徽标 + 非认证警示 +「建立档案」表单，四档起始资金默认选中 ¥100,000。
2. 昵称输入「  小张   选手 」（首尾与中间多余空格）并选 ¥500,000 后保存：localStorage 写入 `{"nickname":"小张 选手","initialCashCents":50000000,…}`，客户端路由到达 `/zh/training`；顶栏chip变「小张 选手」，账户卡显示练习者、期初资金 ¥500,000.00、现金与净资产 ¥500,000.00、累计盈亏 ¥0.00，曲线摘要「最新净值 ¥500,000.00 · 较期初 +¥0.00」。
3. 硬刷新 `/zh/training.html`（全新文档）：期初资金仍 ¥500,000.00，控制台无任何消息（未见 hydration 告警）。
4. 重进登录页：出现「当前本机档案」（练习者/起始资金 ¥500,000/保存时间）与「修改档案」标题；点「退出并清除」后存储为 null、卡片消失、显示已清除提示、chip 回落「登录」。
5. 校验：空昵称→「请先填写昵称。」；27 字符（程序绕过 `maxLength`）→「昵称请控制在 24 个字符以内。」；合法「李四」+ ¥1,000,000 → 保存后同一标签页 chip 立即变「李四」，训练场期初资金 ¥1,000,000.00。
6. 档案资金进入真实撮合：买入 600036 100 股并推进 1 个样例日 → 现金 ¥996,137.00、持仓市值 ¥3,879.00、净资产 ¥1,000,016.00、累计盈亏 ¥+16.00、成本价 38.63（含 5 元佣金）、可卖 0（T+1）；曲线摘要「最新净值 ¥1,000,016.00 · 较期初 +¥16.00」。手算核对 1,000,000 −(3,858+5)=996,137，+3,879=1,000,016，三方一致。
7. 375px 同源 iframe：`clientWidth` 360 与 `body.scrollWidth` 360 相等（无横向溢出），档案卡与四档资金全部渲染；主文档 524px 视口下 `main` 内所有元素 min-content 最大仅 217px。
8. 收尾：清除测试档案（存储 null）；预览服务用 TaskStop 停止并以 `netstat` 确认 7000 端口无 LISTENING（仅余 TIME_WAIT），不再按命令行关键字匹配进程。

### 剩余限制

- 内嵌浏览器无可视面，`take_screenshot` 返回 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`，未截图、无像素级核对。
- 这不是身份认证：无密码、不校验昵称、无会话隔离，任何人仍可直接打开任意页面并修改本机档案；档案换设备/换浏览器/清站点数据即丢失，服务端没有副本。真账号体系需 L3 Function 或 L4 Supabase（F1/F2 尚未实测），路线B/C 按指令暂停。
- 只持久化「档案」（昵称 + 起始资金）；委托、成交与净值曲线仍只在内存，刷新即丢，S18 用户记录持久化未涉及。
- 昵称与档案内容依赖客户端渲染：静态 HTML 中的登录页只有加载行，因此部署检查标记取该行；搜索引擎（Pagefind）虽收录第 9 页，但其正文极少，搜索命中价值有限。
- 壳路由 SPA 回退（ROUTES 已含 `/zh/login`）只有在真实站点上才能验证；本轮未部署、未发布、未开启公开访问、未购买、未提交或推送 Git，线上站点仍是 2026-11-13 版本。
- 仍是仅合成主板教学样例；税费细分、停牌、涨跌停与公司行动未建模。

## 2026-11-14 K线训练营「02 K线图交互与展示」增量（Qoder会话）

- 依据：用户给出规格图「02 K线图交互与展示」三条要求——① 支持滚轮缩放及点击左右拉动查看历史数据；② 下方显示成交量及 MACD、KDJ、RSL 和 BOLL 指标；③ 界面上方支持日线与K线视图的切换显示。规格中的「RSL」按相对强弱指标 **RSI(14)** 实现（该名称在指标体系里无对应常见写法，判定为笔误）；若实为另一指标需另行指明。规格把 BOLL 与 MACD/KDJ/RSI 并列，但 BOLL 是与价格同量纲的主图叠加指标，放进副图会失去意义，故落点为：**成交量＋MACD/KDJ/RSI 在下方副图区，BOLL 以独立开关叠加在主图**（三选一互斥的副图 + BOLL 可任意开关）。
- 归属：仍是路线A的 L0/L1——指标全部在浏览器端由已回放的合成样例即时计算，不引入图表库、不新增依赖、不改锁文件、不接后端。

### 修改文件与结果

| 文件 | 结果 |
| --- | --- |
| frontend/src/lib/demo-indicators.ts | 新建（191行）：`emaSeries`/`macdSeries`/`kdjSeries`/`rsiSeries`/`bollSeries` 纯函数；预热不足的位置保持 `null` 而不填 0 |
| frontend/tests/demo-indicators.test.ts | 新建 11 项测试，期望值用手算独立推导（EMA 递推、MACD 常数序列为 0、KDJ 的 200/3 与 500/9 与 800/9、BOLL 的 ±2√(2/3)、RSI 首值在第 14 根），并含 42 根合成样例的预热长度与值域断言 |
| frontend/src/components/quantflow/TrainingChart.tsx | 289→588 行：视图切换（K线/日线折线+面积）、滚轮缩放、按住左右拖动平移历史、BOLL(20,2) 主图叠加、成交量下方副图区（MACD 线+柱 / KDJ 三线 / RSI 单线，含参考线与固定值域）、副图读数写入副图标题、抽出共用 `linePath`、交互提示文案、日期轴与十字线随副图扩展 |
| frontend/src/i18n/zh.ts、en.ts | `quantflow.training.chart` 新增 14 键（viewGroup/viewCandle/viewLine/bollToggle/bollBand/indicatorLabel/indicatorNone/indicatorMacd/indicatorKdj/indicatorRsi/indicatorToggle/indicatorOff/macdHist/interactionHint，中英同结构同步），改写 `label`，删除不再使用的 `daily` |
| frontend/package.json | `test:demo` 入口补上 demo-indicators.test.ts |

### 指标口径（写死在实现与测试里，避免误读）

- EMA：以首个有限值播种，`k = 2/(period+1)` 递推；非法输入使该点及其后为 `null`。
- MACD(12,26,9)：DIF = EMA12 − EMA26，DEA = DIF 的 9 周期 EMA，**柱 = DIF − DEA**（国际惯例；不是国内行情软件常用的 `2×(DIF−DEA)`）。副图参考线 0，读数 2 位小数。
- KDJ(9,3,3)：9 根 RSV（窗口内高低相等时取 50），K/D 以 50 起步按 1/3 平滑，J = 3K − 2D；参考线 20/80。
- RSI(14)：Wilder 平滑，第一个值出现在第 14 根；单边上涨 100、单边下跌 0、横盘 50；副图值域固定 0–100，参考线 30/70。
- BOLL(20,2)：中轨 20 周期简单均值，上下轨 ±2 倍**总体**标准差，不做截断；主图叠加为 3 条线（中轨实线、上下轨虚线），读数一行给出「上/中/下轨」。
- 所有指标只看传入的（已按回放日截断的）序列，不看之后的 K 线；窗口不足显示「窗口不足」。

### 验收命令与实际结果

- `node --test tests/demo-execution.test.ts tests/demo-profile.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs tests/demo-indicators.test.ts`：**44/44 通过**（上一轮 33/33 + 本轮 11 项指标用例）。
- `npx tsc --noEmit --incremental false`：通过。中途 `next build` 内置类型检查抓到 ESLint `--fix` 把 `Array.from({length}, () => x)` 改成 `Array.from({length}).fill(x)` 后产生的 `unknown[]` 不兼容，已改为 `Array.from<number>` / `Array.from<number | null>` 显式泛型。
- `node ./node_modules/eslint/bin/eslint.js src tests`：**0 错误 / 7 个既有警告**（中途 2 个 `e18e/prefer-array-fill` 与 1 个 `style/brace-style` 已消除，未关闭任何规则）。
- 构建前停掉 7000 静态预览（`netstat` 确认无 8000 开发服务）；`SITE_URL=https://quantflow-ai-v2-gyqxmmmb6gw.qoder.zone next build` 通过，静态页仍 **12**；`node scripts/postbuild.mjs` → Pagefind **9 页 / 2671 词**（上一轮 2641）、sitemap 9 条生产 URL。
- `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_deployment_check.py -q`：**34 通过**（页表与页数夹具未受本轮影响，未改动 `scripts/check_deployment.py`）。

### 浏览器观测

内嵌浏览器指向本机静态预览 `127.0.0.1:7000`，页面以 `/zh/training.html` 访问；其 `click`/滚动手势不可用，交互一律用页面内 DOM 事件驱动（`WheelEvent`、`PointerEvent`、`KeyboardEvent`、`.click()`），读数用 DOM 查询。

1. 控件齐备：视图组「K线(按下)/日线」＋ MA5/10/20 ＋「BOLL (20,2)」＋「＋ / 20 根 / − / 最新」＋ 副图组「无 / MACD(按下) / KDJ / RSI」；图表 SVG `viewBox` 由 `0 0 1000 480` 变为 `0 0 1000 616`（副图占位），切「无」后回到 480。
2. 滚轮缩放：在 SVG 上派发 `deltaY=+120` → 根数 20→20（已到合成样例上限，被 `candles.length` 夹住），再两次 `deltaY=-120` → 16→12，日期刻度随右端锚定收敛为 `08-13 / 08-20 / 08-28`；最后一次事件 `defaultPrevented=true`，说明非被动监听生效、页面不会被图内滚动带走。
3. 拖动看历史：`pointerdown` 后 SVG class 变 `cursor-grabbing`；右移 3 根宽度 → 刻度由 `08-07…08-28` 变为 `08-04…08-25`、历史滑块 4→1、「最新」按钮由禁用变可用；继续右移 99 根宽度被夹到 `maxOffset=4`（滑块 0、刻度 `08-03…08-24`）；`pointerup` 后 `cursor-grabbing` 解除。
4. 视图切换：切「日线」后 16 根 K 线实体消失（rect 49→17：只剩成交量柱与十字价格标签），出现收盘价折线与 1 条带填充的面积路径；切「K线」恢复。
5. 副图指标：MACD 标题读数「MACD(12,26,9) DIF 0.55 DEA 0.43 柱 0.12」＋零轴与柱状；KDJ「K 76.7 D 80.4 J 69.3」＋20/80 参考线，且满足 J=3K−2D；RSI「RSI(14) RSI 64.2」＋30/70 参考线、固定 0–100 值域；切「无」后副图整段消失。
6. BOLL 叠加：按钮按下后主图多出 3 条布林线（其中 2 条虚线），读数行显示「BOLL 上/中/下轨 39.21 / 37.39 / 35.58」，右端价格轴区间随之扩展。
7. 键盘可达性未退化：SVG 仍可获得焦点（`document.activeElement` 为 SVG），方向键逐根回读 `08-28 → 08-27 → 08-26`，十字线 2 条主色虚线存在。
8. 回归与响应式：训练页 `账户净值曲线` 卡仍在（前一增量未被打断）；同源 iframe 在 375×667 下 `scrollWidth-clientWidth = 0`（无横向溢出），登录页/实验记录页/首页同样为 0，`naturalWidth===0` 的破图 0 张；1280×800 下图表宽 585px。
9. 控制台仅剩 3 条 404：`/zh`、`/zh/login`、`/zh/docs`——本机 preview 只服务 `.html` 文件、不映射 clean URL，属既有行为（Next 对导航链接的预取因此 404），线上由平台 SPA 回退承载。

### 剩余限制

- 指标值来自 42 根**合成**样例的浏览器端计算，不是真实历史行情的指标数据，也不构成投资建议；合成日历不是交易所交易日。
- 训练会话从第 20 根开始可见，`count` 上限受 `candles.length` 约束，因此 KDJ/RSI/BOLL 的前若干根必然显示「窗口不足」，这是预期行为而非渲染缺陷。
- 未做像素级目视核对：内嵌浏览器无可视面，`take_screenshot` 仍返回 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`（visibilityState=hidden）；上述结论全部来自 DOM/SVG 结构、class、属性与文本读数。
- 滚轮与拖动是合成 DOM 事件，不是真实输入手势：真实触控板/触屏（`touch-pan-y` + 指针捕获）未实测；合成指针没有活动指针，`setPointerCapture` 会抛错，已捕获并回退为「仅在图内平移」。
- 375px 下图表 SVG 等比缩到约 263×162，`viewBox` 内 10–12 号轴文字有效字号约 3px，移动端基本读不清。这是既有 viewBox 缩放方式的问题，本轮未改；要移动端可读需改成响应式坐标轴或横向滚动容器，属新决策，待用户定。
- MACD 柱按 `DIF−DEA` 口径，与国内行情软件常见的 `2×(DIF−DEA)` 数值差一倍；如要以国内软件为准需用户确认后再改。
- 刷新仍丢委托/成交/曲线（S18 持久化未涉及）；本轮未部署、未发布、未开启公开访问、未购买、未提交或推送 Git。线上站点仍是 2026-11-13 版本，且本月子路径配额未解除（见 [部署验证](deployment-validation.md) S04c-6）。

## 2026-11-14 K线训练营「指定模式 / 盲盒模式」双模式（Qoder会话）

- 依据：用户要求「在这个基础上，将k线训练营分为两种模式：指定模式和盲盒模式。指定模式为指定某个股票，盲盒模式为在所有股票中筛选日期和初始资金」。
- 判定与取舍（按字面最小解释，避免动到已通过验收的指定模式行为）：
  - **起始日期与起始资金只属于盲盒模式**。指定模式仍是「自选证券 + 固定第 20 根样例日开始 + 期初资金取本机练习档案」，与 11-14 档案增量、K 线交互增量的结论继续成立。
  - **盲盒池 = 可撮合的 5 只主板样例**（`^(60|00)\d{4}$` 过滤后的 `supportedSymbols`）。300750 宁德时代不在撮合白名单，抽到它会立刻「无法下单」，故排除在池外。
  - **起始日期只给「预热够 + 至少还能推进一根」的日子**：索引 19–40 共 22 项（`trainingStartIndices`），默认 19；最后一根样例日不可作为起始日，否则开局即结束。
  - **起始资金仍取档案的四档白名单**（¥1万/10万/50万/100万），不放开任意金额，避免绕过既有校验；该档默认跟随本机档案，学员改动只影响盲盒设定，不写回档案。
  - **切换模式或「换一个盲盒」都重开一轮账户**（不静默保留上一轮委托），这是可预期的代价，已在文案里写明。
  - **遮蔽范围**：盲盒卡状态行、图上方标的行、下单区标的（由下拉改为只读展示）、持仓/委托/成交三张表的代码与名称列。揭示方式两条：「结束并揭示」（同时锁定下一日/播放/下单）与到达最后样例日自动揭示。
- 归属：仍是路线A的 L0/L1，随机与遮蔽都在浏览器端完成；未新增依赖、未改锁文件、未接后端、未加持久化。

### 修改文件与结果

| 文件 | 结果 |
| --- | --- |
| frontend/src/lib/demo-training.ts | 新建（41行）：`TrainingMode`、`MIN_TRAINING_HISTORY_BARS=20`、`TRAINING_MASK`、`trainingStartIndices`（可选起始日索引）、`drawTrainingIndex`（纯抽取，rng 由调用方注入）、`maskTrainingText` |
| frontend/tests/demo-training.test.ts | 新建 8 项测试：起始日 19–40/22 项、样本不足时为空、可加宽预热、rng 边界 0/0.999999/1 均落在池内、空池返回 null、200 次 `Math.random` 覆盖全部 5 只、遮蔽与揭示两种读数 |
| frontend/package.json | `test:demo` 入口补上 demo-training.test.ts |
| frontend/src/components/quantflow/TrainingView.tsx | 470→620 行：`Session` 增 `mode/code/startDayIndex/revealed`；`rebaseline` 动作换成通用 `start`（模式、起始日、资金、抽签结果一次给齐）并新增 `reveal`；`INITIAL_DAY` 常量改由 `trainingStartIndices` 推导的 `DEFAULT_START_DAY`（值仍为 19）；净值切片与训练进度改用 `session.startDayIndex`；标的统一走 `activeCode`＋`maskTrainingText`；播放/下一日/快捷键/提交统一由 `stopped = ended \|\| locked` 控制；盲盒设定卡与只读标的展示 |
| frontend/src/i18n/zh.ts、en.ts | 新增 `quantflow.training.mode`（5 键）与 `quantflow.training.blind`（9 键），中英同结构；`nextOpen` 的硬编码「20 根」改为 `{{bars}}` 插值——晚起始日的盲盒若仍写 20 就是假话 |

### 验收命令与实际结果

- `node --test tests/demo-execution.test.ts tests/demo-profile.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs tests/demo-indicators.test.ts tests/demo-training.test.ts`：**52/52 通过**（上一轮 44/44 + 本轮 8 项）。
- `pnpm typecheck`：通过。中途 `tsc` 抓到 reducer 末尾的 advance/submit 分支仍返回旧的四字段对象（TS2739 缺 `mode/code/startDayIndex/revealed`），已改为展开 `session`。
- `npx eslint src tests`：**0 错误 / 7 个既有警告**（与上一轮同）；全仓 `npx eslint .` 另有 6 个错误，全部位于他人会话遗留的 `frontend/dev/spa-fallback-test.mjs`，本轮未触碰。本轮新增/修改文件自身为 0 错 0 警（中途 14 个 `style/indent` 类错误由 `--fix` 消除，另有 1 个 `react/set-state-in-effect` 警告已通过「盲盒资金跟随档案默认、仅在学员改动时才落 state」消除，未关闭任何规则）。
- 构建前先停 7000 静态预览（`netstat` 取 PID 后 `taskkill`），`SITE_URL=https://quantflow-ai-v2-gyqxmmmb6gw.qoder.zone pnpm build` 退出码 0、静态页仍 **12**；`postbuild` → Pagefind **9 页 / 2685 词 / 1 语言**（上一轮 2671 词）。
- 产物核对：`out/zh/training.html` 含「指定模式」「盲盒模式」各 1 次，**不含**「盲盒设定」——盲盒卡只在客户端切到盲盒模式后渲染，静态 HTML 保持指定模式首屏；`example.com` 在产物 HTML 中检索为空。
- `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_deployment_check.py -q`：**34 通过**（未新增路由，页表与页数夹具无需改动）。

### 浏览器观测

内嵌浏览器指向本机静态预览 `127.0.0.1:7000/zh/training.html`；交互用页面内 DOM 事件（`select.value` + `change`、`.click()`），读数用 DOM 查询。第 3–6 项在初版构建上观测；随后为「揭示后禁用结束并揭示、说明行随轮次结束切换、盲盒下不再显示指定模式的结束语」改了 3 处，第 2、7、8–10 项在**最终构建**上重跑（指定模式的最终构建证据取第 9 项；第 2 项的重跑读数：22 个日期项 2026-08-28…2026-09-28、四档资金、掩码 6、标的控件为只读 `P`、卡内说明为抽取提示）。

1. 指定模式冷启动无回归：模式组 `aria-pressed` 为「指定模式=true / 盲盒模式=false」，下单标的仍是 `SELECT`＝600036，标的行「600036 · 招商银行 · 2026-08-28」，无盲盒卡、掩码计数 0、图表 60 个 rect、期初 ¥100,000.00。
2. 点「盲盒模式」立即抽一只并开一轮：出现「盲盒设定」卡；标的行变「•••••• · •••••• · 2026-08-28」；下单标的由 `SELECT` 变为只读 `P`「•••••• · ••••••」；日期下拉 **22 项**、默认 2026-08-28；资金下拉恰为四档 ¥10,000 / ¥100,000 / ¥500,000 / ¥1,000,000；图表仍渲染（60 rect），说明遮蔽只作用于文本层、行情照常可看。
3. 起始设定真正驱动引擎：选 2026-09-14 ＋ ¥500,000 → 换一个盲盒 → 回放日 2026-09-14、账户四项全部 ¥500,000.00、训练进度 0%、图表 rect 60→93（预热 30 根 + 当日）。
4. 隐藏态可正常交易且表内不泄漏：买 100 股并推进 1 日 → 成交表「2026-09-15 \| •••••• \| 买入 \| 38.54 \| 100 \| 5.00 \| 已成交」，持仓表「•••••• · •••••• \| 100 \| 38.59 \| 0」（可卖 0，T+1 正确），全页掩码计数 6。
5. 「结束并揭示」：掩码 6→**0**，盲盒卡、标的行、只读标的、成交表四处同时显示 600036 · 招商银行；「下一样例日 / 自动播放 / 提交委托 / 结束并揭示」4 个按钮变为禁用，「换一个盲盒」仍可用；说明行切换为「本轮已结束并揭示标的，换一个盲盒可开始新一轮。」
6. 再点「换一个盲盒」：重新遮蔽（掩码 6）、回到 2026-09-14 与 ¥500,000、进度 0%、记录清空。
7. 自动揭示：起始日改 2026-09-28（索引 40）→ 抽取后推进 1 日到最后样例日 2026-09-29 → 未点任何按钮也已揭示、掩码 0、进度 100%。重构建后复测同一流程抽到 002594 · 比亚迪（前一次为 600519 · 贵州茅台，可见抽签随机），「下一样例日 / 自动播放 / 提交委托 / 结束并揭示」四键均禁用、仅「换一个盲盒」可用，盲盒卡说明行切换为「本轮已结束并揭示标的，换一个盲盒可开始新一轮。」，且指定模式那句「重新进入页面可开始新练习」在盲盒下不再出现（该说法在盲盒里不成立）。
8. 档案与双模式互通：写入 `{"nickname":"盲盒学员","initialCashCents":1000000}` 并刷新 → 指定模式期初 ¥10,000.00、练习者显示「盲盒学员」，且盲盒资金下拉默认同为 ¥10,000.00；晚起始日的观察窗口文案随插值变为「已展示 **31** 根历史样例」。
9. 指定模式回归（含本轮改动后的重构建）：从盲盒切回指定 → 卡片消失、`SELECT` 恢复 600036、起始日回 2026-08-28、账户与记录清空；下 100 股并推进 1 日 → 现金 ¥6,137.00 ＋ 市值 ¥3,879.00 ＝ 净资产 ¥10,016.00、累计盈亏 ¥16.00，与档案 ¥10,000.00 三方对账一致。
10. 控制台全程 **0 条消息**（含两次 `location.reload()` 与全部状态切换），未见 hydration/act 告警。

### 剩余限制

- 「随机」用 `Math.random()`，是教学抽签而非密码学公平抽样；不承诺不可预测或防作弊。
- 遮蔽只保证 **DOM 文本**不泄漏：真实代码仍在 React `key`、组件内存与 devtools 里，学员开控制台可提前看到标的。纯前端演示无法根除，真要防作弊需服务端发题（L3/L4，F1/F2 未实测）。
- 盲盒池只有 5 只合成样例，重复率高，抽签的教学价值有限；扩充要等真实/更多样例数据（S03 分发与 S12 版本读取仍未验收）。
- 盲盒轮次仍无计分、无正确率、无历史轮次统计（S11 评分未涉及）；委托/成交/揭示状态只在内存，刷新即丢。
- 本轮未做移动端宽度与像素级目视核对：`take_screenshot` 仍返回 `NATIVE_BROWSER_VIEWPORT_UNAVAILABLE`，结论全部来自 DOM 读数；375px 下盲盒两张下拉会堆叠，实际可读性未测。
- 未部署、未发布、未开启公开访问、未购买、未提交或推送 Git。线上站点仍是 2026-11-13 版本，本月子路径配额仍未解除（见 [部署验证](deployment-validation.md) S04c-6）。

## 2026-11-15 训练场数据源重构后的独立复验（Qoder会话）

- 依据：用户先要求「本地运行最新版本的网站」「重新运行」，本会话在重启本机静态预览时发现 `frontend/out` 与训练场源码已在 11-15 17:22–21:31 被另一会话（实施计划第7节记为 Codex）改写，11-14 双模式那一节的验收数字不再描述当前源码；用户随后回答「要」，即在当前源码上重跑完整验证链。**本轮只做验证与记录，未修改任何业务代码、未改依赖与锁文件、未提交推送、未发布。**
- 被验证的改动范围（全部取他人实现，本会话不主张归属）：
  - `TrainingView.tsx` 的会话模型由「模式+代码+起始日」四字段换成 `Round`（`dataset`/`instrument`/`startDayIndex`/`endDayIndex`/`initialCashCents`/`mode`）＋按标的切片的 `market`；`reset` 改为一比一重建本轮；新增 `showRound = mode === setupMode`，模式切换时整块训练区进入 `hidden` 容器（会话仍在内存中，不销毁）。
  - 新建 `TrainingSetup.tsx`（187 行）：数据源/代码/起始日期/初始资金四格表单 ＋ 「导入行情 JSON」；`demo-training.ts` 由 41 行扩到 120 行，新增 `TrainingDataset`/`TrainingInstrument`/`MAX_TRAINING_FILE_BYTES=5MB`/`isTrainingCode`/`isTrainingDate`/`parseTrainingDataset`/`assignedTrainingStart`/`drawTrainingInstrument`。
  - 三池数据源：`demo`＝合成样例（6 只，`syntheticReplayDates('2025-06-30', 320)`，标注「本地生成，非真实行情」）、`site`＝`/market-data/training.json` 且仅当构建期 `NEXT_PUBLIC_TRAINING_SNAPSHOT=1`（默认关，本会话未开启）、`local`＝访客浏览器导入。
  - 新建 `scripts/collect-training.py`（AKShare 不复权日线采集，1–5 只主板标的，原子写入）与 `docs/qoder-training.md`；`data/training/training.json`（被 `.gitignore` 忽略）已由腾讯证券实采 000001 平安银行 485 根日线。
  - `TrainingChart.tsx` 增日线/周线周期切换与「收盘线」视图名（本会话核对到的是 K线/收盘线 ＋ 日线/周线两组控件，与 11-14 记录的「K线/日线」命名已不同）。
- **两条 11-14 判定已被推翻，保留原文不回改，在此登记**：起始资金不再是档案四档白名单，而是任意「元」金额输入（仅校验 `^\d{1,9}(\.\d{1,2})?$` 且 >0，档案值只作默认）；可选起始日不再是「索引 19–40 的 22 项下拉」，而是原生 `date` 控件 ＋ 休市顺延到该数据源下一条可用日线。`trainingStartIndices`/`TRAINING_MASK`/`maskTrainingText`/`drawTrainingIndex` 仍在使用，但起始日与资金的选择 maths 已由 `assignedTrainingStart`/`drawTrainingInstrument` 取代。

### 验收命令与实际结果（本会话实跑）

| 命令 | 实际结果 |
| --- | --- |
| `node --test`（demo-execution/profile/research/chart/indicators/training ＋ preview-static） | **63/63 通过**（他人记录为 55 项演示测试，本会话多加 `tests/preview-static.test.mjs` 8 项，合计 63，两者一致） |
| `npx tsc --noEmit` | 通过，退出码 0 |
| `npx eslint src tests scripts`（只读，未用 `--fix`） | **0 错误 / 7 个既有警告**，警告全部落在本轮未触碰的 `app/page.tsx`(2)、`ui/flip-words.tsx`(1)、`ui/link-preview.tsx`(2)、`hooks/useServerLocale.ts`(1)、`i18n/index.ts`(1)；训练场三个文件 0 错 0 警 |
| 停 7000 预览 → `SITE_URL=https://quantflow-ai-v2-gyqxmmmb6gw.qoder.zone pnpm build` | 退出码 0；**12 个静态 HTML**、sitemap 9 条真实域名 URL；Pagefind **9 页 / 2674 词 / 1 语言**（11-14 为 2685 词，差异来自本轮文案）；`out` 共 114 文件 / 3.2 MiB；产物内 `example.com` 检索为空 |
| 产物核对 | `out/zh/training.html` 96,263 字节，首屏即含设定表单（「数据源」「合成样例」「开始训练」「导入行情 JSON」「指定模式」「盲盒模式」均可在静态 HTML 检索到），这是本轮相对 11-14「盲盒卡仅客户端渲染」的结构变化；`out/market-data` **不存在**，证实站点快照池默认关闭 |
| `backend/.venv/Scripts/python.exe -m pytest backend/tests/test_deployment_check.py -q` | **34 通过**（路由未新增，页表夹具无需改动） |
| `python scripts/collect-training.py --help` | 正常输出用法，退出码 0。本会话**未再联网采集**（避免重复上游请求），只对既有 `data/training/training.json` 做校验 |
| `parseTrainingDataset(data/training/training.json)`（node 直接调用被测模块） | 通过：`schema quantflow-training-v1`、`source AKShare / 腾讯证券`、`collectedAt 2026-11-15T17:46:52+08:00`、`priceBasis unadjusted`、`volumeUnit shares`、1 只标的 485 根 2024-01-02…2025-12-31、首收盘 9.21 |

环境事实（非本会话造成，供后续判断）：`backend/.venv` 已装入 akshare 1.20.63、pandas 3.1.1、lxml 等采集依赖；因此 `pytest backend/tests` 全量收集在当前环境下**失败**（`test_api.py`/`test_config.py` 报 `No module named 'pydantic'`，从仓库根跑另有 4 个文件报 `No module named 'app'`），只有记录中那条 `test_deployment_check.py` 定向命令可用。未动 `requirements.lock`、未重建 venv。

### 浏览器观测（本机 `127.0.0.1:7000/zh/training.html`）

内嵌浏览器无可视面，交互一律用页面内 DOM 事件（`.click()`、原生 value setter ＋ `input`/`change`、`dispatchEvent`），读数取 DOM；每项单独一次调用以避免 React 未重渲染的陈旧读数。

1. 冷启动首屏：模式组 `aria-pressed` 为「指定模式=true / 盲盒模式=false」；数据源下拉只有「合成样例」1 项；代码 `600036`，候选池 6 只（600519/000858/002594/600036/601318/000001）；起始日期默认 2025-11-14（该合成序列第 100 根）；资金默认 ¥100,000（取本机档案，chip 显示练习者「k」）；数据状态行「合成样例 · 样例日期 2025-11-14 · 版本 synthetic-ohlc-v3 · 本地生成，非真实行情」。
2. 指定模式真实成交对账：100 股 600036 下单前读数「当日收盘参考价 ¥38.35 / 预估费用 ¥5.00 / 预计占用 ¥3,842.00」，即 38.35×1.0005＝38.37 → 3,837＋5；推进 1 根到 2025-11-17 后现金 ¥96,168.00（成交价用**次日开盘** 38.25×1.0005＝38.27 → 3,827＋5＝3,832），持仓市值 ¥3,810.00（100×当日收 38.10）、净资产 ¥99,978.00、累计盈亏 −¥22.00、成本价 38.32（含佣）、可卖 0（T+1）。预计占用与实际占用差 10 元源于参考价与次日开盘价不同，与引擎注释一致。
3. 切到盲盒模式：代码输入消失改为只读「随机抽取」，提示「选择数据源、起始日期和初始资金，系统随机抽一只股票，训练结束时揭示。」；第 2 项那一轮的整块训练区被搬进 `class="hidden"` 容器（DOM 未销毁、会话未丢），`stopped` 生效。
4. 盲盒遮蔽：标的行「•••••• · ••••••」，首屏 2025-11-14 收盘 ¥61.47，期初 ¥100,000.00，进度 0；隐藏态下买 100 股并推进 1 日，持仓表行「•••••• · •••••• 100 61.77 0」——表内仍不泄漏，可卖 0 正确。
5. 「结束并揭示」：标的行与表内同时显示「中国平安 · 601318」，掩码归 0，「下一根 K 线 / 自动播放 / 提交委托」变禁用，说明行「本轮已结束并揭示标的，点击「开始训练」可重新抽取。」（抽签结果与 11-14 那轮的 600036/002594 不同，随机性可观测）
6. 本地导入真实行情：通过 `upload_file` 选 `data/training/training.json` → 数据源下拉出现并选中「AKShare / 腾讯证券 · 本地文件」，起始日期自动改为 2024-06-04（该文件第 100 根），候选池只剩 000001。
7. 真实数据盲盒轮：徽章由「演示数据」改为「**历史行情回放**」，状态行「历史回放 · AKShare / 腾讯证券 · 采集于 2026-11-15 · 不复权」，遮蔽态首根 2024-06-04 ¥11.02，揭示为「平安银行 · 000001」。
8. 校验负路径三条全部给出原因而非静默：指定模式填本地池没有的 600519 → 「此数据源未收录该股票代码。」且进行中会话不被替换；起始日 2023-01-04（早于该文件首根）→ 「请选择数据源有行情覆盖且至少能推进一根 K 线的起始日期。」；导入 `{"schema":"not-quantflow"}` → 「无法导入。请选择采集脚本生成、大小不超过 5 MB 的日线 JSON。」且数据源仍停在 demo、已导入的池不变。
9. 休市顺延：起始日选 2024-01-06（周六）→ 实际开在 2024-01-08 ¥9.15（该数据源下一条可用日线），未以 0 伪装有效值。
10. 周线切换：日线→周线后图表 `svg rect` 由 180 降到 6（起始处只有 2 个完整周桶，聚合确实生效），MA/BOLL 读数显示「窗口不足」；MACD 在仅 2 根周线时仍打印 DIF −0.01/DEA −0.00/柱 −0.01，来自 `emaSeries` 首值播种的既有口径（`demo-indicators.ts:36`），不是本轮新增缺陷，但**周线级 MACD 在样本 <26 根时数值不具参考性**。
11. 键盘与额度：`document.body` 上派发 `Space` 使 2024-01-08 → 01-09（推进 1 根）；对 ¥1563.96 的 600519 买 100 股（预计占用 ¥156,520.94 > ¥100,000）报「可用资金不足（已计入待买委托估算）」且不生成委托行。注意：把同一事件派发到 `window` 上不会推进——快捷键处理函数的 `target?.closest(...)` 假定 target 是 Element，这是探测脚本的人为构造，真实键盘事件不会命中该形状。
12. 移动端与控制台：375px 同源 iframe `scrollWidth`360＝`clientWidth`360 无横向溢出，四格设定表单在窄屏塌为 1 列（262.667px）；控制台仅 6 条 404，全部是指向 clean URL（`/zh`、`/zh/login`、`/zh/docs`）的 Next 预取，本机 file-only 预览不映射 clean URL，属既有已知行为；无 hydration/act 告警、无应用运行时错误。

### 剩余限制

- **站点快照池（`site`）未验收**：本轮未设 `NEXT_PUBLIC_TRAINING_SNAPSHOT=1`，`frontend/public/market-data/` 不存在，`out` 内也无该文件，因此「所有访客看到同一批历史数据」这条路径零证据。其前置是**行情数据的公开展示与分发条件未确认**（`qoder-training.md` 第 3 条同样写明），本会话未替用户做该决定。
- 真实数据只有 1 只标的：本地文件池里的「盲盒抽签」等于必然（无随机性可言），教学价值需扩到多只（采集脚本已支持 1–5 只）；且东方财富在上一次采集时触发上游限流，稳定性未证。
- 采集到的是**不复权**日线，跨年价格含分红除权缺口，页面已声明「不复权」；仍不能把回放盈亏当真实收益。
- 模式切换只是把上一轮收进 `hidden`，不是显式的「归档/继续」交互，用户可能误以为会话丢失；本轮只观测到行为，未评价该设计，属待用户决定项。
- 遮蔽仍只覆盖 DOM 文本（React `key`、内存与 devtools 可见真实代码）；`Math.random` 非密码学抽样；轮次、委托、成交与曲线刷新即丢，无持久化、无评分（S11/S18 未涉及）。
- 未做像素级目视核对（`take_screenshot` 无可视面），移动端图表 `viewBox` 缩放导致轴文字过小的问题（11-14 已登记）本轮未复查，因 `training` 页首屏结构已变。
- 未部署、未发布、未开启公开访问、未购买、未提交或推送 Git；线上站点仍是 2026-11-13 版本，本月子路径配额本会话未复查（发布是用户的下一步独立决定）。
