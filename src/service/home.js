import { html } from 'hono/html'

export default async (c) => {
  const origin = new URL(c.req.url).origin

  return c.html(html`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meting API Serverless</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Serif+SC:wght@600;700;900&display=swap');
    :root { color-scheme: dark; --paper: #121512; --ink: #eeeadc; --muted: #9b9f92; --line: #393d34; --lime: #d5f06b; --orange: #ffb56b; }
    * { box-sizing: border-box; } body { margin: 0; color: var(--ink); background: radial-gradient(circle at 86% -10%, #3a4821, transparent 35rem), var(--paper); font-family: 'DM Mono', monospace; }
    main { width: min(1000px, calc(100% - 32px)); margin: 0 auto; padding: 42px 0 72px; } a { color: inherit; }
    nav, .links, .facts { display: flex; align-items: center; justify-content: space-between; gap: 18px; } nav { font-size: 12px; } .brand { color: var(--lime); letter-spacing: .12em; text-decoration: none; } .links { color: var(--muted); } .links a:hover { color: var(--lime); }
    header { max-width: 770px; padding: 13vh 0 11vh; } .kicker { color: var(--lime); font-size: 12px; letter-spacing: .13em; } h1 { margin: 16px 0 24px; font: 900 clamp(46px, 9vw, 102px)/.96 'Noto Serif SC', serif; letter-spacing: -.09em; } .intro { max-width: 560px; color: var(--muted); font-size: 14px; line-height: 1.9; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; } .button { border: 1px solid var(--line); padding: 12px 16px; font-size: 12px; text-decoration: none; transition: .18s ease; } .button.primary { color: #15170d; background: var(--lime); border-color: var(--lime); } .button:hover { transform: translateY(-2px); border-color: var(--lime); }
    section { border-top: 1px solid var(--line); padding: 22px 0 46px; } .section-label { margin-bottom: 28px; color: var(--lime); font-size: 11px; letter-spacing: .13em; } .grid { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid var(--line); } .card { min-height: 190px; padding: 22px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); } .card:nth-child(2n) { border-right: 0; } .card h2 { margin: 0 0 12px; font: 700 24px 'Noto Serif SC', serif; letter-spacing: -.04em; } .card p, .card li { color: var(--muted); font-size: 12px; line-height: 1.8; } .card ul { margin: 0; padding-left: 18px; }
    .code { position: relative; overflow-x: auto; padding: 20px 22px; border: 1px solid var(--line); color: var(--orange); background: #0d0f0d; font-size: 12px; line-height: 1.8; white-space: pre; } .copy { position: absolute; top: 10px; right: 10px; padding: 6px 9px; border: 1px solid var(--line); color: var(--muted); background: transparent; font: inherit; font-size: 10px; cursor: pointer; } .copy:hover { color: var(--lime); border-color: var(--lime); }
    footer { padding-top: 20px; color: var(--muted); font-size: 11px; } footer a { color: var(--lime); }
    @media (max-width: 620px) { main { width: min(100% - 24px, 1000px); } nav { align-items: flex-start; } .links { align-items: flex-end; flex-direction: column; gap: 7px; } header { padding: 88px 0 72px; } .grid { grid-template-columns: 1fr; } .card, .card:nth-child(2n) { border-right: 0; } }
  </style>
</head>
<body>
  <main>
    <nav><a class="brand" href="/">METING API</a><div class="links"><a href="/admin">ADMIN</a><a id="status-link" href="/status">COOKIE STATUS</a><a href="https://github.com/RhenCloud/Meting-API-Serverless" target="_blank" rel="noreferrer">GITHUB ↗</a></div></nav>
    <header>
      <div class="kicker">MULTI-PLATFORM MUSIC PROXY</div>
      <h1>把音乐接口<br>留在自己的手里。</h1>
      <p class="intro">基于 Hono 与 @meting/core 的无服务器音乐 API 代理，统一访问网易云、QQ 音乐、酷狗、百度和酷我，并支持 Cookie 自动降级。</p>
      <div class="actions"><a class="button primary" href="/demo">打开演示</a><a class="button" href="https://github.com/RhenCloud/Meting-API-Serverless#readme" target="_blank" rel="noreferrer">部署与配置 ↗</a></div>
    </header>
    <section>
      <div class="section-label">01 / 快速请求</div>
      <div class="code" id="example">${origin}/api?server=netease&type=song&id=186016<button class="copy" type="button">复制</button></div>
    </section>
    <section>
      <div class="section-label">02 / 接口说明</div>
      <div class="grid">
        <article class="card"><h2>平台</h2><p>通过 <code>server</code> 选择上游音乐平台。</p><ul><li>netease - 网易云音乐</li><li>tencent - QQ 音乐</li><li>kugou / kuwo / baidu</li></ul></article>
        <article class="card"><h2>资源</h2><p>通过 <code>type</code> 指定所需资源，并传入对应 <code>id</code>。</p><ul><li>song / album / artist / playlist</li><li>search / lrc / url / pic</li></ul></article>
        <article class="card"><h2>鉴权</h2><p><code>url</code>、<code>lrc</code> 和 <code>pic</code> 请求需要 <code>auth</code> 参数。其值为以 <code>METING_TOKEN</code> 计算的 HMAC-SHA1 签名。</p></article>
        <article class="card"><h2>Cookie 监控</h2><p>多个 <code>平台_COOKIE_序号</code> 按序号降级。状态页可实时检查各个已配置 Cookie 的可用性。</p><a id="status-card-link" href="/status">查看状态页 →</a></article>
      </div>
    </section>
    <footer><div class="facts"><span>POWERED BY HONO + @METING/CORE</span><a href="https://github.com/RhenCloud/Meting-API-Serverless" target="_blank" rel="noreferrer">RhenCloud/Meting-API-Serverless ↗</a></div></footer>
  </main>
  <script>
    const query = window.location.search
    document.getElementById('status-link').href = '/status' + query
    document.getElementById('status-card-link').href = '/status' + query
    document.querySelector('.copy').addEventListener('click', event => {
      navigator.clipboard.writeText(document.getElementById('example').childNodes[0].textContent.trim())
      event.target.textContent = '已复制'
      setTimeout(() => { event.target.textContent = '复制' }, 1200)
    })
  </script>
</body>
</html>`)
}
