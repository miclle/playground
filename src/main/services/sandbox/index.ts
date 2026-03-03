import type { SandboxClient, SandboxConfig } from './types'
import { E2BSandboxClient } from './e2b'

// Create sandbox client
export function createSandboxClient(config: SandboxConfig): SandboxClient {
  return new E2BSandboxClient(config)
}

// Re-export types
export * from './types'
export { E2BSandboxClient } from './e2b'
