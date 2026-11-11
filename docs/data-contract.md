# 后端数据契约草案

- 版本：0.1-draft，2026-11-11，Codex整理。
- 范围：S10a内部字段约定，供后端骨架与后续数据、交易实现对齐。
- 状态：**草案，未正式冻结**。S03已验证BaoStock小样本字段和交易日历；公开展示/再分发许可、S04运行/部署路线及团队复核仍待完成。本文的JSON均为人工构造的格式样例，不是真实行情或接口执行结果。

## 1. 当前边界

本轮后端基础仅建设以下入口，实际字段、返回码及验收以运行服务的OpenAPI和后端验收记录为准：

| 入口 | 用途 | 不能据此推断的能力 |
| --- | --- | --- |
| GET /api/v1/health | 检查API进程是否可响应 | 不代表数据、交易引擎或数据库已就绪 |
| GET /api/v1/capabilities | 列出实际可用能力和未实现模块 | 未实现能力必须明确标记，不能以空列表冒充成功查询 |
| OpenAPI / API文档 | 核对当前已注册接口 | 本文列出的未来接口不因此自动成为可调用接口 |

下文所有行情、研究、训练和记录接口均为**待实现草案**。前端仍使用原有演示数据，未接这些业务API；不提供真实行情、持久化账户、正式回测或实时交易。

## 2. 通用字段

| 字段或类型 | 草案约定 |
| --- | --- |
| 路径与命名 | API前缀 /api/v1，JSON字段snake_case；前端展示名称不充当稳定标识 |
| 金额 | CNY十进制字符串，账本金额固定两位，例如 "100000.00"；服务端用整数分或Decimal，禁止JSON浮点数入账 |
| 价格 | 正十进制字符串，不使用科学计数法；保留证券最小价格单位精度，A股样例两位。不能提前把所有未来品种四舍五入到分 |
| 数量 | 安全范围内的非负整数，单位为股；下单要求正整数并由执行规则校验整手。ETF等品种不自动获得支持 |
| 成交额、成交量 | turnover为CNY十进制字符串，volume为股数整数；不把“手”“万元”直接当标准单位 |
| 日期 | YYYY-MM-DD，交易日由指定calendar_version解释，交易所时区Asia/Shanghai；不将日期转换成UTC零点后再推算交易日 |
| 时间戳 | RFC3339带时区，服务端事件与采集时间统一UTC，例如2026-11-11T00:00:00Z；区分业务发生时间与系统处理时间 |
| 比率与评分 | 有限JSON数值；比率以1表示100%，score范围由score_version声明；NaN/Infinity非法，展示舍入不改变保存值 |
| 标识 | symbol使用交易所限定形式，例如SSE:600000；code可另供展示。dataset_id、session_id、run_id、order_id为不透明标识 |
| 无效值 | value为null且reason_code非空；合法0保留为0。缺行情不生成零价K线、不借用另一证券或未来价格 |
| 版本 | 数据、日历、复权、因子、评分、执行与代码版本分别保存；版本内容一旦用于实验不可原地覆盖 |
| 分页 | items与next_cursor；默认/最大条数和日期区间上限在实现时冻结。不能用当前上市名单替代历史股票池 |

示例：因子预热不足时返回下列对象，不能显示为“得分0”：

~~~json
{"factor_id":"ma20_to_ma60","value":null,"reason_code":"INSUFFICIENT_HISTORY","required_bars":60,"available_bars":20}
~~~

## 3. 数据来源与行情模式

所有含行情、候选或绩效的响应携带data_context。mode仅取demo、replay、live：demo表示合成或人工格式样例，replay表示具备来源与版本的历史回放，live表示已实现并披露延迟的实时能力。当前不得输出live。

~~~json
{
  "data_context": {
    "mode": "demo",
    "dataset_id": "synthetic-fixture",
    "dataset_version": "fixture-v1",
    "source_id": "internal-example",
    "source_name": "人工构造的契约样例",
    "generated_at": "2026-11-11T00:00:00Z",
    "fetched_at": null,
    "fetched_at_reason": "SYNTHETIC_DATA",
    "as_of_date": "2026-11-10",
    "timezone": "Asia/Shanghai",
    "calendar_version": "fixture-calendar-v1",
    "price_basis": "unadjusted",
    "quality_status": "example_only",
    "limitations": ["非真实行情", "不用于绩效结论"]
  }
}
~~~

真实数据版本另保存source_url、采集时间、文件校验摘要、覆盖范围、数据使用条件及展示/再分发结论。未知许可不得写成允许；下载成功不等于获准公开。来源只返回修订历史时应标记“基于下载版本重建”，不能声称当时原样数据。

