const number = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function parseWorkBuddy(payload) {
  if (!payload || Number(payload.code) !== 0 || !Array.isArray(payload.data?.Packages)) {
    throw new Error('WorkBuddy 返回了无法识别的额度数据')
  }
  const packages = payload.data.Packages.filter((item) =>
    String(item?.CapacityUnit ?? '').toLowerCase() === 'credits' &&
    number(item.CycleTotalCapacity) !== null && number(item.CycleRemainCapacity) !== null)
  if (packages.length === 0) throw new Error('WorkBuddy 未返回 credits 套餐')
  const total = packages.reduce((sum, item) => sum + number(item.CycleTotalCapacity), 0)
  const left = packages.reduce((sum, item) => sum + number(item.CycleRemainCapacity), 0)
  const reserved = packages.reduce((sum, item) => sum + (number(item.CycleFrozenCapacity) ?? 0), 0)
  const names = [...new Set(packages.map((item) => item.SubscriptionPackageName).filter((name) => typeof name === 'string' && name.trim()))]
  return { kind: 'workbuddy', total, left, reserved, plan: names.join('、') || null }
}

export function parseWorkBuddyName(payload) {
  if (!payload || Number(payload.code) !== 0 || !Array.isArray(payload.data?.accounts)) return null
  const accounts = payload.data.accounts
  const account = accounts.find((item) => item?.isCurrentOneIdPersonal === true || item?.isCurrentOneIdEnterprise === true) ?? (accounts.length === 1 ? accounts[0] : null)
  const nickname = typeof account?.nickname === 'string' ? account.nickname.trim() : ''
  return nickname ? nickname.slice(0, 60) : null
}

const timestamp = (value) => {
  const parsed = typeof value === 'number' ? (value > 1000000000000 ? value : value * 1000) : typeof value === 'string' ? Date.parse(value) : null
  return Number.isFinite(parsed) ? parsed : null
}

function windowsOf(limits) {
  if (!limits || typeof limits !== 'object') return []
  const entries = limits.rateLimitsByLimitId && typeof limits.rateLimitsByLimitId === 'object'
    ? Object.entries(limits.rateLimitsByLimitId)
    : [['codex', limits.rateLimits ?? limits]]
  const windows = []
  for (const [name, entry] of entries) {
    for (const field of ['primary', 'secondary']) {
      const value = entry?.[field] ?? entry?.rateLimit?.[field]
      if (!value) continue
      const used = number(value.usedPercent ?? value.used_percent)
      const minutes = number(value.windowDurationMins ?? (value.limit_window_seconds == null ? null : Number(value.limit_window_seconds) / 60))
      if (used === null) continue
      const resetAt = timestamp(value.resetsAt ?? value.reset_at)
      windows.push({ name, label: minutes == null ? field : minutes <= 360 ? `${Math.round(minutes / 60)} 小时` : minutes < 10080 ? `${Math.round(minutes / 1440)} 天` : `${Math.round(minutes / 10080)} 周`, leftPercent: Math.max(0, Math.min(100, 100 - used)), resetsAt: resetAt, minutes })
    }
  }
  return windows
}

function resetCreditsOf(data) {
  const source = data?.rateLimitResetCredits ?? data?.rate_limit_reset_credits
  if (!source || typeof source !== 'object') return null
  const available = (Array.isArray(source.credits) ? source.credits : []).filter((item) => !item?.status || item.status === 'available')
  const expirations = available.map((item) => timestamp(item?.expiresAt ?? item?.expires_at)).filter((value) => value !== null)
  const count = number(source.availableCount ?? source.available_count) ?? available.length
  return { count, expiresAt: expirations.length ? Math.min(...expirations) : null }
}

export function parseCodex(payload) {
  const data = payload?.rateLimits ? payload : payload?.result ?? payload
  const windows = windowsOf(data)
  if (windows.length === 0) throw new Error('Codex 未返回可用的额度窗口')
  const credits = data?.rateLimits?.credits ?? data?.credits ?? null
  return { kind: 'codex', windows, allowed: data?.ordinaryUsageAllowed ?? data?.rateLimits?.rateLimit?.allowed ?? true,
    credits: credits ? { balance: number(credits.balance), unlimited: credits.unlimited === true } : null,
    resetCredits: resetCreditsOf(data) }
}

export function parseDeepSeek(payload) {
  const infos = payload?.balance_infos
  if (typeof payload?.is_available !== 'boolean' || !Array.isArray(infos) || infos.length === 0) {
    throw new Error('DeepSeek 未返回余额信息')
  }
  const balances = infos.map((info) => {
    const currency = String(info?.currency ?? '').toUpperCase()
    const total = number(info?.total_balance)
    if (!['CNY', 'USD'].includes(currency) || total === null) throw new Error('DeepSeek 返回了无法识别的余额')
    return { currency, total, granted: number(info.granted_balance) ?? 0, toppedUp: number(info.topped_up_balance) ?? 0 }
  })
  return { kind: 'deepseek', available: payload.is_available, balances }
}

function walletsOf(list) {
  return (Array.isArray(list) ? list : []).map((wallet) => {
    const currency = String(wallet?.currency ?? '').toUpperCase()
    const value = number(wallet?.balance)
    if (!['CNY', 'USD'].includes(currency) || value === null) throw new Error('DeepSeek 返回了无法识别的余额')
    return { currency, total: value }
  })
}

/** Balance of the signed-in DeepSeek platform account read through DSH's own login. */
export function parseDeepSeekAccount(payload) {
  const body = payload?.data?.biz_data
  if (Number(payload?.code) !== 0 || Number(body?.biz_code ?? 0) !== 0) throw new Error('DeepSeek 账号未返回余额，请重新登录')
  const normal = walletsOf(body?.normal_wallets)
  if (normal.length === 0) throw new Error('DeepSeek 账号未返回余额')
  const bonus = walletsOf(body?.bonus_wallets)
  const spent = (Array.isArray(body?.total_costs) ? body.total_costs : []).map((cost) => ({ currency: String(cost?.currency ?? '').toUpperCase(), amount: number(cost?.amount) ?? 0 }))
  const balances = normal.map((wallet) => {
    const granted = bonus.filter((item) => item.currency === wallet.currency).reduce((sum, item) => sum + item.total, 0)
    const used = spent.filter((item) => item.currency === wallet.currency).reduce((sum, item) => sum + item.amount, 0)
    return { currency: wallet.currency, total: wallet.total, granted, toppedUp: Math.max(0, wallet.total + used - granted), used }
  })
  return { kind: 'deepseek', available: balances.some((wallet) => wallet.total > 0), balances }
}

export function parseWham(payload) {
  const rate = payload?.rate_limit
  if (!rate || typeof rate !== 'object') throw new Error('ChatGPT 未返回 Codex 限额')
  const windows = windowsOf({ rateLimits: {
    primary: rate.primary_window && { ...rate.primary_window, used_percent: rate.primary_window.used_percent },
    secondary: rate.secondary_window && { ...rate.secondary_window, used_percent: rate.secondary_window.used_percent }
  } })
  if (windows.length === 0) throw new Error('ChatGPT 未返回可用的额度窗口')
  const credits = payload.credits
  return { kind: 'codex', windows, allowed: rate.allowed !== false && rate.limit_reached !== true,
    credits: credits ? { balance: number(credits.balance), unlimited: credits.unlimited === true } : null,
    resetCredits: resetCreditsOf(payload) }
}
