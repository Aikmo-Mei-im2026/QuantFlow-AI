# S01 仓库共享文件核对

- 日期：2026-11-10
- 执行工具：Codex；不记作Qoder开发过程。
- 范围：仅修根.gitignore两条模式，并保存核对与任务状态；未修改业务代码。

## 修改

- data/ 改为 /data/，仅排除根金融数据。
- references/ 改为 /references/，仅排除根参考克隆。
- 保留已有依赖、环境文件、数据库、日志、缓存和构建规则。

## 验证方法

git check-ignore --quiet --no-index验证规则，部分路径是未创建的示例，不据此宣称文件已实现。以命令级空值core.excludesFile隔离本机不可读的全局忽略文件，未改全局配置；26项均用此方式复核通过。实际候选清单用git ls-files --others --exclude-standard读取，未暂存文件。

| 路径 | 预期 | 实际 |
| --- | --- | --- |
| backend/app/data/example.py | 可被跟踪 | 通过 |
| frontend/.agents/skills/nextjs-nextra-starter-distill-zh/references/architecture.md | 可被跟踪 | 通过 |
| frontend/.agents/skills/nextjs-nextra-starter-distill/references/architecture.md | 可被跟踪 | 通过 |
| frontend/src/lib/mock-data.ts | 可被跟踪 | 通过 |
| frontend/pnpm-lock.yaml | 可被跟踪 | 通过 |
| frontend/.npmrc | 可被跟踪 | 通过 |
| .env.example | 可被跟踪 | 通过 |
| frontend/.env.example | 可被跟踪 | 通过 |
| backend/.env.example | 可被跟踪 | 通过 |
| .env | 被忽略 | 通过 |
| frontend/.env.local | 被忽略 | 通过 |
| backend/.env.production | 被忽略 | 通过 |
| data/quotes.csv | 被忽略 | 通过 |
| references/nextjs-nextra-starter/package.json | 被忽略 | 通过 |
| frontend/node_modules/react/package.json | 被忽略 | 通过 |
| frontend/.next/build-manifest.json | 被忽略 | 通过 |
| frontend/.pnpm-store/package.json | 被忽略 | 通过 |
| backend/.venv/pyvenv.cfg | 被忽略 | 通过 |
| backend/app/__pycache__/example.pyc | 被忽略 | 通过 |
| backend/.pytest_cache/example | 被忽略 | 通过 |
| backend/account.sqlite3 | 被忽略 | 通过 |
| frontend/dev-server.log | 被忽略 | 通过 |
| frontend/tsconfig.tsbuildinfo | 被忽略 | 通过 |
| frontend/public/_pagefind/pagefind.js | 被忽略 | 通过 |
| frontend/public/sitemap.xml | 被忽略 | 通过 |
| frontend/public/robots.txt | 被忽略 | 通过 |

## 文件清单与独立复核

- 写入本核对文档前，未跟踪候选90个；文档新增后数量会变化。
- 中英文skill的10篇references均进入候选；前端源码、锁文件与许可证可提交。
- 候选路径未发现根data/references、依赖、缓存或环境密钥文件；此为路径核对，不是对所有源码内容作无密钥保证。
- .env.example是允许的示例路径，本任务没有新建示例文件、没有读取或输出.env值。
- 独立只读复核与主检查结论一致。
- 根references仍排除，不会作为嵌套gitlink共享；frontend是普通快照。
- 未暂存、提交或推送；队友尚不能通过clone/pull取得新增前端。

## 下一步

S02：重写根与前端README，建立AGENTS.md，说明启动、目录分工、Mock边界和验收命令。真实数据、Sites及交易缺陷按后续任务处理。
