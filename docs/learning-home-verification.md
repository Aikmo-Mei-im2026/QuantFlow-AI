# 四模块与液态玻璃首页验收

> 后续修订：用户要求去掉外层矩形卡片，改为背景铺满、一次滚轮切换一屏。当前首页以[全屏翻页验收](home-fullscreen-verification.md)为准；下文保留初版四模块与首页验收事实。

- 日期：2026-11-11；执行与截图工具：Codex。
- 用户授权：四模块调整、图文知识学习室、液态玻璃堆叠首页、圆形问号帮助、股票搜索迁入策略实验室；承接此前中文设置要求。
- 本轮为前端信息架构与体验任务，不建立真实行情、后端或公开部署。

## 修改范围

| 内容 | 主要文件 | 结果 |
| --- | --- | --- |
| 首页 | HomeView.tsx、HomeView.module.css、i18n/home.ts | 六屏玻璃层、光晕、原创CSS/SVG视觉；桌面自然滚动堆叠，章节锚点；移动/短视口与减少动态效果降级顺序阅读 |
| 知识学习室 | WorkspaceView.tsx、LearningRoom.tsx、LearningDiagram.tsx、i18n/learning.ts | 四节图文课程：K线、量价、ETF、风险与规则；误区与自测；切换滚动到新课程标题 |
| 策略实验室 | LabView.tsx、CandidateResearch.tsx、i18n/lab.ts | 研究功能迁入，按名称/代码搜索六只预置证券；无结果、清空、详情；股票与因子/回测样例分区，切换保留输入 |
| 实验记录 | ExperimentsView.tsx | 响应式展开列表与复盘引导，明确人工样例不会保存当前练习 |
| 导航与帮助 | layout.tsx、_meta.tsx、navbar-extras.tsx、HelpSearch.tsx、docs MDX | 四业务入口+圆形问号；移除全局搜索；帮助首页提供站内内容搜索 |
| 中文设置 | theme-settings.tsx、theme-toggle.tsx、CustomFooter、zh/en字典、next.config.ts | 页脚显示设置：浅色/深色/跟随系统；主题按钮中文标签；关闭开发模式N角标，不修改依赖内部代码 |

以上组件均位于 frontend/src；未安装依赖、修改锁文件或改动交易执行函数。沿用 /zh/workspace 作为知识学习室路由，保留 Next/Nextra、MDX 与中文语言结构。

## 命令与结果

在 frontend 执行：

```powershell
node --test tests/demo-execution.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/next/dist/bin/next build
node ./node_modules/next-sitemap/bin/next-sitemap.mjs --config next-sitemap.config.mjs
node ./node_modules/pagefind/lib/runner/bin.cjs --site .next/server/app --output-path public/_pagefind
node ./node_modules/next/dist/bin/next start -p 7000
```

- Node v24.16.0、pnpm入口11.25.0；复用既有依赖，不代表干净安装已验收。
- 19/19业务测试通过；TypeScript通过；全量只读ESLint为0错误、5个既有模板/类型警告。CSS module由Next构建解析，不宣称ESLint检查CSS。
- Next构建10/10成功，sitemap成功，Pagefind索引8个公开页面、922词；当前索引也包含公开业务演示内容，并不只限帮助文章，不含运行中的账户状态。
- 构建前核实并停止当前目录8000开发进程；写入/格式化部分既有文件遇EPERM，获准提升后成功。
- Nextra提示未提交MDX缺少Git时间戳；SITE_URL仍是example.com，不代表部署。
- 生产模式：八内容入口、favicon.ico与Pagefind脚本200；/en、/xx、/api/no-such-route返回404。

## 浏览器与内容核对

- 首页桌面首屏、章节链接、滚轮下移叠层及导航问号可用；移动390×844时切为顺序阅读，整页宽375≤viewport390，无整页横向溢出。减少动态效果规则经源码核对，未修改用户操作系统设置。
- 知识学习室切换K线与ETF、自测反馈正常；切换后课程标题位于可见区域。390px下课程与图解正常排布。
- 搜索“茅台”和“600519”均匹配1只，显示71.5025；“不存在”返回0只，清空恢复6只；回测样例仍显示费用136.96、22.25、30.77及回撤/换手“未提供”。
- 问号打开帮助页，生产模式搜索“佣金”返回交易规则等公开内容；顶部无搜索输入框。
- 页脚显示设置及其选项为中文；N开发角标已关闭。
- 独立只读复核确认K线图高低/开收盘对应、量价描述、ETF交易边界和100→80→100的25%回本算例无阻断问题。ETF图示采用双向箭头，避免暗示价格与净值永不相等。

截图：

- [首页首屏](verification/home-glass-overview.jpg)
- [首页堆叠](verification/home-glass-stacked.jpg)
- [ETF图文课程](verification/learning-etf.jpg)

## 限制

图文为入门教学内容，未做全部设备/辅助技术矩阵验证。股票搜索仅覆盖六只人工样例；评分与回测独立，不因筛选产生新回测。训练合成行情、内存账户与原边界不变；记录和学习进度未持久化；ETF课程不意味着支持ETF交易。真实来源、正式后端、干净克隆与Sites仍待后续。未提交、推送或部署；Codex成果不作为Qoder过程证据。
