/**
 * 从环境变量读取指定平台的 Cookie 列表。
 */
export function readCookies (server, env) {
  return readCookieEntries(server, env).map(({ value }) => value)
}

export function readCookieEntries (server, env) {
  const envSource = env ?? (typeof process !== 'undefined' ? process.env : {}) ?? {}
  const prefix = `${server.toUpperCase()}_COOKIE_`
  return Object.entries(envSource)
    .filter(([key, value]) => new RegExp(`^${prefix}[1-9]\\d*$`).test(key) && typeof value === 'string' && value.trim())
    .sort(([left], [right]) => Number(left.slice(prefix.length)) - Number(right.slice(prefix.length)))
    .map(([key, value]) => ({ key, value: value.trim() }))
}

export function readCookie (server, env) {
  return readCookies(server, env)[0] || ''
}

/**
 * 异步读取 Cookie 列表，优先从 KV 读取 (仅限腾讯)，其次环境变量。
 */
export async function readCookiesAsync (server, env) {
  const entries = await readCookieEntriesAsync(server, env)
  return [...new Set(entries.map(({ value }) => value))]
}

export async function readCookieEntriesAsync (server, env) {
  const entries = []
  if (env?.METING_KV && isSupportedPlatform(server)) {
    const { keys } = await env.METING_KV.list({ prefix: `${KV_PREFIX}${server}:` })
    const cookies = await Promise.all(keys.map(async ({ name }) => ({ name, ...parseStoredCookie(await env.METING_KV.get(name)) })))
    entries.push(...cookies
      .filter(({ value }) => value?.trim())
      .map(({ name: storageKey, value, label, storageFormat }) => ({ key: `KV_${storageKey.slice(KV_PREFIX.length)}`, value: value.trim(), label, storageKey, storageFormat })))
  }
  if (server === 'tencent' && env?.METING_KV) {
    const kvCookie = await env.METING_KV.get('cookie_tencent')
    if (kvCookie?.trim()) entries.push({ key: 'METING_KV', value: kvCookie.trim(), storageKey: 'cookie_tencent' })
  }
  entries.push(...readCookieEntries(server, env))
  return entries
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
const PLATFORMS = new Set(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])
const KV_PREFIX = 'cookies:'

export function isSupportedPlatform (platform) {
  return PLATFORMS.has(platform)
}

export function cookieKVKey (platform, id) {
  return `${KV_PREFIX}${platform}:${id}`
}

export function parseStoredCookie (storedValue) {
  if (typeof storedValue !== 'string') return { value: '' }
  try {
    const record = JSON.parse(storedValue)
    if (typeof record?.cookie === 'string') {
      return { value: record.cookie, label: typeof record.name === 'string' ? record.name : '', storageFormat: 'record' }
    }
  } catch (error) {}
  return { value: storedValue, label: '', storageFormat: 'legacy' }
}

export function stringifyStoredCookie (cookie, name = '') {
  return JSON.stringify({ cookie, name })
}