S03已验证的BaoStock原始字段映射见[来源与字段记录](data-source-validation.md)：volume为股、amount为CNY元，adjustflag=3为不复权，tradestatus与isST为逐日状态，日历包含全部自然日。原始CSV价格/量额仍保存为字符串；preclose在除权日可能是交易所参考值，不强制等于前一条close。采样CLI没有实现这里的标准业务响应或代码转换；涨跌停和权益事件仍缺失，publishable与execution_ready均为false。

待实现入口：GET /datasets、GET /market/status、GET /stocks、GET /stocks/{symbol}/bars。研究接口可指定from/to；训练页面只能使用会话专属bars接口，不能复用研究接口查询未来。

日线记录格式样例：

~~~json
{
  "symbol": "SSE:600000",
  "date": "2026-11-10",
  "open": "10.00",
  "high": "10.50",
  "low": "9.80",
  "close": "10.20",
  "volume": 100000,
  "turnover": "1010000.00",
  "trading_status": "normal",
  "limit_up": null,
  "limit_down": null,
  "unavailable_reason": "PRICE_LIMITS_NOT_PROVIDED"
}
~~~

这是可绘图记录示例，**不足以判定可成交**。交易引擎遇缺失成交限制、未知停牌、未知权益事件或不支持板块时，拒绝交易或缩小已验范围，不能默认正常。研究复权序列和交易未复权价格分开声明并绑定版本。

## 4. 候选与研究结果

待实现：GET /strategies、POST /screenings、POST /backtests、GET /runs/{id}及signals/equity/trades子资源、GET /experiments。

筛选请求必须包含dataset_id、dataset_version、as_of_date、strategy_id、strategy_version及参数快照。结果包含run_id、status、data_context、factor_version、score_version、股票池版本和有效样本数。正式排名最低样本门槛按计划书执行，不足时返回明确数据不足状态；六只前端样例不能据此声明全市场排名。

候选样例片段：

~~~json
{
  "symbol": "SSE:600000",
  "signal_date": "2026-11-10",
  "score": null,
  "reason_code": "INSUFFICIENT_UNIVERSE",
  "rank": null,
  "factors": [{"factor_id":"ma20_to_ma60","value":0.02,"valid":true,"reason_code":null}],
  "contributions": [],
  "limitations": ["格式样例，不代表已计算结果"]
}
~~~

任务status拟取queued、running、succeeded、failed、cancelled；未计算指标为null并附原因。固定绩效不得标为新计算。回测需保存execution_version、初始资金、费用参数、数据/策略/代码版本；训练与回测共用同一execution实现。t日收盘信号最早在规则允许的下一交易日开盘执行，不能以同一收盘价成交。

## 5. 训练、订单与账户

以下为目标接口，不是本轮已实现功能：

| 方法与路径 | 请求要点 | 响应要点 |
| --- | --- | --- |
| POST /training/sessions | 数据版本、起止日、初始资金、执行版本，随机起点时含seed | session_id、回放日期、账户、state_version |
| GET /training/sessions/{id} | 服务端认证的当前访客 | 账户、持仓批次、待处理订单、版本 |
| GET /training/sessions/{id}/bars | symbol、from；不允许客户端扩大回放上限 | 截断到current_date的行情，披露数据上下文 |
| POST /training/sessions/{id}/orders | symbol、side、quantity、state_version及Idempotency-Key | 待执行订单；不在提交时伪造成交 |
| POST /training/sessions/{id}/orders/{order_id}/cancel | state_version及Idempotency-Key | 仅撤销尚未执行订单 |
| POST /training/sessions/{id}/advance | state_version及Idempotency-Key | 下一交易日、成交/拒单、完整账户与新版本 |

创建会话请求样例：

~~~json
{"dataset_id":"synthetic-fixture","dataset_version":"fixture-v1","start_date":"2026-11-10","end_date":"2026-11-12","initial_cash":"100000.00","execution_version":"fixture-rules-v1"}
~~~

空仓账户响应片段：

~~~json
{
  "session_id": "session-example",
  "current_date": "2026-11-10",
  "state_version": 0,
  "status": "active",
  "account": {
    "currency": "CNY",
    "cash": "100000.00",
    "market_value": "0.00",
    "equity": "100000.00",
    "valuation_date": "2026-11-10",
    "positions": []
  },
  "orders": []
}
~~~

下单请求与待执行订单：

~~~json
{"symbol":"SSE:600000","side":"buy","quantity":100,"state_version":0}
~~~

~~~json
{"order_id":"order-example","symbol":"SSE:600000","side":"buy","quantity":100,"status":"pending","submitted_date":"2026-11-10","earliest_execution_date":"2026-11-11","state_version":1}
~~~

只有成功推进至下一交易日后才能生成fill；本例假设人工规则在10.00元成交100股、费用5.00元，期末收盘10.20元。独立核对：现金100000−1000−5=98995，市值100×10.20=1020，净资产100015。示例不声明真实费率或日历已验证。

