# S04b 本地静态导出验收

日期：2026-11-11（北京时间）。由Codex实施并独立复核。用户要求“下一步”，范围为将现有前端适配为静态导出并在本地验收；未上传Sites、发布、购买、创建凭证或提交推送Git。S04b本地完成，S04整体仍进行中。

## 修改与产物

- 保留Next16.3.5、Nextra4.6.1、中文MDX、导航与主题；启用output: export和trailingSlash，删除服务端语言proxy。Nextra读取中文i18n后会清除最终Next配置的i18n，因此保留此内容发现配置；复用generateStaticParamsFor并关闭dynamicParams。
- 根layout提供唯一html/body、metadata和全局样式；语言layout保留Nextra外壳。根页面HTTP200，浏览器跳转/zh/并保留query/hash，有可点击入口；中文404由独立静态文件提供，不做SPA回退。
- postbuild脚本串行执行sitemap、清理并生成out/_pagefind、同步开发搜索索引、复制MIT许可证。清理仅针对固定的项目内生成目录，先检查真实路径和链接，失败停止。
- pnpm start改为无依赖的本地静态预览，固定frontend/out，仅监听127.0.0.1:7000。支持目录index、308尾斜杠、GET/HEAD、资源MIME、404，不列目录或读取输出目录外文件。
- HTTP检查新增显式--static-export模式：不将根页200视为HTTP重定向，页面使用规范尾斜杠；浏览器动作单独验证。

本地产物为[frontend/out](../frontend/out)，共108个文件、2,803,532字节（约2.67MiB），最大单文件238,620字节。包含8个内容页、根入口、404、Next静态资源/导航载荷、Pagefind、sitemap、robots、图标与LICENSE.txt。检查未包含data、references、.git、.venv、node_modules、.env或日志路径。原始金融数据未进入产物，页面仍为固定样例与合成K线。目录大小是本地产物证据，不代表平台已接收。

## 命令与实际结果

在frontend目录使用Node24.16.0；当前pnpm入口11.25.0，复用已有依赖，没有重装或修改锁文件。由于既有目录写入在普通沙箱返回EPERM，本轮针对已确认的项目路径执行获准构建；没有降低信任配置。

构建前确认并停止本项目8000端口Next开发服务，没有停止9000后端。实际通过的完整构建命令：

~~~powershell
node ./node_modules/next/dist/bin/next build
node scripts/postbuild.mjs
node scripts/preview-static.mjs
~~~

Next静态生成11/11通过，构建内TypeScript通过；sitemap恰好8个内容URL，Pagefind索引8页/923词，只有1份当前中文metadata文件。已核对14项页面JS/CSS资源HTTP200及正确MIME。完整后处理修订后独立复跑通过，无业务源码改动时未重复Next全量构建。

~~~powershell
node ./node_modules/eslint/bin/eslint.js .
node --test tests/demo-execution.test.ts tests/demo-research.test.mjs tests/demo-chart.test.mjs
node --test tests/preview-static.test.mjs
~~~

全量ESLint为0错误、5条既有警告；后续新postbuild脚本与修订后的前端README定向检查通过。19项演示测试与8项预览服务测试通过。预览测试含路径越界、错误URI、Windows路径别名、junction、HEAD和真实404。

仓库根目录：

~~~powershell
& './backend/.venv/Scripts/python.exe' scripts/check_deployment.py --frontend-origin http://127.0.0.1:7000 --static-export
~~~

静态HTTP 16/16通过，不含API/CORS验收；[原始JSON](verification/deployment-http-static-local.json)保留scope=http_smoke_only及未覆盖项。另有[产物与资源检查报告](verification/static-export-local.json)。

backend目录：

~~~powershell
& './.venv/Scripts/python.exe' -m pytest -p no:cacheprovider
& './.venv/Scripts/python.exe' -m ruff check app tests ../scripts/check_deployment.py --no-cache
~~~

126测试通过，1条既有Starlette/httpx弃用警告；Ruff通过。部署工具测试从25增至34，其余业务实现未改；依赖未变，沿用S04a的pip check证据。

## 浏览器实际验证

纯静态预览页面通过以下操作：

1. 打开根网址，浏览器进入/zh/；再次带query和hash进入，二者保留。该项只证明参数保留，不宣称首页自动定位章节。
2. 首页问号打开帮助页；输入中文“量价”得到实际搜索结果，点击“八个基础因子”进入/zh/docs/factors/。
3. 直接刷新因子深层页面仍正常显示。
4. /en/training/显示中文404，HTTP检查另验状态404。
5. 清理旧索引后重新打开帮助页，搜索仍返回结果。检查期间浏览器日志无warn/error条目。

搜索截图为[static-search-local.jpg](verification/static-search-local.jpg)，只含本地教学页面。当前使用侧栏浏览器默认视口，未做本轮完整移动端/交互回归；此前页面验收另见相应记录。浏览器工具曾等待超时，允许重试后成功，不是站点失败或安全拒绝。

## 限制与下一项

当前预览在http://127.0.0.1:7000/zh/，仅本机；8000开发服务已按构建要求停止。本地静态包使用example.com占位域名，正式域名确定后必须设置SITE_URL并完整重建。

S04c仍需实际验证Sites目录索引、404状态、静态资源、根入口、搜索、深层刷新及匿名HTTPS；不能依据本地Node预览服务器推断Sites路由行为。拟上传仅out内容，不上传源码仓库或原始数据。当前套餐/额度、费用、发布范围需在实际操作前明确。FastAPI独立HTTPS、浏览器CORS、持久化与赛事部署组合仍待验收；此次静态导出未实现业务后端。

独立代理复核未发现阻断本地验收的问题；真实域名、平台路由与外部API保留到下一阶段。首次干净安装和队友复现仍留S19。本轮成果不记为Qoder生成或部署证据。
