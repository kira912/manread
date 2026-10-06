import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const MIN_COMPRESSIBLE_BYTES = 1_024
const BROTLI_QUALITY = 5
const GZIP_LEVEL = 6

export default defineNitroPlugin(nitroApp => {
  if (!useRuntimeConfig().compressHtml) return

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!event.node.req.socket?.remoteAddress) return
    if (typeof response.body !== 'string' || response.body.length < MIN_COMPRESSIBLE_BYTES) return
    if (response.headers?.['content-encoding']) return

    const accepted = getRequestHeader(event, 'accept-encoding') ?? ''
    const encoding = /\bbr\b/.test(accepted) ? 'br' : /\bgzip\b/.test(accepted) ? 'gzip' : null
    if (!encoding) return

    response.body =
      encoding === 'br'
        ? brotliCompressSync(response.body, { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } })
        : gzipSync(response.body, { level: GZIP_LEVEL })
    response.headers = { ...response.headers, 'content-encoding': encoding, vary: 'Accept-Encoding' }
  })
})
