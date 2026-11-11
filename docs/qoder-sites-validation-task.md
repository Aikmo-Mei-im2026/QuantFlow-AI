# Qoder Sites 最小验证任务草案

这是一段由Codex准备的能力核验任务文本。2026-11-11用户明确同意“允许发送，只核对能力”，恢复误触Esc中断后，09:03北京时间已在Qoder CN的QuantFlow-AI现有任务“遍历文件夹内容”发送执行本文件的指令，09:06观察到任务完成并追加[核验结果](deployment-validation.md)。它不是部署成功证据。当前项目的本地文件未经提交推送；不应让Qoder误以为远端仓库已有完整代码。

建议在QuantFlow-AI工作区中执行以下任务；先做能力核验，形成明确部署预览后再处理实际发布：

> 检查当前工作区D:/项目/QuantFlow-AI能否通过你实际可用的Qoder Sites能力部署。先读根README、AGENTS.md、docs/implementation-plan.md和docs/deployment-validation.md，保留所有未提交改动。
>
> 本轮只验证部署路线。优先保留frontend中的Next.js 16.3.5、Nextra 4.6.1、中文MDX路由和语言proxy，不自动改成其他框架或模板。使用你实际可调用的Sites工具或官方文档，逐项说明是否支持导入本地项目、子目录构建、Node24、pnpm锁文件、Next服务/代理、完整postbuild、public资源、环境变量和动态端口；没有实际依据的能力标记未知。
>
> 后端是Python3.12/FastAPI，本地只有health/capabilities/OpenAPI。确认Sites能否运行ASGI服务，或者页面能否调用独立HTTPS API，并说明持久存储、休眠、重启、实例数量、资源额度与费用约束。不要根据前端可预览就宣称Python或SQLite持久化可用。
>
> 初次公开内容只限已有中文前端演示：知识课程、固定策略样例、合成K线和内存练习账户。原始data、references、.env、.git、.venv、日志和本机缓存不作为上传输入；BaoStock样本publishable=false，不上传或公开这批真实行情。保留frontend/LICENSE。
>
> 本轮先不要创建付费资源、购买服务、创建凭证、提交/推送Git、上传项目或发布站点。先返回实际支持范围、必须修改的最小文件列表、准确构建/启动参数、拟上传范围与预计费用；将方案和能力证据保存到docs/deployment-validation.md。遇到需要登录、授权、上传或发布的步骤明确停在该操作前，不能写成已完成。
>
> 若后续获得明确发布授权，部署后需分别验证：匿名HTTPS访问、/到/zh、八个页面、MDX深层刷新、非法语言/路径404、favicon与样式资源、帮助页Pagefind实际检索、移动端、以及真实站点origin到API的请求。记录真实链接、时间、构建日志及脱敏截图。scripts/check_deployment.py只能提供HTTP冒烟证据，不能替代这些交互和持久化检查。

## 需要保存的结果

| 项目 | 所需证据 |
| --- | --- |
| 能力来源 | 实际工具描述或官方文档URL，区分“声明支持”和“已实测” |
| 运行方案 | 前端根目录、Node/pnpm版本、安装/构建/启动参数、端口与环境变量 |
| 数据边界 | 上传输入清单，明确无本地原始金融数据和凭证 |
| 费用 | 免费额度/期限/限制的实际来源；未知不写免费 |
| 发布后验收 | 公开URL、无痕访问、路由/搜索/移动端/API证据 |

若Sites不支持现有Next应用导入，先记录事实并提出最小调整方案。没有用户确认时，不重写前端、不用外链壳冒充完整Sites应用，也不把其他托管地址直接当成赛事交付。
