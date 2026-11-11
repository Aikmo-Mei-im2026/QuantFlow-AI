# QuantFlow AI 前端

Next.js 16 + React 19 + Nextra 4 + TypeScript + Tailwind CSS 4，当前为中文交互原型。根目录说明见[项目 README](../README.md)，任务与状态见[分步执行计划](../docs/implementation-plan.md)。

## 运行条件与当前边界

- Node.js 24.x，与 package.json 的 engines 对齐；本机实测 v24.16.0。Next.js 的最低版本要求不能代表 ESLint 等完整工具链要求。
- 项目声明 pnpm >=9；现有依赖记录由 pnpm 12.14.0 安装，先统一团队版本。锁文件必须保留，不混用 npm/yarn 安装。
- 当前页面只需前端环境，无需 Python、数据库或行情凭证。后端已有本地FastAPI基础与数据采样，但前端尚未接入，见[后端说明](../backend/README.md)。
- 仅中文内容。登录、AI Demo、升级页及英文内容已移除，模板旧功能不能视为本项目已有能力。
- mock-data.ts 提供固定候选、回测、记录及合成 K 线，参数并未驱动真实研究。训练状态仅在内存中，刷新/离开后重置。
- 本轮修正 UTC 日期序列、十万元空仓账户、各证券独立合成行情、按分记账、T+1 和期末委托保护；S05–S09 的验收状态以执行计划第 7 节为准。合成工作日序列不是交易所日历，本文件不将前端演示等同于正式执行引擎。

## 开发启动（PowerShell）

