# 项目检查记录（2026-11-10）

- 执行工具：Codex；包括独立代码复核，不作为 Qoder 开发证据。
- 范围：当前工作区的源码、配置、协作文档、只读静态检查和现有本地开发服务。
- 结论：前端演示页面可访问，但交易与研究样例尚不自洽，不能作为正式量化或交易系统验收。
- 本次只新增检查记录并更新实施计划；未修业务代码、安装依赖、提交、推送或部署。

## 1. 本次实测

命令在 `frontend` 目录运行。

| 检查 | 命令或方式 | 实际结果 |
| --- | --- | --- |
| Node | `node --version` | v24.16.0 |
| pnpm | `pnpm --version` | 11.25.0；既有依赖安装记录为 12.14.0 |
| TypeScript | `node ./node_modules/typescript/bin/tsc --noEmit --incremental false` | 退出码 0 |
| ESLint | `node ./node_modules/eslint/bin/eslint.js .` | 退出码 1：30 个错误、5 个警告；全部错误来自 frontend/README.md 的 Markdown 格式 |
| 内容页面 | 对现有 `http://localhost:8000` 服务逐项 fetch | `/zh`、`/zh/workspace`、`/zh/lab`、`/zh/training`、`/zh/experiments`、`/zh/docs`、`/zh/docs/factors`、`/zh/docs/rules` 均为 200 |
| 搜索与图标资源 | 同上 | `/_pagefind/pagefind.js` 和 `/img/favicon.svg` 为 200；`/favicon.ico` 为 500 |
| 无效路径样例 | 同上 | `/zh/not-a-page` 为 404；`/xx` 重定向至 `/zh/xx` 后为 404 |
| 算术与日期 | Node 导入实际 mock-data.ts，独立手算；使用 UTC 与 Asia/Shanghai 子进程对照 | 结果见下文 |
| 训练事件 | 复核助手在内存提取实际组件状态和事件函数，以 useState 替身运行 | 验证新买仓位不解锁、期末仍可提交及现金与记录差异；不替代浏览器交互验收 |
| 工程静态核对 | 依赖 specifier、Markdown 链接、git check-ignore | 直接依赖与锁文件 specifier 一致；所查文档本地链接存在；根数据/参考目录排除未误伤嵌套源码 |

5 个 lint 警告分别位于 flip-words.tsx、link-preview.tsx（2 项）、useServerLocale.ts、i18n/index.ts。没有使用含 `--fix` 的 lint 命令。

## 2. 新增或计划未明确列出的发现

### R01 / P1：训练成交记录与现金无法对账

