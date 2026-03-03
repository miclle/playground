import keytar from 'keytar'
import type { AIConfig, SandboxConfig, StorageConfig } from '../../../shared/types'
import { getSetting, setSetting } from '../../database'

// Service name for keytar
const SERVICE_NAME = 'com.miclle.playground'

// Configuration keys
const CONFIG_KEYS = {
  AI_CONFIG: 'ai_config',
  SANDBOX_CONFIG: 'sandbox_config',
  STORAGE_CONFIG: 'storage_config',
  ACTIVE_PROFILE: 'active_profile'
} as const

// Secure key storage using system keychain
export async function storeApiKey(service: string, key: string): Promise<void> {
  // keytar requires non-empty password
  if (!key || key.trim() === '') {
    // If key is empty, delete any existing key
    try {
      await keytar.deletePassword(SERVICE_NAME, service)
    } catch {
      // Ignore error if password doesn't exist
    }
    return
  }
  await keytar.setPassword(SERVICE_NAME, service, key)
}

export async function getApiKey(service: string): Promise<string | null> {
  const result = await keytar.getPassword(SERVICE_NAME, service)
  return result
}

export async function deleteApiKey(service: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, service)
}

// Configuration storage (using settings from database)

// Profile types
export interface Profile {
  id: string
  name: string
  ai: AIConfig
  sandbox: SandboxConfig
  storage: StorageConfig
  createdAt: Date
  updatedAt: Date
}

// Save profile configuration
export async function saveProfile(profile: Profile): Promise<void> {
  // Store API keys securely
  if (profile.ai.apiKey) {
    await storeApiKey(`ai_${profile.id}`, profile.ai.apiKey)
  }
  if (profile.sandbox.apiKey) {
    await storeApiKey(`sandbox_${profile.id}`, profile.sandbox.apiKey)
  }
  if (profile.storage.type === 's3') {
    const s3Config = profile.storage as { accessKeyId: string; secretAccessKey: string }
    if (s3Config.accessKeyId) {
      await storeApiKey(`s3_access_${profile.id}`, s3Config.accessKeyId)
    }
    if (s3Config.secretAccessKey) {
      await storeApiKey(`s3_secret_${profile.id}`, s3Config.secretAccessKey)
    }
  }
  if (profile.storage.type === 'github') {
    const ghConfig = profile.storage as { token: string }
    if (ghConfig.token) {
      await storeApiKey(`github_${profile.id}`, ghConfig.token)
    }
  }

  // Store non-sensitive config in database
  const configToStore = {
    id: profile.id,
    name: profile.name,
    ai: { ...profile.ai, apiKey: undefined },
    sandbox: { ...profile.sandbox, apiKey: undefined },
    storage: profile.storage.type === 'local'
      ? profile.storage
      : { ...profile.storage, ...(profile.storage.type === 's3'
          ? { accessKeyId: undefined, secretAccessKey: undefined }
          : { token: undefined })
        },
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  }

  setSetting(`profile_${profile.id}`, JSON.stringify(configToStore))
}

// Load profile configuration
export async function loadProfile(id: string): Promise<Profile | null> {
  const configStr = getSetting(`profile_${id}`)
  if (!configStr) return null

  try {
    const config = JSON.parse(configStr)

    // Retrieve API keys from secure storage
    const aiApiKey = await getApiKey(`ai_${id}`)
    const sandboxApiKey = await getApiKey(`sandbox_${id}`)

    let storageConfig = config.storage
    if (storageConfig.type === 's3') {
      const accessKeyId = await getApiKey(`s3_access_${id}`)
      const secretAccessKey = await getApiKey(`s3_secret_${id}`)
      storageConfig = { ...storageConfig, accessKeyId, secretAccessKey }
    } else if (storageConfig.type === 'github') {
      const token = await getApiKey(`github_${id}`)
      storageConfig = { ...storageConfig, token }
    }

    return {
      id: config.id,
      name: config.name,
      ai: { ...config.ai, apiKey: aiApiKey || '' },
      sandbox: { ...config.sandbox, apiKey: sandboxApiKey || '' },
      storage: storageConfig,
      createdAt: new Date(config.createdAt),
      updatedAt: new Date(config.updatedAt)
    }
  } catch {
    return null
  }
}

// Get/set active profile
export function getActiveProfileId(): string | null {
  return getSetting(CONFIG_KEYS.ACTIVE_PROFILE)
}

export function setActiveProfileId(id: string): void {
  setSetting(CONFIG_KEYS.ACTIVE_PROFILE, id)
}

// List all profile IDs
export function listProfileIds(): string[] {
  // This would need a more sophisticated implementation
  // For now, we'll use a simple approach
  const profilesStr = getSetting('profile_ids')
  if (!profilesStr) return []
  try {
    return JSON.parse(profilesStr)
  } catch {
    return []
  }
}

// Register profile ID
export function registerProfileId(id: string): void {
  const ids = listProfileIds()
  if (!ids.includes(id)) {
    ids.push(id)
    setSetting('profile_ids', JSON.stringify(ids))
  }
}

// Delete profile
export async function deleteProfile(id: string): Promise<void> {
  // Delete API keys
  await deleteApiKey(`ai_${id}`)
  await deleteApiKey(`sandbox_${id}`)
  await deleteApiKey(`s3_access_${id}`)
  await deleteApiKey(`s3_secret_${id}`)
  await deleteApiKey(`github_${id}`)

  // Remove from profile IDs list
  const ids = listProfileIds()
  const newIds = ids.filter((i) => i !== id)
  setSetting('profile_ids', JSON.stringify(newIds))

  // Note: Settings don't have delete, so we just clear it
  setSetting(`profile_${id}`, '')
}
