export type LearningTopicId = 'candles' | 'volume' | 'etf' | 'risk'

export interface LearningLesson {
  id: LearningTopicId
  number: string
  title: string
  summary: string
  duration: string
  eyebrow: string
  headline: string
  intro: string
  diagramCaption: string
  sections: { title: string, body: string }[]
  takeaway: string
  misconception: string
  question: string
  answers: string[]
  correctAnswer: number
  explanation: string
  nextLabel: string
  nextPath: 'training' | 'lab'
}

export const learningCopy = {
  title: '知识学习室',
  subtitle: '先看懂市场，再开始练习。用一张图、一个例子，把每个概念拆开讲清楚。',
  label: '从基础开始',
  navigation: '选择学习主题',
  courseCount: '4 个入门主题',
  courseNote: '按顺序阅读，也可以从感兴趣的主题开始。',
  reading: '图文讲解',
  keyPoint: '记住这一点',
  misconception: '容易混淆的地方',
  question: '停一下，想一想',
  correct: '理解正确',
  incorrect: '再看一眼关键区别',
  quizNote: '练习仅用于自查理解，不保存答题或学习进度。',
  footer: '图解与数值均为原创教学示意，不是真实行情，也不是买卖建议。',
  diagram: {
    candleLabel: '两根示意日 K 线：阳线开盘10元、收盘12元，阴线开盘12元、收盘10元；两者最高13元、最低9元。',
    up: '阳线 · 收盘高于开盘',
    down: '阴线 · 收盘低于开盘',
    high: '最高 13',
    low: '最低 9',
    openTen: '开盘 10',
    closeTwelve: '收盘 12',
    openTwelve: '开盘 12',
    closeTen: '收盘 10',
    candleUnit: '示例价格 / 元',
    volumeTitle: '相同的上涨，成交量可能不同',
    volumeUp: '价格上涨 · 成交量增加',
    volumeDown: '价格上涨 · 成交量减少',
    volumeLabel: '价格与成交量教学图：左图价格和量柱一同增加；右图价格上涨而量柱降低。',
    price: '价格',
    volume: '成交量',
    time: '时间 →',
    active: '交易比前几日更活跃',
    quiet: '交易比前几日更清淡',
    etfTitle: '一份 ETF，连接一篮子资产',
    etfUnit: '你持有的 ETF 份额',
    etfSubtitle: '以股票指数 ETF 为例',
    etfBasket: '基金按规则配置资产',
    etfAssetA: '公司 A',
    etfAssetB: '公司 B',
    etfAssetC: '公司 C',
    etfMore: '其他成分',
    etfNote: '示意组成，不代表任何真实产品或固定权重。',
    etfExchange: '二级市场价格',
    etfNav: '基金份额净值',
    etfDifference: '可能存在折价或溢价',
    riskTitle: '下跌与回本，不是同一个百分比',
    start: '初始资产',
    after: '下跌之后',
    recover: '回到起点',
    loss: '下跌 20%',
    gain: '需要上涨 25%',
    formula: '(100 − 80) ÷ 80 = 25%',
  },
}

