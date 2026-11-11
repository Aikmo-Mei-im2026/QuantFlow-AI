export interface FactorDetail {
  name: string
  value: string
  std: number
  category: string
  contribution: number
}

export interface Candidate {
  code: string
  name: string
  industry: string
  score: number
  reason: string
  risk: string
  contributions: { label: string, score: number, weight: number, value: number }[]
  factors: FactorDetail[]
}

type CandidateInput = Omit<Candidate, 'score' | 'contributions' | 'factors'> & { factors: Omit<FactorDetail, 'contribution'>[] }

export const demoTrendWeights: Readonly<Record<string, number>> = Object.freeze({
  趋势: 0.35,
  动量: 0.20,
  量价: 0.20,
  流动性: 0.10,
  风险控制: 0.15,
})

/** Fixed illustrative standard scores, not a historical cross-sectional calculation. */
export function scoreDemoCandidate(input: CandidateInput): Candidate {
  if (input.factors.some(f => !Object.hasOwn(demoTrendWeights, f.category) || !Number.isFinite(f.std) || f.std < 0 || f.std > 100)) {
    throw new Error('演示评分含未知类别或无效标准化分')
  }
  const contributions = Object.entries(demoTrendWeights).map(([label, weight]) => {
    const members = input.factors.filter(f => f.category === label)
    if (!members.length) {
      throw new Error(`演示评分缺少类别：${label}`)
    }
    const score = members.reduce((sum, f) => sum + f.std, 0) / members.length
    return { label, score, weight, value: score * weight }
  })
  const factors = input.factors.map(f => ({
    ...f,
    contribution: f.std * demoTrendWeights[f.category] / input.factors.filter(item => item.category === f.category).length,
  }))
  return { ...input, factors, contributions, score: factors.reduce((sum, f) => sum + f.contribution, 0) }
}

const candidateInputs: CandidateInput[] = [
  {
    code: '600519',
    name: '贵州茅台',
    industry: '食品饮料',
    reason: '均线多头排列，中期动量居前，流动性充裕',
    risk: '波动较低',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.042', std: 74.2, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.018', std: 68.9, category: '趋势' },
      { name: '5 日收益率', value: '0.031', std: 71.4, category: '动量' },
      { name: '20 日收益率', value: '0.076', std: 75.1, category: '动量' },
      { name: '成交量比值（方向映射）', value: '1.62', std: 63.5, category: '量价' },
      { name: '价量变化相关性', value: '0.41', std: 58.3, category: '量价' },
      { name: '平均成交额（20 日）', value: '4.85×10⁹ 元', std: 85.0, category: '流动性' },
      { name: 'ATR14 比例', value: '0.021', std: 74.2, category: '风险控制' },
    ],
  },
  {
    code: '300750',
    name: '宁德时代',
    industry: '电力设备',
    reason: '近 5 日放量上涨，动量因子显著为正',
    risk: '波动较高',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.027', std: 63.1, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.021', std: 69.8, category: '趋势' },
      { name: '5 日收益率', value: '0.058', std: 81.2, category: '动量' },
      { name: '20 日收益率', value: '0.084', std: 78.4, category: '动量' },
      { name: '成交量比值（方向映射）', value: '2.11', std: 76.5, category: '量价' },
      { name: '价量变化相关性', value: '0.53', std: 64.9, category: '量价' },
      { name: '平均成交额（20 日）', value: '6.12×10⁹ 元', std: 82.3, category: '流动性' },
      { name: 'ATR14 比例', value: '0.031', std: 55.8, category: '风险控制' },
    ],
  },
  {
    code: '000858',
    name: '五粮液',
    industry: '食品饮料',
    reason: '趋势与流动性稳健，回撤风险相对可控',
    risk: '波动较低',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.035', std: 72.3, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.014', std: 66.1, category: '趋势' },
      { name: '5 日收益率', value: '0.022', std: 64.7, category: '动量' },
      { name: '20 日收益率', value: '0.049', std: 66.3, category: '动量' },
      { name: '成交量比值（方向映射）', value: '1.28', std: 57.2, category: '量价' },
      { name: '价量变化相关性', value: '0.35', std: 55.9, category: '量价' },
      { name: '平均成交额（20 日）', value: '3.42×10⁹ 元', std: 79.6, category: '流动性' },
      { name: 'ATR14 比例', value: '0.023', std: 71.9, category: '风险控制' },
    ],
  },
  {
    code: '002594',
    name: '比亚迪',
    industry: '汽车',
    reason: '中期动量靠前，量价配合较优',
    risk: '波动中等',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.031', std: 70.4, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.016', std: 67.2, category: '趋势' },
      { name: '5 日收益率', value: '0.038', std: 73.1, category: '动量' },
      { name: '20 日收益率', value: '0.067', std: 72.6, category: '动量' },
      { name: '成交量比值（方向映射）', value: '1.87', std: 70.3, category: '量价' },
      { name: '价量变化相关性', value: '0.46', std: 61.7, category: '量价' },
      { name: '平均成交额（20 日）', value: '5.06×10⁹ 元', std: 76.5, category: '流动性' },
      { name: 'ATR14 比例', value: '0.028', std: 58.6, category: '风险控制' },
    ],
  },
  {
    code: '600036',
    name: '招商银行',
    industry: '银行',
    reason: '波动风险低，流动性稳定',
    risk: '波动较低',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.012', std: 58.7, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.006', std: 55.4, category: '趋势' },
      { name: '5 日收益率', value: '0.011', std: 54.9, category: '动量' },
      { name: '20 日收益率', value: '0.028', std: 57.1, category: '动量' },
      { name: '成交量比值（方向映射）', value: '0.94', std: 48.2, category: '量价' },
      { name: '价量变化相关性', value: '0.22', std: 50.6, category: '量价' },
      { name: '平均成交额（20 日）', value: '2.98×10⁹ 元', std: 78.1, category: '流动性' },
      { name: 'ATR14 比例', value: '0.016', std: 80.5, category: '风险控制' },
    ],
  },
  {
    code: '601318',
    name: '中国平安',
    industry: '非银金融',
    reason: '风险控制得分高，趋势修复中',
    risk: '波动较低',
    factors: [
      { name: '均线相对位置 MA20/MA60−1', value: '0.009', std: 56.2, category: '趋势' },
      { name: '均线变化率 MA20/MA20(t−5)−1', value: '0.005', std: 54.1, category: '趋势' },
      { name: '5 日收益率', value: '0.009', std: 53.6, category: '动量' },
      { name: '20 日收益率', value: '0.021', std: 54.8, category: '动量' },
      { name: '成交量比值（方向映射）', value: '0.88', std: 47.5, category: '量价' },
      { name: '价量变化相关性', value: '0.19', std: 49.2, category: '量价' },
      { name: '平均成交额（20 日）', value: '2.61×10⁹ 元', std: 75.8, category: '流动性' },
      { name: 'ATR14 比例', value: '0.018', std: 77.4, category: '风险控制' },
    ],
  },
]

