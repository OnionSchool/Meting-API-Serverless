import { HTTPException } from 'hono/http-exception'
import { html } from 'hono/html'
import { cookieKVKey, isSupportedPlatform, parseStoredCookie, stringifyStoredCookie } from '../utils/cookie.js'

function requireAdmin (c) {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (token !== (c.env.METING_TOKEN || 'token')) {
    throw new HTTPException(401, { message: '鉴权失败,非法调用' })
  }
}

function requireKV (env) {
  if (!env.METING_KV) throw new HTTPException(503, { message: '未绑定 METING_KV' })
  return env.METING_KV
}

export async function listCookiesService (c) {
  requireAdmin(c)
  const kv = requireKV(c.env)
  const { keys } = await kv.list({ prefix: 'cookies:' })
  const cookies = await Promise.all(keys.map(async ({ name }) => ({ name, ...parseStoredCookie(await kv.get(name)) })))
  return c.json({ cookies: cookies.map(({ name, label }) => {
    const [, platform, id] = name.split(':')
    return { platform, id, name: label }
  }) })
}

export async function createCookieService (c) {
  requireAdmin(c)
  const kv = requireKV(c.env)
  const { platform, cookie, name } = await c.req.json()
  if (!isSupportedPlatform(platform) || typeof cookie !== 'string' || !cookie.trim() || (name !== undefined && (typeof name !== 'string' || name.trim().length > 100))) {
    throw new HTTPException(400, { message: '平台或 Cookie 参数不合法' })
  }
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
  const label = name?.trim() || ''
  await kv.put(cookieKVKey(platform, id), stringifyStoredCookie(cookie.trim(), label))
  return c.json({ platform, id, name: label }, 201)
}

export async function deleteCookieService (c) {
  requireAdmin(c)
  const kv = requireKV(c.env)
  const platform = c.req.param('platform')
  const id = c.req.param('id')
  if (!isSupportedPlatform(platform) || !/^[a-z0-9-]+$/i.test(id)) {
    throw new HTTPException(400, { message: 'Cookie 标识不合法' })
  }
  await kv.delete(cookieKVKey(platform, id))
  return c.body(null, 204)
}

