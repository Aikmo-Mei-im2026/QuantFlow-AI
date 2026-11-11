# 首页全屏翻页验收

- 日期：2026-11-11。开发、复核与截图：Codex。
- 用户要求：背景填满页面，去掉包裹介绍的大矩形卡片，一屏显示一章介绍，滚轮一次切到下一章。

## 文件与实现

- frontend/src/components/quantflow/HomeView.tsx：六屏内容、共用页码/圆点/翻页按钮；末屏保留中文显示设置。
- frontend/src/components/quantflow/HomeView.module.css：背景满宽、导航下方占满可视高度；仅首页移除Nextra文章边距与尾部留白；保留插图中的玻璃质感。
- frontend/src/components/quantflow/useHomePager.ts：滚轮按手势翻页，过滤Ctrl/横向滚动，锁定惯性；较高内容先在本屏内阅读；支持方向键、PageUp/PageDown、Home/End及hash章节；所有监听在卸载时清理。
- frontend/src/content/zh/_meta.tsx：首页独立关闭外部页脚，其他页沿用原配置。
- frontend/src/i18n/home.ts：翻页提示和可访问名称。
- README、frontend/README、项目计划书v2.1与implementation-plan第7节同步说明。

## 实际检查

环境：Node v24.16.0、pnpm入口11.25.0；复用现有依赖，没有安装或修改锁文件。

在frontend执行：

~~~powershell
node ./node_modules/eslint/bin/eslint.js src/components/quantflow/HomeView.tsx src/components/quantflow/useHomePager.ts src/i18n/home.ts src/content/zh/_meta.tsx
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
node ./node_modules/next/dist/bin/next build
node ./node_modules/next-sitemap/bin/next-sitemap.mjs --config next-sitemap.config.mjs
node ./node_modules/pagefind/lib/runner/bin.cjs --site .next/server/app --output-path public/_pagefind
~~~

- 修改文件的只读ESLint：0错误、0警告。此前为修正本轮格式执行过仅针对HomeView/useHomePager的自动格式修正。
- TypeScript通过；最终生产构建再次通过类型检查，静态页面10/10成功。
- sitemap成功；Pagefind索引8页、923词。SITE_URL仍为example.com，不代表已部署。
- 构建前核实并停止当前目录开发服务；构建后恢复8000开发预览。
- 1440×900：首页区域x=0、y=64、宽1440、高836，六屏均高836；小幅和大幅滚轮都只前进一章。End到帮助末屏，落点4180；body高度900，无额外页脚。
- 390×844：body宽390、高844，六屏均高780；正文、入口和图例完整，章节按钮正常，无整页横向溢出。手机菜单可展开并进入学习室。
- 390×500：较高内容可先读完；大幅滚轮停在知识屏底部864，再一次手势到实验室开头1300，避免跨过未读内容。
- 离开首页进入学习室：body overflow恢复visible、内容高度3180，页脚正常显示。
- 独立只读复核指出短屏下惯性放行顺序问题，已调整先检查翻页锁并完成短屏复测。

## 证据与限制

- [满屏首页](verification/home-fullscreen-overview.jpg)
- [第二屏介绍](verification/home-fullscreen-learn.jpg)

触摸采用浏览器原生scroll-snap，未用真实手机硬件验证手势；减少动态效果已由源码核对，未修改系统偏好。未覆盖所有浏览器、辅助技术和触控板型号。四模块与交易逻辑未改，本轮不重复业务测试；前轮19项结果见原验收记录。未提交、推送或部署。
