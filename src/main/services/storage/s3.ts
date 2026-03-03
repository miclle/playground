import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import type { Artifact } from '../../../shared/types'
import type { StorageBackend, SaveResult, StorageFilter, S3StorageConfig } from './types'

export class S3Storage implements StorageBackend {
  readonly name = 's3'
  private client: S3Client
  private bucket: string
  private prefix: string

  constructor(config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
    this.bucket = config.bucket
    this.prefix = config.prefix || ''
  }

  async save(artifact: Artifact): Promise<SaveResult> {
    try {
      const key = this.getKey(artifact.path)

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: artifact.content,
          ContentType: 'text/plain'
        })
      )

      return {
        success: true,
        path: key,
        url: `https://${this.bucket}.s3.amazonaws.com/${key}`
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
      const prefix = filter?.prefix ? this.getKey(filter.prefix) : this.prefix

      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: filter?.limit || 1000
        })
      )

      const artifacts: Artifact[] = []

      for (const object of response.Contents || []) {
        if (!object.Key) continue

        artifacts.push({
          id: Buffer.from(object.Key).toString('base64'),
          name: object.Key.split('/').pop() || '',
          path: this.removePrefix(object.Key),
          content: '',
          size: object.Size || 0,
          createdAt: object.LastModified || new Date()
        })
      }

      return artifacts
    } catch {
      return []
    }
  }

  async delete(id: string): Promise<void> {
    const key = Buffer.from(id, 'base64').toString()

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    )
  }

  async exists(id: string): Promise<boolean> {
    try {
      const key = Buffer.from(id, 'base64').toString()

      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      )

      return true
    } catch {
      return false
    }
  }

  async get(id: string): Promise<Artifact | null> {
    try {
      const key = Buffer.from(id, 'base64').toString()

      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      )

      const content = await response.Body?.transformToString()

      return {
        id,
        name: key.split('/').pop() || '',
        path: this.removePrefix(key),
        content: content || '',
        size: response.ContentLength || 0,
        createdAt: response.LastModified || new Date()
      }
    } catch {
      return null
    }
  }

  private getKey(path: string): string {
    return this.prefix ? `${this.prefix}/${path}` : path
  }

  private removePrefix(key: string): string {
    if (this.prefix && key.startsWith(this.prefix)) {
      return key.slice(this.prefix.length + 1)
    }
    return key
  }
}
