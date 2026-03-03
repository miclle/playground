import { Octokit } from '@octokit/rest'
import type { Artifact } from '../../../shared/types'
import type { StorageBackend, SaveResult, StorageFilter, GitHubStorageConfig } from './types'

export class GitHubStorage implements StorageBackend {
  readonly name = 'github'
  private octokit: Octokit
  private owner: string
  private repo: string
  private branch: string
  private path: string

  constructor(config: GitHubStorageConfig) {
    this.octokit = new Octokit({ auth: config.token })
    this.owner = config.owner
    this.repo = config.repo
    this.branch = config.branch || 'main'
    this.path = config.path || ''
  }

  async save(artifact: Artifact): Promise<SaveResult> {
    try {
      const filePath = this.getFilePath(artifact.path)

      // Get current file SHA if exists
      let sha: string | undefined
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          ref: this.branch
        })

        if (!Array.isArray(data)) {
          sha = data.sha
        }
      } catch {
        // File doesn't exist, create new
      }

      // Create or update file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: `Update ${artifact.name}`,
        content: Buffer.from(artifact.content).toString('base64'),
        branch: this.branch,
        sha
      })

      return {
        success: true,
        path: filePath,
        url: `https://github.com/${this.owner}/${this.repo}/blob/${this.branch}/${filePath}`
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
      const path = filter?.prefix ? this.getFilePath(filter.prefix) : this.path

      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch
      })

      if (!Array.isArray(data)) {
        return []
      }

      const artifacts: Artifact[] = []

      for (const item of data) {
        if (item.type === 'file') {
          artifacts.push({
            id: Buffer.from(item.path).toString('base64'),
            name: item.name,
            path: this.removePath(item.path),
            content: '',
            size: item.size || 0,
            createdAt: new Date()
          })
        }

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
    const filePath = Buffer.from(id, 'base64').toString()

    // Get file SHA
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      ref: this.branch
    })

    if (Array.isArray(data)) {
      throw new Error('Cannot delete directory')
    }

    await this.octokit.repos.deleteFile({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message: 'Delete file',
      sha: data.sha,
      branch: this.branch
    })
  }

  async exists(id: string): Promise<boolean> {
    try {
      const filePath = Buffer.from(id, 'base64').toString()

      await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch
      })

      return true
    } catch {
      return false
    }
  }

  async get(id: string): Promise<Artifact | null> {
    try {
      const filePath = Buffer.from(id, 'base64').toString()

      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        ref: this.branch
      })

      if (Array.isArray(data)) {
        return null
      }

      const content = data.content ? Buffer.from(data.content, 'base64').toString('utf-8') : ''

      return {
        id,
        name: data.name,
        path: this.removePath(data.path),
        content,
        size: data.size || 0,
        createdAt: new Date()
      }
    } catch {
      return null
    }
  }

  private getFilePath(path: string): string {
    return this.path ? `${this.path}/${path}` : path
  }

  private removePath(filePath: string): string {
    if (this.path && filePath.startsWith(this.path)) {
      return filePath.slice(this.path.length + 1)
    }
    return filePath
  }
}
