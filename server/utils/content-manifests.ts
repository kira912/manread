import type { ManifestReader } from '../infrastructure/content/content-store'
import { CONTENT_MANIFEST_FILE } from '../infrastructure/content/manifest'

const MANIFEST_STORAGE = 'assets:content'
const MANIFEST_SUFFIX = `:${CONTENT_MANIFEST_FILE}`

export function createBundledManifestReader(): ManifestReader {
  const storage = useStorage(MANIFEST_STORAGE)
  return {
    async listSourceIds() {
      const keys = await storage.getKeys()
      return keys.filter(key => key.endsWith(MANIFEST_SUFFIX) && key.split(':').length === 2).map(key => key.slice(0, -MANIFEST_SUFFIX.length))
    },
    readManifest: sourceId => storage.getItem(`${sourceId}${MANIFEST_SUFFIX}`),
  }
}