export const mockCandidates: Candidate[] = candidateInputs.map(scoreDemoCandidate).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))

export const mockSymbols = [
  { code: '600519', name: '贵州茅台', close: 1521.8 },
  { code: '000858', name: '五粮液', close: 148.2 },
  { code: '300750', name: '宁德时代', close: 246.5 },
  { code: '002594', name: '比亚迪', close: 256.4 },
  { code: '600036', name: '招商银行', close: 36.8 },
  { code: '601318', name: '中国平安', close: 52.1 },
]

export interface Trade {
  time: string
  code: string
  side: 'buy' | 'sell'
  price: number
  qty: number
  fee: number
  status: 'filled' | 'rejected'
  reason: string
}

export const mockTrades: Trade[] = [
  { time: '2026-09-25 09:31', code: '600519', side: 'buy', price: 1521.8, qty: 300, fee: 136.96, status: 'filled', reason: '开盘成交（+5bp 滑点）' },
  { time: '2026-09-25 09:31', code: '000858', side: 'buy', price: 148.35, qty: 500, fee: 22.25, status: 'filled', reason: '开盘成交（+5bp 滑点）' },
  { time: '2026-09-25 09:30', code: '300750', side: 'buy', price: 0, qty: 600, fee: 0, status: 'rejected', reason: '开盘涨停，拒绝买入' },
  { time: '2026-09-29 09:31', code: '002594', side: 'sell', price: 256.4, qty: 400, fee: 30.77, status: 'filled', reason: '开盘成交（−5bp 滑点）' },
  { time: '2026-09-29 09:30', code: '601318', side: 'sell', price: 0, qty: 300, fee: 0, status: 'rejected', reason: 'T+1：当日新增持仓不可卖出' },
]

export const mockEquity = {
  dates: [
    '2025-10-08',
    '2025-11-07',
    '2025-12-05',
    '2026-01-09',
    '2026-02-06',
    '2026-03-06',
    '2026-04-03',
    '2026-05-08',
    '2026-06-05',
    '2026-07-03',
    '2026-08-07',
    '2026-09-04',
    '2026-09-30',
  ],
  nav: [
    100000,
    101240,
    102870,
    101180,
    103650,
    105210,
    104330,
    106480,
    105120,
    106890,
    108340,
    106720,
    105320,
  ],
  benchmark: [
    100000,
    100680,
    102040,
    101520,
    102890,
    104110,
    103250,
    104960,
    104410,
    105430,
    106020,
    104580,
    103890,
  ],
}