```powershell
Set-Location -LiteralPath 'D:\项目\QuantFlow-AI\frontend'
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

替换为自己的克隆路径；已有依赖且锁文件未变时可以跳过安装。打开 http://localhost:8000/zh，保持终端运行，Ctrl+C 停止。

端口占用时先检查是否已有此项目服务，勿直接结束未知进程。在已有项目依赖完整、pnpm入口触发重新安装检查时，可直接运行本地 Next：

```powershell
node ./node_modules/next/dist/bin/next dev --turbopack -p 8000
```

此命令不能替代首次安装。首次安装失败应记录命令、Node/pnpm版本和脱敏错误；保留锁文件和信任策略，不复制其他同学的 node_modules，不盲目批准全部依赖脚本。当前 onlyBuiltDependencies 白名单在 pnpm-workspace.yaml 中。

## 验收与完整构建

只读检查，不改源码：

```powershell
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
```

常规 pnpm typecheck 可能写增量缓存；pnpm lint 含 --fix 会自动修改文件，只有要执行修复时才用，并查看差异。

停止同目录的开发服务后执行：

```powershell
pnpm build
pnpm start
```

.npmrc启用了前后置脚本，正常pnpm build会依次执行Next静态导出和postbuild中的sitemap、Pagefind，最终文件位于out。pnpm start运行本地静态预览脚本，仅监听127.0.0.1:7000，打开 http://127.0.0.1:7000/zh/，停止仍用Ctrl+C；不再使用next start。

若已有依赖，但 pnpm 入口本身有问题，可以逐条运行完整等价流程；上一条成功后再运行下一条：

```powershell
node ./node_modules/next/dist/bin/next build
node scripts/postbuild.mjs
node scripts/preview-static.mjs
```

单独Next build不包含后处理。postbuild脚本先把sitemap和robots写入out，再清理out中的旧Pagefind索引并重新生成，同步到public/\_pagefind供开发搜索使用，最后复制MIT许可证到out/LICENSE.txt。清理前检查固定目录的真实路径；遇到链接或目录异常会停止。开发页面能打开不代表最终静态产物含有可用索引，必须验收上述完整流程。out、.next及搜索生成物均不提交Git。修改纯文档时不必重复构建全部页面。

静态预览支持目录index.html、资源MIME、GET/HEAD与真实404，不对未知路径回退首页。需要其他端口时运行node scripts/preview-static.mjs --port 7300。根路径返回HTTP 200入口，由浏览器跳至/zh/并保留query/hash；它不是服务端30x重定向。

静态HTTP检查在仓库根目录执行，只检查HTTP响应，不代替浏览器搜索或Sites公开访问验收：

```powershell
& './backend/.venv/Scripts/python.exe' scripts/check_deployment.py --frontend-origin http://127.0.0.1:7000 --static-export
```

## 页面和源码位置

| 路由             | 主要组件/内容               |
| ---------------- | --------------------------- |
| /zh              | HomeView.tsx                |
| /zh/workspace    | WorkspaceView.tsx           |
| /zh/lab          | LabView.tsx                 |
| /zh/training     | TrainingView.tsx            |
| /zh/experiments  | ExperimentsView.tsx         |
| /zh/docs         | content/zh/docs/index.mdx   |
| /zh/docs/factors | content/zh/docs/factors.mdx |
| /zh/docs/rules   | content/zh/docs/rules.mdx   |

所有业务组件位于 src/components/quantflow/。src/content/zh/ 的MDX是页面入口，\_meta.tsx控制导航与布局；src/i18n/保存文案字典，en.ts目前保留字典结构，不代表提供英文站。

| 路径                                            | 修改用途                   |
| ----------------------------------------------- | -------------------------- |
| src/lib/mock-data.ts                            | 明确标记的演示数据         |
| src/components/quantflow/charts.tsx、shared.tsx | 业务图表及状态组件         |
| src/components/ui/                              | 可复用基础组件             |
| src/app/layout.tsx                              | 根HTML、metadata与全局样式 |
| src/app/[lang]/layout.tsx                       | Nextra外壳、导航与默认浅色 |
| src/app/[lang]/styles/index.css                 | 蓝白主题tokens与全局样式   |
| src/app/page.tsx、not-found.tsx                 | 静态根入口与中文404        |
| scripts/preview-static.mjs                      | 仅本机静态预览             |
| next-sitemap.config.mjs                         | sitemap域名与robots配置    |

新增页面、语言或路由前先检查当前源码及[模板参考 skill](.agents/skills/nextjs-nextra-starter-distill-zh/SKILL.md)。skill内对登录、多语言等描述是上游参考，可能与当前删减后的产品不同；不据此恢复已删除演示。

## 配置与部署

SITE_URL是可选构建配置，影响metadata和sitemap；本地缺省为 https://example.com。无需为本地演示填写Token。取得实际公开域名后，先在PowerShell设置$env:SITE_URL，再完整重建；静态托管不会在运行时替换此值，不能把占位域名当成作品链接。

S04b已启用output: 'export'与trailingSlash: true，移除服务端语言proxy，保留withNextra的中文配置、MDX路由和主题集成。待上传的前端目录为out，不能把.next、源码仓库或本地data作为静态站点包。当前out仅含教学原型内容，真实历史样本仍不公开。

本地静态导出构建11/11、sitemap与Pagefind索引8页、19项演示测试和8项预览服务测试通过；ESLint为0错误、5条既有警告。静态HTTP检查16/16通过；浏览器已验证根入口、帮助页、中文“量价”搜索、结果跳转及因子页面刷新。详见[静态导出验收](../docs/static-export-verification.md)。

Sites实际上传、预览、匿名公开访问、API调用和持久存储仍待S04c及后端路线验证；官方能力见[部署核对记录](../docs/deployment-validation.md)。Sites不运行FastAPI，现有后端拟保留并另行托管。当前账户套餐与额度未知，本轮没有上传、发布或购买服务。生产公开前仍需按实际网络请求核对无上游统计脚本。

当前本机依赖与启动检查详见[启动验证记录](../docs/startup-verification.md)。首次干净克隆安装及全队复现留S19，不能由本机已有依赖成功推断全部环境可用。

## 视觉与修改约定

/zh/workspace已调整为知识学习室，WorkspaceView转接LearningRoom；原候选研究和股票搜索归入/zh/lab。首页背景铺满，通过useHomePager逐屏翻页，短屏先读完当前内容；手机触摸使用原生滚动吸附。帮助从导航圆形问号进入，文档搜索位于帮助首页，股票搜索仅覆盖本地预置样例。文案在i18n/home.ts、learning.ts、lab.ts。验收见[四模块记录](../docs/learning-home-verification.md)和[全屏翻页记录](../docs/home-fullscreen-verification.md)。

默认蓝白浅色，每页突出一个主要任务，详情折叠，避免增加大量卡片。保留Next/Nextra/MDX集成点和现有别名，优先复用tokens及组件；遵循根[AGENTS.md](../AGENTS.md)。

后端建立后，数据与账户经统一API取得，浏览器不维护另一套权威资金计算。公式、接口和执行规则改动先同步契约并通知使用者。

基于[pdsuwwz/nextjs-nextra-starter](https://github.com/pdsuwwz/nextjs-nextra-starter)改造，保留[MIT许可证](LICENSE)及上游版权声明。原始模板不作为本产品能力清单。