~~~json
{
  "current_date": "2026-11-11",
  "state_version": 2,
  "fills": [{"fill_id":"fill-example","order_id":"order-example","symbol":"SSE:600000","side":"buy","quantity":100,"execution_date":"2026-11-11","execution_phase":"open","price":"10.00","gross_amount":"1000.00","fee":"5.00","cash_delta":"-1005.00"}],
  "rejections": [],
  "account": {
    "currency": "CNY",
    "cash": "98995.00",
    "market_value": "1020.00",
    "equity": "100015.00",
    "valuation_date": "2026-11-11",
    "positions": [{"symbol":"SSE:600000","quantity":100,"sellable_quantity":0,"cost_basis":"1005.00","valuation_price":"10.20","market_value":"1020.00","lots":[{"quantity":100,"acquired_date":"2026-11-11","sellable_from":"2026-11-12"}]}]
  }
}
~~~

拒单不是零价成交：放入rejections并含order_id、code、message；不生成price=0的fill。期末推进返回SESSION_ENDED，不改变日期或账户。T+1以已验证交易日历和持仓批次计算，不能简单加一天。

### 事务、幂等与访客隔离

这些是S13b/S14验收要求，目前未实现：

1. 服务端发放随机不可预测的访客凭证并验证会话归属；不相信请求体owner_id，不让知道session_id即获得访问权。具体cookie/令牌方式需结合S04部署路线冻结；生产凭证不得放URL或日志。
2. 幂等范围至少为访客、会话、操作类型、Idempotency-Key；同键同规范化载荷重试返回首次已提交响应，不能再次扣钱、下单或推进。
3. 先识别已完成的同键重试，再判断载荷中的旧state_version；否则成功重试会被误判冲突。同键不同载荷返回409 IDEMPOTENCY_CONFLICT。
4. 新操作携带旧版本返回409 STATE_VERSION_CONFLICT；前端重新读取并由用户决定，不自动换键重放。每个成功逻辑变更仅增加一个版本。
5. 账户、订单、成交、事件、幂等结果在同一事务内提交；异常完整回滚。并发操作通过版本比较和数据库约束只允许一次生效，重启后应能恢复。
6. 会话行情、指标和响应只含current_date及以前内容；不能先把未来数据传给浏览器再隐藏。研究接口存在可查询历史的范围，教学隔离不等于完整竞技防作弊。

## 6. 错误约定

建议统一结构如下；已实现骨架的实际结构以OpenAPI为准，业务错误码待模块实现后加入。

~~~json
{
  "error": {
    "code": "STATE_VERSION_CONFLICT",
    "message": "会话状态已更新，请重新读取后操作。",
    "details": [{"location":["body","state_version"],"code":"STALE_VERSION"}]
  },
  "request_id": "server-generated-request-id"
}
~~~

| HTTP状态 | 拟用错误码 | 含义 |
| --- | --- | --- |
| 400 / 422 | VALIDATION_ERROR | 无效参数、金额格式、日期、数量或区间 |
| 401 | UNAUTHENTICATED | 缺少或失效访客凭证 |
| 404 | NOT_FOUND | 资源不存在；不泄露其他访客资源是否存在 |
| 409 | STATE_VERSION_CONFLICT / IDEMPOTENCY_CONFLICT / SESSION_ENDED | 状态冲突，不能盲目自动重试 |
| 422 | INSUFFICIENT_DATA / MISSING_MARKET_DATA / UNSUPPORTED_RULE | 数据或规则不能支撑请求，明确拒绝 |
| 500 | INTERNAL_ERROR | 通用错误信息，详细诊断仅留服务端 |

details只给安全字段路径、代码和说明，不回显用户输入、请求头、凭证、文件绝对路径或堆栈。request_id只用于关联诊断，不是身份凭证。未知或未注册路径返回404，不返回虚构空业务结果。

当前基础的422仅返回body/query/path/header/cookie顶层来源，隐藏可能来自用户输入的嵌套键；上述state_version路径为未来冻结示例。CORS预检由标准中间件直接处理，OPTIONS使用标准文本响应，不附应用request_id，也不采用业务错误JSON。

## 7. 冻结前待确认

- B核实来源实际字段、复权、交易日历、停牌/涨跌停、权益事件与许可；决定哪些样本可做展示、哪些可做收益实验。
- A结合运行环境冻结CORS/访客凭证、保留时长、请求上限和幂等失效策略；数据源或部署未通过不宣称S10/S11全量完成。
- A/C复核金额取整、费用、成交时点、批次成本与共享execution；将上面的独立数值样例转为后端测试。
- 真实路由实现后更新Pydantic/OpenAPI与本契约，前端再据此接入。现有camelCase、数值价格和格式化字符串属于临时展示模型，不直接成为权威接口。

参考：[项目计划书第26节](../项目计划书.md)、[分步执行计划S10–S14](implementation-plan.md)、[前端临时交易实现](../frontend/src/lib/demo-execution.ts)、[前端演示数据](../frontend/src/lib/mock-data.ts)。
