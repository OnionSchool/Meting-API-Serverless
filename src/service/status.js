import Meting from '@meting/core'
import { html } from 'hono/html'
import { readCookieEntriesAsync } from '../utils/cookie.js'

const PLATFORMS = ['netease', 'tencent', 'kugou', 'baidu', 'kuwo']

async function checkCookie (platform, entry) {
  const startedAt = Date.now()
  const meting = new Meting(platform)
  meting.cookie(entry.value)
  meting.format(true)

  try {
    const response = await meting.search('Meting')
    JSON.parse(response)
    return { platform, key: entry.key, available: true, duration: Date.now() - startedAt }
  } catch (error) {
    return { platform, key: entry.key, available: false, duration: Date.now() - startedAt }
  }
}

export async function getCookieStatuses (env) {
  const entries = await Promise.all(PLATFORMS.map(async platform => ({
    platform,
    cookies: await readCookieEntriesAsync(platform, env)
  })))
  const checks = entries.flatMap(({ platform, cookies }) => cookies.map(cookie => checkCookie(platform, cookie)))
  return Promise.all(checks)
}

export async function statusApiService (c) {
  return c.json({ cookies: await getCookieStatuses(c.env) })
}

export default async (c) => {
  return c.html(html`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cookie 状态 | Meting API</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Serif+SC:wght@600;700&display=swap');
    :root { color-scheme: dark; --paper: #121512; --ink: #eeeadc; --muted: #9b9f92; --line: #393d34; --good: #d5f06b; --bad: #ff8575; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; color: var(--ink); background: radial-gradient(circle at 80% 0%, #303b20, transparent 34rem), var(--paper); font-family: 'DM Mono', monospace; }
    main { width: min(900px, calc(100% - 32px)); margin: 0 auto; padding: 12vh 0 64px; }
    .eyebrow { color: var(--good); font-size: 12px; letter-spacing: .13em; }
    h1 { margin: 12px 0 8px; font: 700 clamp(38px, 8vw, 76px)/1 'Noto Serif SC', serif; letter-spacing: -.08em; }
    p { max-width: 42rem; color: var(--muted); font-size: 13px; line-height: 1.8; }
    .meta { display: flex; justify-content: space-between; gap: 16px; margin: 40px 0 12px; color: var(--muted); font-size: 11px; }
    #status { border-top: 1px solid var(--line); }
    .row { display: grid; grid-template-columns: 1fr 110px 70px; gap: 16px; align-items: center; min-height: 62px; border-bottom: 1px solid var(--line); font-size: 13px; }
    .platform { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    .state { font-size: 12px; text-align: right; }
    .available { color: var(--good); } .unavailable { color: var(--bad); }
    .duration { color: var(--muted); text-align: right; font-size: 11px; }
    .empty { padding: 28px 0; color: var(--muted); font-size: 13px; }
    @media (max-width: 520px) { main { padding-top: 64px; } .row { grid-template-columns: 1fr 82px; } .duration { display: none; } }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">METING / COOKIE MONITOR</div>
    <h1>凭据状态</h1>
    <p>逐项向对应音乐平台发起请求。此页面不会显示或传输 Cookie 内容，检测结果仅表示该 Cookie 当前能否完成平台请求。</p>
    <div class="meta"><span>变量名</span><span id="updated">检测中...</span></div>
    <div id="status"><div class="empty">正在检查已配置的 Cookie...</div></div>
  </main>
  <script>
    const status = document.getElementById('status')
    const updated = document.getElementById('updated')
    fetch('status.json').then(response => {
      if (!response.ok) throw new Error('检测请求失败')
      return response.json()
    }).then(({ cookies }) => {
      updated.textContent = '刚刚检测'
      if (!cookies.length) { status.innerHTML = '<div class="empty">未发现已配置的 Cookie。</div>'; return }
      status.innerHTML = cookies.map(cookie => '<div class="row"><div><div>' + cookie.key + '</div><div class="platform">' + cookie.platform + '</div></div><div class="state ' + (cookie.available ? 'available' : 'unavailable') + '">' + (cookie.available ? '可用' : '不可用') + '</div><div class="duration">' + cookie.duration + ' ms</div></div>').join('')
    }).catch(() => { status.innerHTML = '<div class="empty">状态检测失败，请稍后重试。</div>'; updated.textContent = '请求失败' })
  </script>
</body>
</html>`)
}