export const mockLabSummary = {
  totalReturn: `+${((mockEquity.nav[mockEquity.nav.length - 1] / mockEquity.nav[0] - 1) * 100).toFixed(2)}%`,
  maxDrawdown: '未提供',
  turnover: '未提供',
}

export interface Candle {
  date: string
  open: number
  high: number
  low: number
  close: number
  vol: number
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Synthetic weekdays for a demo only; this is not an exchange trading calendar.
export const mockReplayDates: string[] = (() => {
  const dates: string[] = []
  const day = new Date('2026-08-03T00:00:00Z')
  while (dates.length < 42) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) {
      dates.push(day.toISOString().slice(0, 10))
    }
    day.setUTCDate(day.getUTCDate() + 1)
  }
  return dates
})()

export const mockCandlesBySymbol: Record<string, Candle[]> = Object.fromEntries(
  mockSymbols.map((symbol, index) => {
    const rnd = seededRandom(42 + index * 97)
    let close = symbol.close
    const candles = mockReplayDates.map(date => {
      const open = close * (1 + (rnd() - 0.5) * 0.012)
      const nextClose = close * (1 + (rnd() - 0.46) * 0.035)
      const candle = {
        date,
        open: Number(open.toFixed(2)),
        high: Number((Math.max(open, nextClose) * (1 + rnd() * 0.012)).toFixed(2)),
        low: Number((Math.min(open, nextClose) * (1 - rnd() * 0.012)).toFixed(2)),
        close: Number(nextClose.toFixed(2)),
        vol: Math.round(2_800_000 + rnd() * 6_500_000),
      }
      close = candle.close
      return candle
    })
    return [symbol.code, candles]
  }),
)

export const mockCandles: Candle[] = mockCandlesBySymbol[mockSymbols[0].code]

export interface Position {
  code: string
  name: string
  qty: number
  cost: number
  sellable: number
}

export const mockPositions: Position[] = []

export interface Order {
  id: string
  code: string
  side: 'buy' | 'sell'
  qty: number
  status: 'pending' | 'filled' | 'rejected'
  time: string
  reason?: string
}

export const mockInitialOrders: Order[] = []

export const mockInitialFills: Trade[] = []

export interface Experiment {
  id: string
  name: string
  type: 'screening' | 'backtest' | 'training'
  range: string
  time: string
  status: 'running' | 'succeeded' | 'failed' | 'interrupted'
  version: string
  params: string
  result: string
}

export const mockExperiments: Experiment[] = [
  {
    id: 'EXP-0012',
    name: '趋势型候选 · 2026-09-30',
    type: 'screening',
    range: '2026-09-30',
    time: '2026-10-01 09:12',
    status: 'succeeded',
    version: 'demo-v1',
    params: '趋势型权重：趋势 35 / 动量 20 / 量价 20 / 流动性 10 / 风险 15',
    result: '6 只固定因子样例；仅演示加权评分，未执行历史截面过滤',
  },
  {
    id: 'EXP-0011',
    name: '稳健型回测 · 一年',
    type: 'backtest',
    range: '2025-10-08 ~ 2026-09-30',
    time: '2026-10-01 10:05',
    status: 'succeeded',
    version: 'demo-v1',
    params: '稳健型；每周最后交易日调仓；佣金 0.03%（最低 5 元）',
    result: '13 个示意净值点首末变化 +5.32%；未提供日频回撤与换手率',
  },
  {
    id: 'EXP-0010',
    name: '短线动量 · 样本外验证',
    type: 'backtest',
    range: '2026-07-01 ~ 2026-09-30',
    time: '2026-10-02 14:22',
    status: 'failed',
    version: 'demo-v1',
    params: '短线动量型；每周调仓',
    result: '合格截面不足 20 只，未生成正式排名',
  },
  {
    id: 'TRN-0007',
    name: 'K 线训练记录格式样例',
    type: 'training',
    range: '2026-08-03 ~ 2026-09-30',
    time: '2026-10-03 16:40',
    status: 'succeeded',
    version: 'demo-v1',
    params: '初始资金 100,000 元；一会话一账户',
    result: '固定记录格式，非当前训练账户；实际操作仅保存在页面内存',
  },
  {
    id: 'EXP-0009',
    name: '波段型候选 · 2026-09-25',
    type: 'screening',
    range: '2026-09-25',
    time: '2026-09-26 09:02',
    status: 'interrupted',
    version: 'demo-v1',
    params: '波段型权重：趋势 25 / 动量 15 / 量价 20 / 流动性 10 / 风险 30',
    result: '运行中断；参数与数据版本已保留，可手动重跑',
  },
]
