# QuantFlow AI

面向大学生的可解释量化学习与 K 线训练平台，准备参加 2026 Qoder 高校创造力大赛，建议赛道为 StudyHack，实际选择与成员资格待确认。

项目希望帮助初学者通过图文理解股市知识，再查看候选解释与策略实验、使用虚拟账户练习、回看记录复盘。候选代表符合策略条件，不代表承诺上涨。

## 当前能用什么

截至 2026-11-11，已有基于 Next.js + Nextra 的中文前端交互原型，以及可本地运行的FastAPI后端基础。选股、回测和实验列表仍使用固定演示数据，K线为合成样例；后端目前只有健康/能力接口，没有实时行情、真实回测、交易API或数据库，前端尚未接入后端。

前端已完成S04b本地静态导出：8个中文内容页、根入口、404、站点地图及Pagefind索引保存在frontend/out；纯静态预览中的根跳转、帮助搜索和深层页面刷新已验证。该产物尚未上传Sites，公开访问与独立后端仍待验收，详见[静态导出验证](docs/static-export-verification.md)。

本地数据模块已完成BaoStock小样本采集与质量验证：5只股票2025年上半年共585条不复权日线、117个交易日，保存原始文件、来源清单和校验值。数据尚未接入页面；公开展示/再分发权限及交易所限制、权益事件仍待确认，详见[数据来源验证](docs/data-source-validation.md)。

训练操作只保存在页面内存中，刷新或重新进入会重置。本轮修正范围为 UTC 日期序列、十万元空仓账户、各证券独立合成行情、按分记账、T+1 和期末委托保护；验收状态以[分步执行计划](docs/implementation-plan.md)第 7 节为准。合成工作日序列不是交易所日历，前端演示不等于正式交易引擎。

