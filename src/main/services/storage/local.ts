import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import type { Artifact } from '../../../shared/types'
import type { StorageBackend, SaveResult, StorageFilter, LocalStorageConfig } from './types'

export class LocalStorage implements StorageBackend {
  readonly name = 'local'
  private basePath: string

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath
  }

  async save(artifact: Artifact): Promise<SaveResult> {
    try {
      const fullPath = join(this.basePath, artifact.path)

      // Ensure directory exists
      await fs.mkdir(dirname(fullPath), { recursive: true })

      // Write file
      await fs.writeFile(fullPath, artifact.content, 'utf-8')

      return {
        success: true,
        path: fullPath
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async list(filter?: StorageFilter): Promise<Artifact[]> {
    try {
      const searchPath = filter?.prefix ? join(this.basePath, filter.prefix) : this.basePath

      // Check if directory exists
      try {
        await fs.access(searchPath)
      } catch {
        return []
      }

      const files = await this.listFilesRecursive(searchPath)
      const artifacts: Artifact[] = []

      for (const file of files) {
        const stat = await fs.stat(file)
        const relativePath = file.replace(this.basePath, '')

        // Filter by date if specified
        if (filter?.since && stat.mtime < filter.since) {
          continue
        }

        artifacts.push({
          id: Buffer.from(relativePath).toString('base64'),
          name: file.split('/').pop() || '',
          path: relativePath,
          content: '', // Don't load content for list
          size: stat.size,
          createdAt: stat.mtime
        })

        // Apply limit
        if (filter?.limit && artifacts.length >= filter.limit) {
          break
        }
      }

      return artifacts
    } catch {
      return []
    }
  }

  async delete(id: string): Promise<void> {
    const relativePath = Buffer.from(id, 'base64').toString()
    const fullPath = join(this.basePath, relativePath)
    await fs.unlink(fullPath)
  }

  async exists(id: string): Promise<boolean> {
    try {
      const relativePath = Buffer.from(id, 'base64').toString()
      const fullPath = join(this.basePath, relativePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async get(id: string): Promise<Artifact | null> {
    try {
      const relativePath = Buffer.from(id, 'base64').toString()
      const fullPath = join(this.basePath, relativePath)
      const content = await fs.readFile(fullPath, 'utf-8')
      const stat = await fs.stat(fullPath)

      return {
        id,
        name: fullPath.split('/').pop() || '',
        path: relativePath,
        content,
        size: stat.size,
        createdAt: stat.mtime
      }
    } catch {
      return null
    }
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...(await this.listFilesRecursive(fullPath)))
      } else {
        files.push(fullPath)
      }
    }

    return files
  }
}