位置：[TrainingView.tsx:97](../frontend/src/components/quantflow/TrainingView.tsx#L97)、[TrainingView.tsx:156](../frontend/src/components/quantflow/TrainingView.tsx#L156)。金额先按未量化价格和费用记账，再将成交记录价格及费用各自保留两位。

默认账户首次推进，600036 买入 800 股：现金从 31,280.50 元变为 1,816.943584 元，记录为 36.82 元 × 800 股、费用 8.84 元。按记录复算余额应为 1,815.66 元，相差 1.283584 元。应在记账前统一价格及金额精度，记录与余额使用同一已量化值；纳入 S07。

### R02 / P2：回测演示费用不符合声明费率

位置：[mock-data.ts:194](../frontend/src/lib/mock-data.ts#L194)，费率说明在 [zh.ts:119](../frontend/src/i18n/zh.ts#L119)。声明佣金为成交额的 0.03%、最低 5 元。

| 证券 | 价格 × 股数 | 仅佣金应为 | 样例费用 |
| --- | --- | --- | --- |
| 600519 | 1521.80 × 300 | 136.96 | 13.70 |
| 000858 | 148.35 × 500 | 22.25 | 5.00 |
| 002594 | 256.40 × 400 | 30.77 | 5.00 |

即使是固定演示也应可按参数核算。建议随 S07 的费用核对修正样例，不将其描述为正式回测计算。

### R03 / P2：回测记录超出显示的实验区间

位置：[LabView.tsx:12](../frontend/src/components/quantflow/LabView.tsx#L12)、[mock-data.ts:197](../frontend/src/lib/mock-data.ts#L197)。三个可选区间均截至 2026-09-30，成交列表却无条件包含 2026-10-02 的卖出和拒单。默认区间即有矛盾，不依赖切换参数。建议随 S05 对齐固定样例日期，并验证记录处于对应实验窗口内。

### R04 / P2：当前 lint 已失败

位置：[frontend/README.md:16](../frontend/README.md#L16) 起的代码围栏、表格对齐及下划线转义。实际命令报告 30 个格式错误，不能继续沿用此前“0 错误”的检查结果。本次保留原文，后续以仅格式修改修复并复跑只读 lint。

### R05 / P2：文档声明的 Node 最低版本不满足完整工具链

位置：[frontend/README.md:7](../frontend/README.md#L7)、[package.json:9](../frontend/package.json#L9)。README 的 Node >=20.9.0 仅覆盖 Next.js，package.json 还允许更早的 Node 20。锁定的 @eslint-react/eslint-plugin 5.19.1 要求 Node >=22；ESLint 10.10.0 要求 ^20.19.0 或 ^22.13.0 或 >=24；Sass 也要求 >=20.19.0。

因此 Node 20.9 不属于完整工具链受支持的环境。建议将团队环境对齐到本机已验证的 Node 24，并同步 engines 和说明；pnpm 版本固定及干净安装需实际验收。未在旧 Node 运行，未断言其具体报错形式。

## 3. 已登记缺陷复核

| 任务 | 实际证据 | 影响与位置 |
| --- | --- | --- |
| S05 日期 | UTC 首日/初始回放日/末日为 08-03 / 09-23 / 09-29；上海为 08-02 / 09-22 / 09-28，均为 2026 年 | 本地日历与 UTC 输出混用；mock-data.ts:275、287、296 |
| S05 未来记录 | 初始页面已包含 09-29 成交和 09-30 待成交委托；上海首次推进将该未来委托成交于 09-23 | mock-data.ts:317、321 |
| S05 期初资产 | 31,280.50 现金 + 300 股茅台 + 500 股五粮液 = 561,920.50 元 | 与十万元空仓规则不一致；TrainingView.tsx:37、mock-data.ts:301 |
| S06 成交与估值 | 首次推进图表 open=1685.71、close=1665.71，茅台参考/估值仍取 1521.80；切证券图表不变 | 固定 close 成交、固定 close 估值和单组 K 线并不对应；TrainingView.tsx:97、171、216 |
| S07 T+1 | 首次推进买入 600036 后，新仓位 sellable=0，后续推进不会结转，卖出仍被拒绝 | 正常买卖闭环受阻；TrainingView.tsx:123 |
| S07 期末委托 | 末日可再提交，订单增加为 pending，但 advance 直接返回 | 形成永远不能处理的委托；TrainingView.tsx:48、72 |
| S08 评分 | 茅台显示 78.4；按展示因子及趋势权重可复算为 71.5025；按预写类别分加权则为 75.985 | 综合分、类别分与因子不自洽；mock-data.ts:25、36 |
| S09 图标 | `/favicon.ico` 实测 500，当前 SVG 图标为 200 | 资源路径仍落入语言/内容路由；src/proxy.ts、src/app/[lang]/layout.tsx、src/app/_dictionaries/get-dictionary.ts |
| S09 能力文案 | 帮助写“共用同一执行模块”“后端只返回截至回放日的行情” | 实际无后端，应明确为目标设计；content/zh/docs/rules.mdx:7、36 |

没有将“固定参数尚未驱动真实计算”单独列为新增缺陷：页面已提示固定演示。最大回撤等摘要缺少对应日频净值，当前数据不足以复算，不由抽样曲线直接断言其数值必错。

## 4. 范围与限制

- 本次未重复完整构建：已有生产构建与 postbuild 记录，业务源码未改；按仓库约定不因检查文档重复全量构建。上述类型检查和 lint 为本轮实测，构建成功属于既有记录。
- HTTP 检查复用既有 8000 服务，没有终止其他进程；未做浏览器点击、移动端或跨浏览器视觉验收。
- Pagefind 资源返回 200 不等于搜索交互通过；少量 404 样例不代表所有非法路径均已验证。
- 未执行干净克隆、安装依赖、旧 Node 验证、Qoder Sites 部署、真实数据获取或后端验收。
- 根 Git 状态含既有未提交改动，整个 frontend 尚未跟踪；未重置、暂存、提交、推送。队友不能通过 pull 获得仅本地存在的代码。
- S03/S04 的数据来源及部署验证仍应尽早推进；本次检查不替代这些任务，也不把 S05–S09 标为完成。

## 5. 修复顺序建议

先解决文档格式和环境最低版本，使检查入口可靠；交易演示按 S05 → S06 → S07 修正日期/期初、行情、金额/T+1/期末，随后完成 S08/S09。R02/R03 分别随费用、日期样例核对处理。独立业务任务逐项验收，G1 阶段结束再执行完整 build、sitemap、Pagefind 和浏览器体验检查。