训练场已按 [KLinePlayground](https://github.com/fat7/KLinePlayground) 的交互结构改版，提供账户面板、K线与成交量、MA5/10/20、买卖标记、缩放与回放控制。参见[设计参考](docs/kline-design-reference.md)和[本地验收](docs/frontend-demo-verification.md)。

## 在 Windows 启动前端

先安装 Node.js 24.x 与 pnpm，并在 PowerShell 检查版本。项目按完整工具链声明 Node 24.x，本机实测为 v24.16.0；Next.js 自身的较低要求不覆盖 ESLint 等开发依赖。现有依赖记录由 pnpm 12.14.0 安装，当前终端入口为 11.25.0；团队统一版本并完成干净安装前，不将这两者视为已验证兼容。package.json 目前只声明 pnpm >=9，没有锁定具体版本。

~~~powershell
Set-Location -LiteralPath 'D:\项目\QuantFlow-AI\frontend'
node --version
pnpm --version
~~~

队友使用自己的克隆路径替换上面的目录。第一次取得完整代码后安装依赖；已经安装且锁文件未变化时不必重复安装。

~~~powershell
pnpm install --frozen-lockfile
pnpm dev
~~~

打开 [本地首页](http://localhost:8000/zh)，终端保持运行，停止时按 Ctrl+C。当前前端不需要 Python、数据库、行情 Token 或 .env 文件。若克隆后没有 frontend 目录，先确认负责人已提交并推送前端，目录仅存在负责人电脑上时 pull 无法取得。

本轮复用了本机现有依赖，未执行全新克隆安装；pnpm 入口若触发安装检查，见[前端运行说明](frontend/README.md)中的已有依赖备用命令。不能通过删除锁文件或关闭信任校验来绕过问题。

## 本地后端

已建立Python 3.12隔离环境、FastAPI入口、配置、错误处理和API文档；安装与检查命令见[后端说明](backend/README.md)。本机已有backend/.venv时，在仓库根目录执行：

~~~powershell
./scripts/start-backend.ps1
~~~

默认只监听127.0.0.1:9000，与前端8000分开。可访问[健康检查](http://127.0.0.1:9000/api/v1/health)和[API文档](http://127.0.0.1:9000/api/v1/docs)。health的ok只表示API进程可响应，数据库与行情明确not_configured。业务模块和前端接入仍待完成，详见[后端基础验收](docs/backend-foundation-verification.md)与[数据契约草案](docs/data-contract.md)。

## 页面入口

| 页面 | 本地开发地址 | 当前内容 |
| --- | --- | --- |
| 首页 | http://localhost:8000/zh | 背景铺满、滚轮逐屏切换的介绍页，说明四模块与帮助入口 |
| 知识学习室 | http://localhost:8000/zh/workspace | K线、量价、ETF、风险的图文入门内容 |
| 策略实验室 | http://localhost:8000/zh/lab | 搜索预置股票、候选解释、演示净值和交易明细 |
| K 线训练场 | http://localhost:8000/zh/training | 合成行情与内存练习账户 |
| 实验记录 | http://localhost:8000/zh/experiments | 固定样例记录，尚未接真实任务 |
| 帮助文档 | http://localhost:8000/zh/docs | 因子与目标交易规则说明 |

当前只提供中文内容，没有登录、英文站或 AI 聊天页面。帮助中的目标规则需与当前实现区分。

帮助文档从导航四模块旁的圆形问号进入，文档搜索在帮助首页内。股票搜索位于策略实验室，只过滤预置样例，不查询全市场行情；ETF课程不意味着训练场支持ETF交易。

## 目录和团队边界

~~~text
QuantFlow-AI/
  frontend/        已有前端原型，启动命令在此目录运行
  backend/         FastAPI基础、本地数据采样与质量检查；执行/存储等待实现
  data/            本地原始/派生金融数据，默认不提交
  docs/            执行计划、赛事记录、核对与协作说明
  scripts/         本地后端启动脚本；导入与业务复现仍待实现
  references/      本机参考克隆，不提交，也不是业务应用
  AGENTS.md        团队与编码助手的修改、验证和交接约定
  项目计划书.md    产品范围、公式和交付标准
~~~

Git不保存空目录；根data、references默认排除，backend与scripts已有可跟踪文件，但本地新文件未提交推送前队友仍无法取得。A（发起人）先搭框架、接口与部署；B接数据获取与质量；C接因子、模型与回测研究。实际人选与工时待确认，详见[AGENTS.md](AGENTS.md)。

## 提交前检查

在 frontend 目录执行只读检查：

~~~powershell
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
~~~

pnpm lint 的脚本含 --fix，会修改文件。路由、依赖或构建配置变更后再做完整构建；构建前停止同目录开发服务，避免共享 .next 产物。

~~~powershell
pnpm build
pnpm start
~~~

完整构建包括Next静态导出、sitemap和Pagefind，最终输出为frontend/out。pnpm start启动仅本机可访问的静态预览，打开 http://127.0.0.1:7000/zh/；它不再运行Next服务。直接调用Next CLI不会自动生成搜索索引，完整备用命令在[前端说明](frontend/README.md)。本地通过不代表Qoder Sites部署通过。

## 第一次团队协作

推荐用 GitHub Desktop 完成首个小任务：

1. 工作前查看 Changes，处理好自己的未提交改动，再 Fetch origin / Pull origin；遇冲突先保留现场并同步负责人。
2. 从团队约定的主分支创建功能分支，例如 feature/readme-notes；一次只做一项任务。
3. 修改后在 Changes 逐个核对文件，确认不含密钥、原始数据和构建产物，运行相关检查。
4. 写清改了什么并 Commit，随后 Publish branch / Push origin；本地 Commit 不等于已上传。
5. 创建 Pull Request，说明修改、验证和限制，由另一成员复核后合并。未推送的本地文件不能算已交接。

不混用多个包管理器重写锁文件，不覆盖队友改动。禁止提交真实凭证和未经许可的数据；允许分享的样例应记录来源和使用条件。

## 文档与后续

- [项目计划书](项目计划书.md)：范围、因子、交易规则与验收。
- [分步执行计划](docs/implementation-plan.md)：任务依赖、状态和下一项。
- [S01 文件共享核对](docs/shared-files-check.md)：忽略规则和可提交文件。
- [S02 启动与文档核对](docs/startup-verification.md)：本轮实测与未验证范围。
- [赛事要求核对](docs/competition-requirements.md)：官方来源及待确认项。
- [Qoder 开发日志](docs/qoder-development-log.md)：保留真实工具过程，Codex工作不标成Qoder工作。

真实历史小样本、Sites能力核验及前端本地静态导出已完成。下一项S04c是在明确上传/发布范围与授权后验证Sites预览和公开访问，并继续核验独立HTTPS后端路线，详见[部署核对](docs/deployment-validation.md)。默认example.com仅为本地构建占位，取得实际站点域名后须设置SITE_URL并重建。公开数据条件、正式契约、业务读取/执行/存储继续按任务推进，实际部署尚未完成。

前端基于 [pdsuwwz/nextjs-nextra-starter](https://github.com/pdsuwwz/nextjs-nextra-starter) 的文件快照改造，参考提交 05b8bd442637ef59c888aa0283283af27d8b3b90；保留[模板 MIT 许可证](frontend/LICENSE)。根参考克隆不要求队友另行取得才能启动业务前端。
