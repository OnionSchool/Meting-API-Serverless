/**
 * 从环境变量读取指定平台的 Cookie 列表。
 */
export function readCookies (server, env) {
  const envSource = env ?? (typeof process !== 'undefined' ? process.env : {}) ?? {}
  const prefix = `${server.toUpperCase()}_COOKIE_`
  return Object.entries(envSource)
    .filter(([key, value]) => new RegExp(`^${prefix}[1-9]\\d*$`).test(key) && typeof value === 'string' && value.trim())
    .sort(([left], [right]) => Number(left.slice(prefix.length)) - Number(right.slice(prefix.length)))
    .map(([, value]) => value.trim())
}

export function readCookie (server, env) {
  return readCookies(server, env)[0] || ''
}

/**
 * 异步读取 Cookie 列表，优先从 KV 读取 (仅限腾讯)，其次环境变量。
 */
export async function readCookiesAsync (server, env) {
  const cookies = readCookies(server, env)
  if (server === 'tencent' && env.METING_KV) {
    const kvCookie = await env.METING_KV.get('cookie_tencent')
    if (kvCookie?.trim()) cookies.unshift(kvCookie.trim())
  }
  return [...new Set(cookies)]
}

export async function readCookieAsync (server, env) {
  return (await readCookiesAsync(server, env))[0] || ''
}

/**
 * 验证 referrer 是否在允许的主机列表。
 */
export function isAllowedHost (referrer, allowHosts = []) {
  if (!allowHosts || allowHosts.length === 0) return true
  if (!referrer) return false

  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()
    return allowHosts.some(rule => {
      if (rule === hostname) return true
      if (rule.includes('*')) {
        const pattern = rule.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
        return new RegExp(`^${pattern}$`).test(hostname)
      }
      return false
    })
  } catch (error) {
    return false
  }
}