export default async (c) => c.html(html`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cookie 管理 | Meting API</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Serif+SC:wght@600;700&display=swap');
    :root { color-scheme: dark; --paper:#121512; --ink:#eeeadc; --muted:#9b9f92; --line:#393d34; --lime:#d5f06b; --red:#ff8575; } * { box-sizing:border-box; } body { margin:0; min-height:100vh; color:var(--ink); background:radial-gradient(circle at 80% 0%,#303b20,transparent 34rem),var(--paper); font-family:'DM Mono',monospace; } main { width:min(800px,calc(100% - 32px)); margin:0 auto; padding:10vh 0 64px; } a { color:var(--lime); } .eyebrow { color:var(--lime); font-size:12px; letter-spacing:.13em; } h1 { margin:12px 0 8px; font:700 clamp(38px,8vw,70px)/1 'Noto Serif SC',serif; letter-spacing:-.08em; } p { color:var(--muted); font-size:13px; line-height:1.8; } .panel { margin-top:36px; padding:22px; border:1px solid var(--line); } label { display:block; margin-bottom:8px; color:var(--muted); font-size:11px; } input, select, textarea, button { width:100%; border:1px solid var(--line); color:var(--ink); background:#0d0f0d; font:inherit; font-size:13px; } input, select, textarea { padding:12px; } textarea { min-height:120px; resize:vertical; } button { width:auto; padding:11px 14px; cursor:pointer; } button.primary { color:#15170d; border-color:var(--lime); background:var(--lime); } button.danger { color:var(--red); } .field { margin:16px 0; } .actions { display:flex; gap:10px; align-items:center; } #message { color:var(--muted); font-size:12px; } #cookies { margin-top:32px; border-top:1px solid var(--line); } .row { display:grid; grid-template-columns:1fr auto; gap:14px; align-items:center; padding:16px 0; border-bottom:1px solid var(--line); font-size:13px; } .platform { color:var(--muted); font-size:11px; text-transform:uppercase; margin-top:5px; } .hidden { display:none; } @media(max-width:520px) { main { padding-top:64px; } }
  </style>
</head>
<body><main>
  <a id="home-link" href="/">← 首页</a><div class="eyebrow" style="margin-top:36px">METING / PRIVATE CONTROL</div><h1>Cookie 管理</h1><p>通过 <code>METING_TOKEN</code> 登录。Cookie 仅写入 KV，读取列表不会返回其内容。</p>
  <section id="login" class="panel"><label for="token">METING_TOKEN</label><input id="token" type="password" autocomplete="current-password"><div class="actions" style="margin-top:16px"><button id="login-button" class="primary">进入管理页</button><span id="message"></span></div></section>
  <section id="manager" class="hidden"><div class="panel"><div class="field"><label for="platform">平台</label><select id="platform"><option value="netease">网易云音乐</option><option value="tencent">QQ 音乐</option><option value="kugou">酷狗音乐</option><option value="kuwo">酷我音乐</option><option value="baidu">百度音乐</option></select></div><div class="field"><label for="name">名称（可选）</label><input id="name" maxlength="100" placeholder="例如：主账号"></div><div class="field"><label for="cookie">Cookie</label><textarea id="cookie" placeholder="粘贴完整 Cookie"></textarea></div><div class="actions"><button id="add-button" class="primary">添加 Cookie</button><span id="manager-message"></span></div></div><div id="cookies"></div></section>
  <script>
    const tokenInput = document.getElementById('token'); const login = document.getElementById('login'); const manager = document.getElementById('manager'); const message = document.getElementById('message'); const managerMessage = document.getElementById('manager-message'); const cookies = document.getElementById('cookies'); const pagePath = window.location.pathname.endsWith('/') ? window.location.pathname.slice(0, -1) : window.location.pathname; const apiPath = pagePath + '/cookies';
    document.getElementById('home-link').href = pagePath.endsWith('/admin') ? pagePath.slice(0, -5) || '/' : '/'
    const request = (path = '', options = {}) => fetch(apiPath + path, { ...options, headers: { ...options.headers, Authorization: 'Bearer ' + sessionStorage.getItem('meting-admin-token') } });
    async function errorMessage(response) { return response.headers.get('x-error-message') || await response.text() || '请求失败' }
    async function load() { const response = await request(); if (!response.ok) throw new Error(await errorMessage(response)); const data = await response.json(); cookies.innerHTML = data.cookies.length ? data.cookies.map(cookie => '<div class="row"><div><div>' + (cookie.name || cookie.id) + '</div><div class="platform">' + cookie.platform + ' / ' + cookie.id + '</div></div><button class="danger" data-platform="' + cookie.platform + '" data-id="' + cookie.id + '">删除</button></div>').join('') : '<p>KV 中尚未添加 Cookie。</p>'; cookies.querySelectorAll('button').forEach(button => button.onclick = async () => { if (!confirm('确认删除此 Cookie？')) return; const response = await request('/' + button.dataset.platform + '/' + button.dataset.id, { method: 'DELETE' }); if (!response.ok) { managerMessage.textContent = await errorMessage(response); return } await load() }); }
    async function enter() { sessionStorage.setItem('meting-admin-token', tokenInput.value); try { await load(); login.classList.add('hidden'); manager.classList.remove('hidden') } catch (error) { sessionStorage.removeItem('meting-admin-token'); message.textContent = error.message } }
    document.getElementById('login-button').onclick = enter; tokenInput.addEventListener('keydown', event => { if (event.key === 'Enter') enter() }); document.getElementById('add-button').onclick = async () => { const cookie = document.getElementById('cookie').value; const platform = document.getElementById('platform').value; const name = document.getElementById('name').value; managerMessage.textContent = ''; const response = await request('', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ platform, cookie, name }) }); if (!response.ok) { managerMessage.textContent = await errorMessage(response); return } document.getElementById('name').value = ''; document.getElementById('cookie').value = ''; await load() };
  </script>
</main></body></html>`)
