const MAX_URL_LENGTH = 2048
const PRIVATE_HOSTNAME = /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.home\.arpa)$/i
const IPV4_LITERAL = /^\d{1,3}(\.\d{1,3}){3}$/

export function parseSafeExternalUrl(raw: string, allowedHosts?: readonly string[]): string | null {
  if (raw.length > MAX_URL_LENGTH) return null

  const url = URL.parse(raw)
  if (!url) return null
  if (url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '443') return null

  const hostname = url.hostname.toLowerCase()
  if (!hostname.includes('.') || PRIVATE_HOSTNAME.test(hostname)) return null
  if (IPV4_LITERAL.test(hostname) || hostname.startsWith('[')) return null
  if (allowedHosts && !allowedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))) return null

  return url.toString()
}
