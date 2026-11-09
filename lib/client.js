window.__ModuleLoader__.load({
  id: 'dsh-quota-dashboard',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useCallback } = React
    const API = 'api/quota-dashboard/'
    const url = (path) => new URL(API + path, document.baseURI).href
    const palette = { ink: 'var(--dsh-text-primary, #e7e9ef)', muted: 'var(--dsh-text-secondary, #9ca4b5)', panel: 'var(--dsh-surface, #202632)', border: 'var(--dsh-border, #41495a)', blue: '#657eff', teal: '#13bda1', red: '#ec7981' }
    const row = { display: 'flex', alignItems: 'center', gap: 10 }
    const button = { color: palette.ink, background: 'transparent', border: `1px solid ${palette.border}`, borderRadius: 9, padding: '8px 12px', cursor: 'pointer', font: 'inherit' }
    const input = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', color: palette.ink, background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 8, font: 'inherit' }
    async function call(path, payload) {
      const response = await fetch(url(path), payload === undefined ? { credentials: 'same-origin', cache: 'no-store' } : { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
      return data
    }
    const time = (value) => value ? new Date(value).toLocaleString() : '未知'
    const compactTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '未知时间'
    const codexWindowLabel = (window) => window.minutes <= 360 ? `${Math.round(window.minutes / 60)}h` : window.minutes >= 10080 ? 'week' : window.label
    function Glyph({ active }) {
      return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, style: { opacity: active ? 1 : .75 } },
        h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }), h('path', { d: 'M7 15v-4m5 4V8m5 7v-3' }))
    }
    function RefreshGlyph() {
      return h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: 'M20 6v5h-5' }), h('path', { d: 'M4 18v-5h5' }), h('path', { d: 'M6.1 9a7 7 0 0 1 11.2-2.6L20 9M4 15l2.7 2.6A7 7 0 0 0 17.9 15' }))
    }
    function PlusGlyph() {
      return h('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', 'aria-hidden': true },
        h('path', { d: 'M12 5v14M5 12h14' }))
    }
    function Bar({ left, total, color }) {
      const percent = total > 0 ? Math.max(0, Math.min(100, left / total * 100)) : 0
      return h('div', { style: { height: 6, background: palette.border, borderRadius: 999, overflow: 'hidden', margin: '8px 0 5px' }, role: 'progressbar', 'aria-valuenow': Math.round(percent), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('div', { style: { height: '100%', width: `${percent}%`, background: color, borderRadius: 999 } }))
    }
    function domesticSummary(accounts) {
      return accounts.reduce((summary, account) => {
        if (account.status !== 'ok' || !account.data) return summary
        summary.okCount += 1
        summary.total += Number(account.data.total) || 0
        summary.left += Number(account.data.left) || 0
        summary.reserved += Number(account.data.reserved) || 0
        return summary
      }, { okCount: 0, total: 0, left: 0, reserved: 0 })
    }
    function WorkBuddyGroup({ title, accounts, onRemove, onCheckIn, checkingIn = false, checkinMessage = null }) {
      const summary = domesticSummary(accounts)
      return h('article', { style: { boxSizing: 'border-box', background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 18, minWidth: 0, height: '100%', boxShadow: '0 6px 18px rgba(0,0,0,.06)' } },
        h('div', { style: { ...row, justifyContent: 'space-between', flexWrap: 'wrap' } },
          h('strong', { style: { fontSize: 15, lineHeight: 1.35 } }, title),
          h('div', { style: row },
            summary.okCount > 0
              ? h('strong', { title: '全部账号剩余积分 / 总积分', style: { fontSize: 15, fontVariantNumeric: 'tabular-nums' } }, `${summary.left.toLocaleString()} / ${summary.total.toLocaleString()}`)
              : h('span', { style: { color: palette.muted } }, '— / —'),
            onCheckIn && h('button', { type: 'button', style: { ...button, fontSize: 11, padding: '6px 9px', opacity: checkingIn ? .65 : 1 }, disabled: checkingIn, onClick: onCheckIn }, checkingIn ? '签到中…' : '一键签到'))),
        checkinMessage && h('p', { role: 'status', 'aria-live': 'polite', style: { color: checkinMessage.error ? palette.red : palette.teal, fontSize: 12, margin: '10px 0 0' } }, checkinMessage.text),
        h('div', { style: { marginTop: 14 } },
          accounts.map((account, index) => h('section', { key: account.id, style: { borderTop: index === 0 ? 0 : `1px solid ${palette.border}`, padding: `${index === 0 ? 0 : 14}px 0 7px`, minWidth: 0 } },
            h('div', { style: { ...row, justifyContent: 'space-between', minHeight: 24 } },
              account.accountName
                ? h('strong', { style: { fontSize: 13, overflowWrap: 'anywhere' } }, account.accountName)
                : h('span', null),
              h('div', { style: row },
                account.status === 'ok' && h('strong', { style: { fontSize: 13 } }, `${account.data.left.toLocaleString()} / ${account.data.total.toLocaleString()}`),
                h('button', { type: 'button', style: { ...button, fontSize: 10, padding: '2px 6px' }, onClick: () => onRemove(account) }, '移除'))),
            account.status === 'error'
              ? h('p', { role: 'alert', style: { color: palette.red, fontSize: 12, lineHeight: 1.5, margin: '8px 0 0' } }, account.error)
              : account.status !== 'ok'
                ? h('p', { style: { color: palette.muted, fontSize: 12, margin: '8px 0 0' } }, account.status === 'empty' ? '暂无缓存' : '读取中…')
                : h(Bar, { left: account.data.left, total: account.data.total, color: palette.teal })))))
    }
    function Card({ account, onRemove }) {
      const isBuddy = account.type === 'workbuddy'
      const isDeepSeek = account.type === 'deepseek' || account.type === 'deepseek-account'
      const heading = isBuddy ? `WorkBuddy · ${account.region === 'global' ? '国际' : '国内'}` : isDeepSeek ? (account.type === 'deepseek-account' ? 'DeepSeek · DSH 账号' : 'DeepSeek · API Key') : 'Codex'
      const data = account.data
      return h('article', { style: { boxSizing: 'border-box', background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 14, padding: 18, minWidth: 0, height: '100%', boxShadow: '0 6px 18px rgba(0,0,0,.06)' } },
        h('div', { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-start' } },
          h('div', { style: { minWidth: 0 } }, h('div', { style: { color: palette.muted, fontSize: 12 } }, heading), h('strong', { style: { display: 'block', marginTop: 3, fontSize: 15, lineHeight: 1.35, overflowWrap: 'anywhere' } }, account.accountName || account.label)),
          h('button', { type: 'button', style: { ...button, flex: '0 0 auto', fontSize: 11, padding: '3px 7px' }, onClick: () => onRemove(account) }, '移除')),
        account.status === 'error'
          ? h('p', { role: 'alert', style: { color: palette.red, fontSize: 13, lineHeight: 1.6 } }, account.error)
          : account.status !== 'ok'
            ? h('p', { style: { color: palette.muted } }, account.status === 'empty' ? '暂无缓存，请点击“刷新额度”。' : '读取中…')
            : isBuddy
              ? h('div', { style: { marginTop: 16 } },
                data.plan && h('div', { style: { color: palette.muted, fontSize: 13 } }, data.plan),
                h('div', { style: { ...row, justifyContent: 'space-between', marginTop: 9 } }, h('span', null, '剩余额度'), h('strong', { style: { fontSize: 24 } }, data.left.toLocaleString())),
                h(Bar, { left: data.left, total: data.total, color: palette.teal }),
                h('div', { style: { color: palette.muted, fontSize: 12 } }, `共 ${data.total.toLocaleString()} credits · 已预留 ${data.reserved.toLocaleString()}`))
              : isDeepSeek
                ? h('div', { style: { marginTop: 12 } },
                  data.available === false && h('p', { style: { color: palette.red, fontSize: 13 } }, '余额不足，无法继续调用 API'),
                  data.balances.map((balance) => h('div', { key: balance.currency, style: { margin: '14px 0' } },
                    h('div', { style: { ...row, justifyContent: 'space-between', alignItems: 'flex-end' } },
                      h('span', { style: { color: palette.muted, fontSize: 13 } }, `余额 / 充值总额 · ${balance.currency}`),
                      h('strong', { style: { fontSize: 17, lineHeight: 1.35, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, `${balance.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${balance.toppedUp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)),
                    h(Bar, { left: balance.total, total: balance.toppedUp, color: palette.teal }),
                    h('div', { style: { color: palette.muted, fontSize: 12, marginTop: 5 } }, `赠送 ${balance.granted.toLocaleString(undefined, { maximumFractionDigits: 2 })}${balance.used ? ` · 已消费 ${balance.used.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}`))))
                : h('div', { style: { marginTop: 14 } },
                  data.allowed === false && h('p', { style: { color: palette.red } }, '当前已达到使用上限'),
                  data.windows.map((window, index) => h('div', { key: `${window.name}-${window.label}-${index}`, style: { margin: '14px 0' } },
                    h('div', { style: { ...row, justifyContent: 'space-between', gap: 14, fontSize: 13 } },
                      h('span', { style: { color: palette.muted } }, codexWindowLabel(window)),
                      h('strong', { style: { textAlign: 'right' } }, `${Math.round(window.leftPercent)}% · ${compactTime(window.resetsAt)} 重置`)),
                    h(Bar, { left: window.leftPercent, total: 100, color: palette.blue }))),
                  data.resetCredits && h('div', { style: { borderTop: `1px solid ${palette.border}`, paddingTop: 12, marginTop: 15, color: palette.muted, fontSize: 12 } }, `重置卡：${data.resetCredits.count} 张${data.resetCredits.expiresAt ? ` · ${compactTime(data.resetCredits.expiresAt)} 到期` : ''}`)))
    }
    function Form({ onAdded, onCancel }) {
      const [type, setType] = useState('workbuddy')
      const [region, setRegion] = useState('cn')
      const [label, setLabel] = useState('')
      const [secret, setSecret] = useState('')
      const [extra, setExtra] = useState('')
      const [command, setCommand] = useState('')
      const [pending, setPending] = useState(false)
      const [error, setError] = useState('')
      async function add(event) {
        event.preventDefault(); setPending(true); setError('')
        const payload = type === 'workbuddy' ? { label, type, region, cookie: secret, userAgent: extra }
          : type === 'deepseek-account' ? { label, type, platformOrigin: 'https://platform.deepseek.com' }
              : type === 'codex-home' ? { label, type, codexHome: extra, codexCommand: command || 'codex' }
                : { label, type, accessToken: secret, accountId: extra }
        try { await call('accounts', payload); setLabel(''); setSecret(''); setExtra(''); setCommand(''); onAdded() }
        catch (failure) { setError(failure.message) }
        finally { setPending(false) }
      }
      const field = (title, value, setter, placeholder, kind = 'text') => h('label', { style: { display: 'block', marginTop: 12, color: palette.muted, fontSize: 12 } }, title,
        h('input', { style: { ...input, marginTop: 5 }, type: kind, value, placeholder, onChange: (event) => setter(event.target.value), autoComplete: 'off' }))
      return h('form', { onSubmit: add, style: { boxSizing: 'border-box', maxWidth: 720, margin: '24px auto 0', padding: 18, background: palette.panel, border: `1px solid ${palette.border}`, borderRadius: 14, boxShadow: '0 6px 18px rgba(0,0,0,.05)' } },
        h('div', { style: { ...row, justifyContent: 'space-between', marginBottom: 12 } },
          h('h2', { style: { fontSize: 15, lineHeight: 1.35, margin: 0 } }, '添加账号'),
          h('button', { type: 'button', onClick: onCancel, 'aria-label': '关闭添加账号', title: '关闭', style: { ...button, fontSize: 16, lineHeight: 1, padding: '3px 7px' } }, '×')),
        h('label', { style: { display: 'block', color: palette.muted, fontSize: 12 } }, '账号来源',
          h('select', { style: { ...input, marginTop: 5 }, value: type, onChange: (event) => { setType(event.target.value); setSecret(''); setExtra(''); setError('') } },
            h('option', { value: 'workbuddy' }, 'WorkBuddy 网页 Cookie'),
            h('option', { value: 'deepseek-account' }, 'DeepSeek DSH 登录账号（自动读取）'),
            h('option', { value: 'codex-home' }, '本机 Codex 登录'),
            h('option', { value: 'codex-token' }, '其他 Codex 账号 OAuth Token'))),
        type === 'deepseek-account' && field('显示名称（可选）', label, setLabel, '例如：个人账号'),
        type === 'workbuddy' ? h(React.Fragment, null,
          h('label', { style: { display: 'block', marginTop: 12, color: palette.muted, fontSize: 12 } }, '登录站点',
            h('select', { style: { ...input, marginTop: 5 }, value: region, onChange: (event) => setRegion(event.target.value) },
              h('option', { value: 'cn' }, '国内站 · www.workbuddy.cn'),
              h('option', { value: 'global' }, '国际站 · www.workbuddy.ai'))),
          field('Cookie 请求头', secret, setSecret, '从该站点已登录网页的额度请求中复制', 'password'),
          field('同一请求的 User-Agent', extra, setExtra, '必须与 Cookie 所属浏览器一致'))
          : type === 'deepseek-account' ? h('p', { style: { color: palette.muted, fontSize: 13, margin: '12px 0 0', lineHeight: 1.6 } }, '直接使用本机 DSH 已登录的 DeepSeek 账号读取余额，无需填写密钥。')
              : type === 'codex-home' ? h(React.Fragment, null,
            field('CODEX_HOME 绝对路径（留空使用默认登录）', extra, setExtra, '例如 C:\\Users\\me\\.codex'),
            field('Codex 可执行文件路径（留空从 PATH 查找）', command, setCommand, 'codex'))
            : h(React.Fragment, null,
              field('ChatGPT OAuth Access Token', secret, setSecret, '只保存在本机 DSH 数据目录', 'password'),
              field('ChatGPT Account ID', extra, setExtra, '登录资料中的 chatgpt_account_id')),
        h('p', { style: { color: palette.muted, fontSize: 12, margin: '12px 0 0', lineHeight: 1.6 } }, type === 'workbuddy' ? `添加时从 WorkBuddy ${region === 'cn' ? '国内' : '国际'}站读取并保存账号名；之后刷新只更新额度。Cookie 不能跨站使用。` : type === 'deepseek-account' ? '余额来自 DSH 自身的 DeepSeek 登录，令牌不会写入插件账号文件。' : '添加时读取并保存 Codex 实际登录账号名；之后刷新只更新额度。'),
        error && h('p', { role: 'alert', style: { color: palette.red, fontSize: 13 } }, error),
        h('button', { type: 'submit', disabled: pending, style: { ...button, background: palette.blue, border: 0, color: '#fff', marginTop: 16, opacity: pending ? .65 : 1 } }, pending ? '保存中…' : '添加账号'))
    }
    function QuotaPage() {
      const [accounts, setAccounts] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')
      const [refreshing, setRefreshing] = useState(false)
      const [checkingIn, setCheckingIn] = useState(false)
      const [checkinMessage, setCheckinMessage] = useState(null)
      const [refreshedAt, setRefreshedAt] = useState(null)
      const [showForm, setShowForm] = useState(false)
      const refresh = useCallback(async () => {
        setRefreshing(true)
        try { const result = await call('usage/refresh', {}); setAccounts(result.accounts); setRefreshedAt(result.refreshedAt); setError('') }
        catch (failure) { setError(failure.message) }
        finally { setRefreshing(false); setLoading(false) }
      }, [])
      // 进入界面：先显示上次快照，再自动获取一次额度并刷新；不轮询，之后只在点击按钮或增删/签到后刷新。
      useEffect(() => {
        let alive = true
        ;(async () => {
          try { const result = await call('usage'); if (alive) { setAccounts(result.accounts); setRefreshedAt(result.refreshedAt) } }
          catch { /* 快照读取失败时保留已有界面，由随后的额度获取决定最终状态 */ }
          finally { if (alive) setLoading(false) }
          if (alive) await refresh()
        })()
        return () => { alive = false }
      }, [refresh])

      async function remove(account) {
        const displayName = account.accountName || account.label
        if (!window.confirm(displayName ? `移除 ${displayName}？` : '移除该账号？')) return
        try { await call('accounts', { action: 'remove', id: account.id }); await refresh() }
        catch (failure) { setError(failure.message) }
      }
      async function checkinAll() {
        setCheckingIn(true)
        setCheckinMessage(null)
        try {
          const result = await call('workbuddy/checkin', {})
          const counts = result.results.reduce((value, item) => { value[item.status] = (value[item.status] || 0) + 1; return value }, {})
          const parts = [counts.signed && `成功 ${counts.signed}`, counts.already && `已签到 ${counts.already}`, counts.inactive && `未开放 ${counts.inactive}`, counts.failed && `失败 ${counts.failed}`].filter(Boolean)
          setCheckinMessage({ error: Boolean(counts.failed), text: `签到完成：${parts.join('，')}` })
          await refresh()
        } catch (failure) {
          setCheckinMessage({ error: true, text: failure.message })
        } finally { setCheckingIn(false) }
      }
      const domesticAccounts = accounts.filter((account) => account.type === 'workbuddy' && account.region !== 'global')
      const globalAccounts = accounts.filter((account) => account.type === 'workbuddy' && account.region === 'global')
      const standaloneAccounts = accounts.filter((account) => account.type !== 'workbuddy')
      return h('section', { style: { height: '100%', overflowY: 'auto', color: palette.ink, boxSizing: 'border-box', padding: '28px clamp(16px, 3.5vw, 44px) 42px', fontFamily: 'inherit', fontSize: 13 } },
        h('div', { style: { maxWidth: 1040, margin: '0 auto' } },
          h('header', { style: { ...row, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingBottom: 18, borderBottom: `1px solid ${palette.border}` } },
            h('div', null, h('h1', { style: { fontSize: 25, lineHeight: 1.25, letterSpacing: '-.015em', margin: 0 } }, '额度概览'), h('p', { style: { color: palette.muted, margin: '6px 0 0', fontSize: 12, lineHeight: 1.55 } }, `WorkBuddy、DeepSeek 与 Codex · 进入时自动获取一次${refreshedAt ? ` · 上次 ${time(refreshedAt)}` : ''}`)),
            h('div', { style: row },
              h('button', { type: 'button', onClick: refresh, disabled: refreshing, 'aria-label': '刷新额度', title: refreshing ? '刷新中…' : '刷新额度', style: { ...button, width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center', opacity: refreshing ? .55 : 1 } }, h(RefreshGlyph)),
              h('button', { type: 'button', onClick: () => setShowForm((value) => !value), 'aria-label': '添加账号', 'aria-expanded': showForm, title: showForm ? '收起添加账号' : '添加账号', style: { ...button, width: 36, height: 36, padding: 0, display: 'grid', placeItems: 'center', background: showForm ? palette.blue : 'transparent', borderColor: showForm ? palette.blue : palette.border, color: showForm ? '#fff' : palette.ink } }, h(PlusGlyph)))),
          error && h('p', { role: 'alert', style: { color: palette.red, margin: '16px 0 0' } }, error),
          !loading && accounts.length > 0 && h('h2', { style: { fontSize: 12, color: palette.muted, fontWeight: 500, margin: '20px 0 10px', letterSpacing: '.04em' } }, '账号额度'),
          loading ? h('p', { style: { color: palette.muted, marginTop: 25 } }, '正在读取账号…')
            : accounts.length ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', alignItems: 'stretch', gap: 16 } },
              domesticAccounts.length ? h(WorkBuddyGroup, { key: 'workbuddy-cn', title: 'WorkBuddy 国内版', accounts: domesticAccounts, onRemove: remove, onCheckIn: checkinAll, checkingIn, checkinMessage }) : null,
              globalAccounts.length ? h(WorkBuddyGroup, { key: 'workbuddy-global', title: 'WorkBuddy 国际版', accounts: globalAccounts, onRemove: remove }) : null,
              standaloneAccounts.map((account) => h(Card, { key: account.id, account, onRemove: remove })))
              : h('div', { style: { marginTop: 25, color: palette.muted } }, '还没有账号。请点击右上角“+”添加账号。'),
          showForm && h(Form, { onCancel: () => setShowForm(false), onAdded: () => { setShowForm(false); refresh() } }),
          h('p', { style: { color: palette.muted, fontSize: 12, lineHeight: 1.7, maxWidth: 650 } }, 'WorkBuddy 各账号按所选站点单独查询，Cookie 不能跨站使用。Codex 订阅额度与 OpenAI API 费用分开计算。各平台调整接口或登录失效时，会在账号卡片中显示错误。')))
    }
    function apply(ctx) {
      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'quota-dashboard' }, QuotaPage)), 'quota-dashboard: panel')
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'quota-dashboard', order: 40, label: '额度概览' }, Glyph)), 'quota-dashboard: sidebar')
    }
    module.exports = { apply, inject: ['slots'], domesticSummary }
    return module.exports
  }
})
