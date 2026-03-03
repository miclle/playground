import type { StorageBackend, StorageConfig } from './types'
import { LocalStorage } from './local'
import { S3Storage } from './s3'
import { GitHubStorage } from './github'

// Create storage backend based on configuration
export function createStorageBackend(config: StorageConfig): StorageBackend {
  switch (config.type) {
    case 'local':
      return new LocalStorage(config)
    case 's3':
      return new S3Storage(config)
    case 'github':
      return new GitHubStorage(config)
    default:
      throw new Error(`Unknown storage type: ${(config as { type: string }).type}`)
  }
}

// Re-export types
export * from './types'
export { LocalStorage } from './local'
export { S3Storage } from './s3'
export { GitHubStorage } from './github'
