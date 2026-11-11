# S02 启动与协作说明核对

- 日期：2026-11-10
- 执行工具：Codex，本记录不作为Qoder开发证据。
- 范围：README、AGENTS、启动说明与本地复核；不安装新依赖、不改业务逻辑、不部署或推送。

## 本轮工具链

| 项目 | 实际结果 | 说明 |
| --- | --- | --- |
| node --version | v24.16.0 | 当前终端命令 |
| pnpm --version | 11.25.0 | 当前终端入口；不同于原安装版本 |
| node_modules/.modules.yaml | pnpm@12.14.0 | 本机现有依赖的安装记录，不代表每位队友已统一 |
| py --version | No installed Python found! | 本次命令视角不可用；不覆写过去记录为“过去也未安装”，S11再核对 |
| 已安装核心包 | Next16.3.5、Nextra4.6.1、React19.3.0、TS6.0.3、ESLint10.10.0 | 直接读取项目依赖包元信息 |
| Next Node要求 | >=20.9.0 | 比项目engines笼统的>=20更具体 |

## 启动检查

本机8000端口已有开发服务，未中断该服务；六个主入口HTTP均返回200。这是现有服务可用性检查，不冒充本轮重新安装或重新启动开发服务。

按README的备用生产预览命令，在原本空闲的7000端口启动：

~~~powershell
node ./node_modules/next/dist/bin/next start -p 7000
~~~

使用已有构建，服务显示Ready后检查：

| 路径 | HTTP |
| --- | --- |
| /zh | 200 |
| /zh/workspace | 200 |
| /zh/lab | 200 |
| /zh/training | 200 |
| /zh/experiments | 200 |
| /zh/docs | 200 |
| /zh/docs/factors | 200 |
| /zh/docs/rules | 200 |
| /_pagefind/pagefind.js | 200 |

随后通过该临时会话Ctrl+C关闭7000服务，未结束其他进程。与原开发服务同时读取既有构建；本轮未重建共享.next目录。后续做生产构建前仍需停止同目录开发服务。

## 文档核对

- 根及前端README写明当前Mock边界、只中文、后端未开始、刷新重置及已登记缺陷。
- 启动/检查/构建/预览与package.json、.npmrc和postbuild命令对应；直接Next build需另做sitemap和Pagefind。
- 英文README改为简短指引，去除上游模板的部署成功徽章与已删除功能承诺；保留MIT许可证。
- AGENTS写明目录、负责人边界、蓝白简洁风格、规则正确性、验收与真实工具来源。

## 验证范围

本轮仅复用已有依赖与构建。首次pnpm install --frozen-lockfile、清洁克隆安装、不同操作系统、浏览器交互、Sites以及后端均未验证。此前类型、lint、构建结果是已有检查记录，不因文档更新反复全量运行。主页面HTTP200不代表交易逻辑正确，favicon500仍归S09处理。

README中的正常安装流程需在队友统一pnpm后实际执行；当前pnpm入口和原安装版本不一致，不能由本轮成功预览推断11.25能无变更安装全部依赖。S19负责干净克隆复现。
