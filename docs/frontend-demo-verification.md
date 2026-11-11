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
