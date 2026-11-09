import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, rename, writeFile, chmod } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, isAbsolute } from 'node:path'
import { parseCodex, parseDeepSeek, parseDeepSeekAccount, parseWham, parseWorkBuddy, parseWorkBuddyName } from './core.js'
import { REGIONS, billingUrl } from './workbuddy-sites.js'
import { ensurePrivateDirectory } from './private-store.js'

export const inject = ['connection']
const API = '/api/quota-dashboard'
const ROOT = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'plugins', 'quota-dashboard')
const STORE = join(ROOT, 'accounts.json')
const USAGE_CACHE = join(ROOT, 'usage-cache.json')
const types = new Set(['workbuddy', 'codex-home', 'deepseek', 'deepseek-account'])
const reply = (value, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
const text = (value, length = 200) => String(value ?? '').slice(0, length)
const publicAccount = ({ id, label, accountName, type, codexHome, region, platformOrigin }) => ({ id, label, accountName: accountName || null, type, region: type === 'workbuddy' ? region || 'cn' : undefined, platformOrigin: type === 'deepseek-account' ? platformOrigin : undefined, codexHome: type === 'codex-home' ? codexHome : undefined, hasKey: type === 'deepseek' ? true : undefined })

async function load() {
  try {
    const data = JSON.parse((await readFile(STORE, 'utf8')).replace(/^\uFEFF/, ''))
    return Array.isArray(data.accounts) ? data.accounts.filter((item) => item && types.has(item.type) && typeof item.id === 'string') : []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}
async function save(accounts) {
  await ensurePrivateDirectory(ROOT)
  const temporary = join(ROOT, `${randomUUID()}.tmp`)
  await writeFile(temporary, JSON.stringify({ version: 1, accounts }), { mode: 0o600, flag: 'wx' })
  await chmod(temporary, 0o600)
  await rename(temporary, STORE)
  await chmod(STORE, 0o600)
}
async function loadUsageCache() {
  try {
    const data = JSON.parse((await readFile(USAGE_CACHE, 'utf8')).replace(/^\uFEFF/, ''))
    return Array.isArray(data.accounts) ? { accounts: data.accounts, refreshedAt: Number(data.refreshedAt) || null } : null
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null
    throw error
  }
}
async function saveUsageCache(accounts) {
  await ensurePrivateDirectory(ROOT)
  const snapshot = { version: 1, refreshedAt: Date.now(), accounts }
  const temporary = join(ROOT, `${randomUUID()}.usage.tmp`)
  await writeFile(temporary, JSON.stringify(snapshot), { mode: 0o600, flag: 'wx' })
  await chmod(temporary, 0o600)
  await rename(temporary, USAGE_CACHE)
  await chmod(USAGE_CACHE, 0o600)
  return snapshot
}
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('请发送 JSON 数据')
  const raw = await request.text()
  if (raw.length > 16384) throw new Error('提交内容过大')
  return JSON.parse(raw)
}
function validated(input) {
  if (!input || !types.has(input.type)) throw new Error('请选择账号类型')
  if (input.type === 'deepseek') throw new Error('DeepSeek API Key 账号已停止添加，请使用 DSH 登录账号')
  const label = text(input.label?.trim(), 60)
  if (input.type === 'workbuddy') {
    const cookie = text(input.cookie?.trim(), 8192)
    const userAgent = text(input.userAgent?.trim(), 512)
    if (!cookie || !userAgent || /[\r\n\x00-\x1f\x7f]/.test(cookie + userAgent)) throw new Error('请填写同一浏览器请求的 Cookie 与 User-Agent')
    if (input.region && !REGIONS[input.region]) throw new Error('请选择国内或国际站')
    return { label: label || 'WorkBuddy', type: input.type, region: input.region || 'cn', cookie, userAgent }
  }
  if (input.type === 'codex-home') {
    const codexHome = text(input.codexHome?.trim(), 512)
    const codexCommand = text(input.codexCommand?.trim() || 'codex', 512)
    if (codexHome && !isAbsolute(codexHome)) throw new Error('Codex 目录必须是绝对路径')
    if (!/^[\w.\\/: -]+$/.test(codexCommand)) throw new Error('Codex 可执行文件路径无效')
    return { label: label || 'Codex', type: input.type, codexHome, codexCommand }
  }
  const platformOrigin = text(input.platformOrigin?.trim() || 'https://platform.deepseek.com', 200).replace(/\/$/, '')
  if (platformOrigin !== 'https://platform.deepseek.com') throw new Error('DeepSeek 账号站点无效')
  return { label: label || 'DeepSeek DSH 账号', type: input.type, platformOrigin }
}
async function requestJson(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`服务返回 HTTP ${response.status}${response.status === 401 ? '，请重新登录' : ''}`)
  const raw = await response.text()
  if (raw.length > 300000) throw new Error('服务返回的数据过大')
  return JSON.parse(raw)
}
async function workbuddySummary(account) {
  const region = REGIONS[account.region || 'cn'] ?? REGIONS.cn
  const data = await requestJson(billingUrl(account.region || 'cn'), {
    method: 'POST', headers: { cookie: account.cookie, 'user-agent': account.userAgent, 'content-type': 'application/json', accept: 'application/json', origin: region.origin, referer: `${region.origin}/profile/plans-usage` }, body: '{}'
  })
  if (Number(data.code) !== 0) throw new Error(`WorkBuddy ${region.name}站未返回额度，请确认 Cookie 来自该站点`)
  return data
}
async function workbuddyName(account) {
  const region = REGIONS[account.region || 'cn'] ?? REGIONS.cn
  const data = await requestJson(`${region.origin}/console/accounts`, {
    headers: { cookie: account.cookie, 'user-agent': account.userAgent, accept: 'application/json', origin: region.origin, referer: `${region.origin}/profile/plans-usage` }
  })
  return parseWorkBuddyName(data)
}
async function workbuddy(account) {
  return parseWorkBuddy(await workbuddySummary(account))
}
async function workbuddyCheckin(account) {
  const region = REGIONS.cn
  const headers = { cookie: account.cookie, 'user-agent': account.userAgent, 'content-type': 'application/json', accept: 'application/json', origin: region.origin, referer: `${region.origin}/profile/plans-usage` }
  const status = await requestJson(`${region.origin}/v2/billing/meter/checkin-activity-status`, { method: 'POST', headers, body: '{}' })
  if (Number(status?.code) !== 0) throw new Error(text(status?.msg || '无法读取签到状态', 120))
  const state = status.data ?? {}
  if (!state.active) return { status: 'inactive', message: '活动未开放' }
  if (state.today_checked_in) return { status: 'already', message: '今日已签到', streak: Number(state.streak_days) || 0 }
  const claim = await requestJson(`${region.origin}/v2/billing/meter/daily-checkin`, { method: 'POST', headers, body: '{}' })
  if (Number(claim?.code) !== 0) throw new Error(text(claim?.msg || '签到失败', 120))
  return { status: 'signed', message: text(claim?.msg || '签到成功', 120), streak: Number(claim?.data?.streak_days ?? state.streak_days) || 0 }
}
async function deepseek(account) {
  const data = await requestJson('https://api.deepseek.com/user/balance', {
    headers: { authorization: `Bearer ${account.apiKey}`, accept: 'application/json' }
  })
  return parseDeepSeek(data)
}
/** Read the DeepSeek platform token that DSH itself signed in with, without modifying it. */
async function deepseekAccountToken() {
  const candidates = [join(process.env.DSH_HOME || join(homedir(), '.dsh'), '.credentials.yaml'), join(homedir(), '.dsh', '.credentials.yaml')]
  let source
  for (const candidate of candidates) {
    try { source = await readFile(candidate, 'utf8'); break }
    catch { /* try the next location */ }
  }
  if (!source) throw new Error('未找到 DSH 的 DeepSeek 登录记录，请先在 DSH 中登录 DeepSeek')
  const lines = source.split(/\r?\n/)
  const start = lines.findIndex((line) => /^\s{2}deepseek-account-platform\/default\s*:/.test(line))
  if (start === -1) throw new Error('DSH 尚未登录 DeepSeek 账号，请先在 DSH 中登录')
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s{2}\S/.test(lines[i])) break
    const match = /^\s+token\s*:\s*(\S+)\s*$/.exec(lines[i])
    if (match) return match[1]
  }
  throw new Error('DSH 的 DeepSeek 登录记录缺少令牌，请重新登录')
}
async function deepseekAccount() {
  const token = await deepseekAccountToken()
  const data = await requestJson('https://platform.deepseek.com/api/v0/users/get_user_summary', {
    headers: { 'x-dsh-auth-token': token, accept: 'application/json' }
  })
  return parseDeepSeekAccount(data)
}
async function localCodexTokenUsage(accessToken, accountId) {
  const data = await requestJson('https://chatgpt.com/backend-api/wham/usage', {
    headers: { authorization: `Bearer ${accessToken}`, 'chatgpt-account-id': accountId, accept: 'application/json', origin: 'https://chatgpt.com', referer: 'https://chatgpt.com/codex/settings/usage' }
  })
  return parseWham(data)
}
function codexHome(account, identityOnly = false) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env }
    if (account.codexHome) env.CODEX_HOME = account.codexHome
    const processHandle = spawn(account.codexCommand || 'codex', ['app-server'], { env, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] })
    let buffer = '', settled = false
    const finish = (error, result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      processHandle.kill()
      if (error) reject(error)
      else resolve(result)
    }
    const timer = setTimeout(() => finish(new Error('Codex app-server 读取超时')), 15000)
    const send = (value) => processHandle.stdin.write(`${JSON.stringify(value)}\n`)
    processHandle.on('error', (error) => finish(new Error(`无法启动 Codex CLI：${error.code || '未知错误'}`)))
    processHandle.on('exit', () => finish(new Error('Codex app-server 提前退出；请检查登录状态')))
    processHandle.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      if (buffer.length > 200000) return finish(new Error('Codex app-server 数据过大'))
      let end
      while ((end = buffer.indexOf('\n')) !== -1 && !settled) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1)
        let message
        try { message = JSON.parse(line) } catch { continue }
        if (message.id === 1) {
          if (message.error) return finish(new Error('Codex 初始化失败'))
          send({ method: 'initialized', params: {} })
          send({ id: 2, method: 'account/read', params: { refreshToken: false } })
          if (!identityOnly) send({ id: 3, method: 'account/rateLimits/read', params: {} })
        }
        if (message.id === 2) {
          if (message.error) return finish(new Error('Codex 没有返回账号信息，请检查登录状态'))
          if (message.result?.account?.type === 'apiKey') return finish(new Error('API Key 登录没有 Codex 订阅额度'))
          if (identityOnly) {
            const accountName = text(message.result?.account?.email || message.result?.account?.workspaceName, 120)
            return accountName ? finish(null, accountName) : finish(new Error('Codex 未返回实际账号名'))
          }
        }
        if (message.id === 3) {
          if (message.error) return finish(new Error('Codex 没有返回额度，请检查登录状态'))
          try { finish(null, parseCodex(message.result)) } catch (error) { finish(error) }
        }
      }
    })
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'dsh_quota_dashboard', title: 'DSH Quota Dashboard', version: '0.1.5' } } })
  })
}
function jwtAccountName(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'))
    return text(payload.email || payload.name || payload['https://api.openai.com/profile']?.email, 120) || null
  } catch { return null }
}
async function codexAccountName(account) {
  try { return await codexHome(account, true) }
  catch (appServerError) {
    const directory = account.codexHome || process.env.CODEX_HOME || join(homedir(), '.codex')
    try {
      const auth = JSON.parse(await readFile(join(directory, 'auth.json'), 'utf8'))
      const accountName = jwtAccountName(auth?.tokens?.id_token) || jwtAccountName(auth?.tokens?.access_token)
      if (accountName) return accountName
    } catch { /* preserve the app-server identity error */ }
    throw appServerError
  }
}
export async function accountNameOnAdd(account) {
  if (account.type === 'workbuddy') return workbuddyName(account)
  if (account.type === 'codex-home') return codexAccountName(account)
  return null
}
async function localCodex(account) {
  try { return await codexHome(account) }
  catch (appServerError) {
    const directory = account.codexHome || process.env.CODEX_HOME || join(homedir(), '.codex')
    let auth
    try { auth = JSON.parse(await readFile(join(directory, 'auth.json'), 'utf8')) }
    catch { throw appServerError }
    const accessToken = auth?.tokens?.access_token
    const accountId = auth?.tokens?.account_id
    if (typeof accessToken !== 'string' || typeof accountId !== 'string' || !accessToken || !accountId) throw appServerError
    return localCodexTokenUsage(accessToken, accountId)
  }
}
async function usage(account) {
  try {
    const data = account.type === 'workbuddy' ? await workbuddy(account)
      : account.type === 'deepseek' ? await deepseek(account)
        : account.type === 'deepseek-account' ? await deepseekAccount(account)
          : await localCodex(account)
    return { ...publicAccount(account), status: 'ok', fetchedAt: Date.now(), data }
  } catch (error) {
    return { ...publicAccount(account), status: 'error', fetchedAt: Date.now(), error: text(error.message, 180) }
  }
}
export function apply(ctx) {
  let mutation = Promise.resolve()
  const serial = (task) => {
    const next = mutation.then(task)
    mutation = next.catch(() => {})
    return next
  }
  ctx.effect(() => ctx.connection.fetch.register({
    path: `${API}/accounts`, methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: async (request) => {
      try {
        if (request.method === 'GET') return reply({ accounts: (await load()).map(publicAccount) })
        return await serial(async () => {
          const input = await body(request)
          const accounts = await load()
          if (input.action === 'remove') {
            if (typeof input.id !== 'string' || !accounts.some((item) => item.id === input.id)) return reply({ error: '账号不存在' }, 404)
            await save(accounts.filter((item) => item.id !== input.id))
          } else {
            if (accounts.length >= 32) return reply({ error: '最多添加 32 个账号' }, 400)
            const account = { ...validated(input), id: randomUUID() }
            const accountName = await accountNameOnAdd(account)
            accounts.push({ ...account, ...(accountName ? { accountName } : {}) })
            await save(accounts)
          }
          return reply({ accounts: (await load()).map(publicAccount) })
        })
      } catch (error) { return reply({ error: text(error.message, 180) }, 400) }
    }
  }), 'quota-dashboard: accounts')
  ctx.effect(() => ctx.connection.fetch.register({
    path: `${API}/usage`, methods: ['GET'], requestBody: 'buffered',
    fetch: async () => {
      try {
        const cached = await loadUsageCache()
        if (cached) return reply(cached)
        return reply({ accounts: (await load()).map((account) => ({ ...publicAccount(account), status: 'empty', fetchedAt: null })), refreshedAt: null })
      } catch { return reply({ error: '读取额度缓存失败' }, 500) }
    }
  }), 'quota-dashboard: cached usage')
  ctx.effect(() => ctx.connection.fetch.register({
    path: `${API}/usage/refresh`, methods: ['POST'], requestBody: 'buffered',
    fetch: async () => serial(async () => {
      try { return reply(await saveUsageCache(await Promise.all((await load()).map(usage)))) }
      catch { return reply({ error: '刷新额度失败' }, 500) }
    })
  }), 'quota-dashboard: refresh usage')
  ctx.effect(() => ctx.connection.fetch.register({
    path: `${API}/workbuddy/checkin`, methods: ['POST'], requestBody: 'buffered',
    fetch: async () => serial(async () => {
      const accounts = (await load()).filter((account) => account.type === 'workbuddy' && account.region !== 'global')
      if (accounts.length === 0) return reply({ error: '没有可签到的 WorkBuddy 国内版账号' }, 404)
      const results = []
      for (const account of accounts) {
        try { results.push({ id: account.id, ...await workbuddyCheckin(account) }) }
        catch (error) { results.push({ id: account.id, status: 'failed', message: text(error.message, 120) }) }
      }
      return reply({ results })
    })
  }), 'quota-dashboard: workbuddy checkin')
}