export const learningLessons: LearningLesson[] = [
  {
    id: 'candles',
    number: '01',
    title: '认识一根 K 线',
    summary: '四个价格，把一天画出来',
    duration: '约 3 分钟',
    eyebrow: '市场基础 / K 线',
    headline: '一根 K 线，记录四个价格。',
    intro: '日 K 线把一个交易日的开盘价、收盘价、最高价和最低价放在同一张图上。先认识它记录了什么，再讨论走势。',
    diagramCaption: '实体连接开盘和收盘，影线延伸到最高和最低价。图中采用本网站的红涨绿跌配色。',
    sections: [
      { title: '实体告诉你开盘与收盘的关系', body: '收盘高于开盘，画成阳线；收盘低于开盘，画成阴线。这里的“涨跌”比较的是当天开盘与收盘，不一定等于相对上一交易日收盘的涨跌。开盘与收盘接近时，实体可能很短。' },
      { title: '影线告诉你当天触及的范围', body: '上影线顶端是最高价，下影线底端是最低价。较长的上影线说明价格曾到达更高位置，但收盘没有保持在那里；它本身不能证明下一天一定会下跌。' },
      { title: '把周期放在一起看', body: '日 K 记录一天，周 K 记录一周。均线把一段时间的收盘价取平均，用来观察价格变化；不同周期呈现的细节不同，不能只凭一根 K 线决定买卖。' },
    ],
    takeaway: '先认清周期和四个价格，再看连续走势、成交量及背景信息。',
    misconception: '阳线不一定代表当天相对昨日收盘上涨。例如昨日收盘 13 元，今天开盘 10 元、收盘 12 元，仍是一根阳线，但比昨日收盘低。',
    question: '一只股票今天开盘 10 元、收盘 12 元，昨日收盘 13 元。哪句话正确？',
    answers: ['今天是一根阳线，但收盘低于昨日收盘', '阳线说明今天一定比昨日收盘涨了', '仅凭这一根 K 线，就能确定明天上涨'],
    correctAnswer: 0,
    explanation: '阳线比较当天开盘与收盘：12 > 10；日涨跌通常比较昨日收盘：12 < 13。比较的基准不同。',
    nextLabel: '去训练场观察 K 线',
    nextPath: 'training',
  },
  {
    id: 'volume',
    number: '02',
    title: '读懂量价关系',
    summary: '价格与成交量，一起观察',
    duration: '约 4 分钟',
    eyebrow: '市场观察 / 量价关系',
    headline: '看价格走向，也看交易有多活跃。',
    intro: '价格描述成交的位置，成交量描述一段时间内成交的数量。把它们放在一起，有助于提出更具体的问题，但不能直接给出未来涨跌的答案。',
    diagramCaption: '两组价格都在上涨，量柱却不同。“放量”和“缩量”都需要与此前可比的周期比较。',
    sections: [
      { title: '放量上涨：更活跃的交易伴随上涨', body: '价格上涨、成交量高于此前可比水平，通常称为放量上涨。它说明成交更活跃，但无法单凭成交量判断所有参与者的意图，更不意味着上涨一定延续。' },
      { title: '缩量上涨：上涨时成交相对减少', body: '价格上涨、成交量减少，称为缩量上涨。可能与卖盘减少、关注度变化等因素有关，需要结合价格位置与消息背景。不能简单把它判成“必然转跌”。' },
      { title: '下跌时也要对照观察', body: '放量下跌表示下跌同时成交增加；缩量下跌表示下跌同时成交减少。这些是现象描述。比较时应使用同一证券、相同时间长度，并留意停牌、异常事件等影响。' },
    ],
    takeaway: '量价关系用来观察和形成假设，假设还需要数据验证与风险控制。',
    misconception: '“成交量大”不等于“买的人比卖的人多”。每一笔成交都有买方和卖方，量柱记录成交数量，并不直接记录资金意图。',
    question: '看到“放量上涨”，最合理的理解是什么？',
    answers: ['明天必然继续上涨', '上涨伴随成交活跃，还需要结合背景验证', '这段时间只有买入，没有卖出'],
    correctAnswer: 1,
    explanation: '放量上涨描述已经发生的价格和成交量变化。它不是保证盈利的信号，也不能消除每笔交易同时存在买卖双方这一事实。',
    nextLabel: '去训练场对照量价',
    nextPath: 'training',
  },
  {
    id: 'etf',
    number: '03',
    title: '什么是 ETF',
    summary: '理解份额、资产与交易价格',
    duration: '约 4 分钟',
    eyebrow: '投资工具 / ETF',
    headline: '像股票一样交易的一种基金。',
    intro: 'ETF 通常指交易型开放式指数基金。投资者可以在证券交易所买卖基金份额；以股票指数 ETF 为例，基金按照规则持有一篮子资产，力争跟踪相应指数的表现。',
    diagramCaption: '买入 ETF 份额，相当于通过基金间接承担底层资产的收益与风险，不是直接持有每家公司的股票。',
    sections: [
      { title: '先看它跟踪什么', body: '有的 ETF 跟踪宽基股票指数，有的聚焦行业，还有债券、商品、跨境等类型。名字都带 ETF，资产构成、波动和交易规则可能相差很大。应先查看基金合同、招募说明书和风险说明。' },
      { title: '交易价格与净值可能不同', body: '二级市场价格由市场交易形成，基金份额净值反映基金资产净值折算到每一份的价值。两者可能存在折价或溢价；跟踪误差、费用、流动性及跨境市场时差也会影响体验。' },
      { title: '分散持有不等于没有风险', body: '一篮子资产可以分散部分个股风险，但行业集中或整个市场下跌仍可能带来损失。不同 ETF 的日内回转交易安排不同，不能默认全部 T+0；本网站目前的训练样例只支持所列主板股票，不支持 ETF 交易。' },
    ],
    takeaway: '认识一只 ETF，至少看清跟踪标的、持仓范围、费用、折溢价和适用交易规则。',
    misconception: 'ETF 不等于保本产品，也不是收益固定的“存款替代品”。本课程只是介绍概念，不推荐任何具体产品。',
    question: '关于 ETF，哪句话更准确？',
    answers: ['所有 ETF 都能当天买入、当天卖出', 'ETF 持有一篮子资产，所以不会亏损', '不同类型 ETF 的风险和交易规则需要分别核对'],
    correctAnswer: 2,
    explanation: 'ETF 是产品形式，不是统一的风险等级。底层资产与具体规则决定其特征，分散投资仍会面临市场等风险。',
    nextLabel: '去实验室认识策略与风险',
    nextPath: 'lab',
  },
  {
    id: 'risk',
    number: '04',
    title: '风险与交易规则',
    summary: '收益之外，还要看什么',
    duration: '约 3 分钟',
    eyebrow: '交易基础 / 风险意识',
    headline: '下单之前，先理解代价与限制。',
    intro: '看到上涨空间时，也要考虑可能损失多少、能否按预期成交，以及交易成本。模拟练习的价值，是把这些问题放进决策过程。',
    diagramCaption: '以 100 元示意资产计算，不考虑费用。下跌与回本使用不同的基数，因此百分比并不对称。',
    sections: [
      { title: '收益率不能独自说明风险', body: '两条策略最终收益相同，中途经历的亏损可能不同。回撤关注资产相对之前高点下降了多少，最大回撤是观察区间内最大的这种跌幅；历史最大回撤也不代表未来损失上限。' },
      { title: '提交委托不等于必然成交', body: '交易受到资金、可卖数量、停牌、涨跌停和成交条件等限制。A 股普通股票通常采用 T+1：当天买入的股票一般不能当天卖出。不同品种和特殊情形应核对适用规则。' },
      { title: '费用和成交时点会改变结果', body: '交易通常有佣金及适用税费，真实成交价也可能偏离参考价。在本网站的合成训练里，委托在下一样例日开盘尝试执行，只模拟披露的佣金和滑点，尚不覆盖完整市场规则。' },
    ],
    takeaway: '每次练习都问：能承担多少损失？何时可能成交？费用是多少？哪些情况无法交易？',
    misconception: '亏损 20% 后上涨 20%，资产只能从 80 回到 96；要回到 100，需要相对 80 上涨 25%。历史回测盈利同样不保证未来盈利。',
    question: '100 元资产下跌 20% 后，忽略费用，要回本需要上涨多少？',
    answers: ['20%', '25%', '只要价格上涨就已经回本'],
    correctAnswer: 1,
    explanation: '下跌后剩下 80 元，需赚回 20 元。20 ÷ 80 = 25%，回本收益率的基数是下跌后的资产。',
    nextLabel: '去训练场练习一笔委托',
    nextPath: 'training',
  },
]
