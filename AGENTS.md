# QuantFlow AI 协作约定

适用于本仓库的团队成员与编码助手。以当前源码和用户最新要求为准；不把计划、目录或固定演示当作已实现功能。

## 开工与单次任务

- 开工先读根README、docs/implementation-plan.md和Git状态；领取依赖已满足的一项。一次只完成约定范围，超出半天先拆分。
- 保留其他人的未提交改动，不重置、清理或覆盖无关文件。参考仓库不作为业务工作目录。
- 成果保存本地后，记录文件、验收命令、实际结果和限制，再更新任务状态；未验收不写已完成。
- 不自动提交或推送；按用户已授权及团队确认的流程处理。未推送不宣称队友可取得，干净克隆复现另行验收。

## 当前架构与目录职责

- frontend：已有Next.js/Nextra中文演示原型。保留语言路由、MDX入口、_meta导航和主题集成，不无故换框架或新增语言。
- backend：已有FastAPI本地基础，HTTP仅health/capabilities与OpenAPI已实现；app/data已有BaoStock有界采样与离线质量检查，quant、execution、backtest、training与storage仍为占位，不假定已有业务API或数据库。
- 根data：本地金融数据与版本清单；根references：上游参考克隆；两者默认不提交。空目录不被Git保存。
- docs：赛事来源、字段协议、任务与验证；scripts：未来导入/启动/复现脚本。
- A先搭框架、接口与部署；B接数据质量和app/data；C接因子、模型和回测研究。实际人选待确认，共用execution或契约修改需另一成员复核。

## 页面与数据规范

- 默认蓝白浅色，布局简洁，一页突出一个主要任务，次要细节折叠；复用已有tokens和UI组件。
- 页面文案使用现有字典/内容组织，不因保留en字典就声称有英文站，不恢复模板登录或AI Demo。
- demo、历史replay、live明确区分，记录来源、时间、版本和状态。合成K线不能称真实历史或实时行情，固定结果不能称新计算或学习所得。
- 当前训练仅内存状态；S05–S09已完成前端演示修复，仍无真实行情、持久化和后端交易API，文档不将目标规则冒充当前功能。

## 量化与交易边界

- 正式因子、评分和执行函数放后端模块，Notebook调用同一实现。统一评分入口按契约维护，先规则基线后统计模型。
- 只使用当时可得数据；窗口不足/缺失返回无效原因，不以0伪装有效值；不以当前上市名单冒充完整历史股票池。
- 金额按分或Decimal计算，接口十进制字符串，日期语义和时区明确。回测与训练共用execution，不在React里长期复制权威引擎。
- t日收盘信号不能假设以同一收盘价成交；按冻结规则处理下一可成交时点、手续费、T+1、停牌、涨跌停和权益。不支持的规则明确拒绝或缩小范围。
- 状态变更使用事务、版本及幂等；训练行情由服务端截断到回放日；不同访客账户隔离。尚未实现时不可声称具备。
- 模型按日期划分数据，处理未来标签成熟及重叠；预处理仅训练期拟合；与规则基线使用同股票池、费用和执行条件，不承诺提高收益。

## 验证命令与完成条件

命令在frontend目录执行。当前依赖完整时可直接调用本地工具：

~~~powershell
node ./node_modules/eslint/bin/eslint.js .
node ./node_modules/typescript/bin/tsc --noEmit --incremental false
~~~

pnpm lint含--fix，只读审查不使用它。文档修改核对路径/链接/命令即可；金额、日期、交易和研究逻辑使用有独立期望值的样例验证。

路由、配置、依赖或阶段收口需完整构建；先停止同目录开发服务，再依次运行Next build、next-sitemap和Pagefind，或正常pnpm build。具体命令与8000/7000端口见frontend/README.md；直接Next build不自动运行postbuild。已有检查通过后无新改动/失败不重复全量构建。

启动前核对实际Node/pnpm版本；不删锁文件、不混用包管理器、不为消警告关闭信任策略。后端S11a已有Python3.12隔离环境；按backend/README.md使用requirements.lock约束安装。在backend运行.venv/Scripts/python.exe -m pytest、-m ruff check app tests和-m pip check。启动默认127.0.0.1:9000，前端仍不依赖Python；S11部署兼容验收待S04。

## 文件、来源与过程

- 不提交.env真实值、私密凭证、原始金融数据、node_modules、构建/缓存、数据库或日志；.env.example只能包含占位示例。根/data和/references排除不能扩成任意层级同名目录。
- 来源使用条件需记录；成功下载不等于获准公开再分发。保留frontend/LICENSE，上游skill是参考且可能过时，先读实际代码。
- 保留真实工具来源：只有实际Qoder过程才写Qoder开发证据；Codex检查/文档不得冒充Qoder生成，不补造截图或历史记录。
- Qoder Sites是待验证部署路线。本地构建、上游部署徽章或其他托管不能冒充赛事公开交付；不新增无证据的成功记录。
- 完成后更新docs/implementation-plan.md第7节；影响项目当前阶段时同步计划书，说明未完成部分。
