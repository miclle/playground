import type { Artifact } from '../../../shared/types'

// Storage backend interface
export interface StorageBackend {
  // Backend name for identification
  readonly name: string

  // Save artifact
  save(artifact: Artifact): Promise<SaveResult>

  // List artifacts
  list(filter?: StorageFilter): Promise<Artifact[]>

  // Delete artifact
  delete(id: string): Promise<void>

  // Check if artifact exists
  exists(id: string): Promise<boolean>

  // Get artifact content
  get(id: string): Promise<Artifact | null>
}

// Save result
export interface SaveResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

// Storage filter
export interface StorageFilter {
  prefix?: string
  limit?: number
  since?: Date
}

// Storage types
export type StorageType = 'local' | 's3' | 'github'

// Base storage configuration
export interface StorageConfigBase {
  type: StorageType
}

// Local storage configuration
export interface LocalStorageConfig extends StorageConfigBase {
  type: 'local'
  basePath: string
}

// S3 storage configuration
export interface S3StorageConfig extends StorageConfigBase {
  type: 's3'
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  prefix?: string
}

// GitHub storage configuration
export interface GitHubStorageConfig extends StorageConfigBase {
  type: 'github'
  token: string
  owner: string
  repo: string
  branch?: string
  path?: string
}

// Union type for all storage configs
export type StorageConfig = LocalStorageConfig | S3StorageConfig | GitHubStorageConfig
