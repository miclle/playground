import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import type { Project, Session, Message } from '../../shared/types'

let db: Database.Database | null = null

// Get database path
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'playground.db')
}

// Initialize database
export function initDatabase(): void {
  const dbPath = getDatabasePath()
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sandbox_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `)
}

// Close database
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// Get database instance
function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============ Project Operations ============

export interface ProjectRecord {
  id: string
  name: string
  description: string | null
  sandbox_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function createProject(name: string, description?: string): Project {
  const id = generateId()
  const now = new Date().toISOString()

  getDb().prepare(`
    INSERT INTO projects (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, description || null, now, now)

  return {
    id,
    name,
    description,
    createdAt: new Date(now),
    updatedAt: new Date(now)
  }
}

export function getProject(id: string): Project | null {
  const row = getDb().prepare(`
    SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL
  `).get(id) as ProjectRecord | undefined

  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    sandboxId: row.sandbox_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function listProjects(): Project[] {
  const rows = getDb().prepare(`
    SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY updated_at DESC
  `).all() as ProjectRecord[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    sandboxId: row.sandbox_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }))
}

export function updateProject(id: string, data: { name?: string; description?: string; sandboxId?: string }): Project | null {
  const project = getProject(id)
  if (!project) return null

  const updates: string[] = []
  const values: (string | null)[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description || null)
  }
  if (data.sandboxId !== undefined) {
    updates.push('sandbox_id = ?')
    values.push(data.sandboxId || null)
  }

  if (updates.length === 0) return project

  updates.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  getDb().prepare(`
    UPDATE projects SET ${updates.join(', ')} WHERE id = ?
  `).run(...values)

  return getProject(id)
}

export function deleteProject(id: string): boolean {
  const result = getDb().prepare(`
    UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL
  `).run(new Date().toISOString(), new Date().toISOString(), id)

  return result.changes > 0
}

// ============ Session Operations ============

export interface SessionRecord {
  id: string
  project_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export function createSession(projectId: string): Session {
  const id = generateId()
  const now = new Date().toISOString()

  getDb().prepare(`
    INSERT INTO sessions (id, project_id, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, projectId, now, now)

  return {
    id,
    projectId,
    messages: [],
    createdAt: new Date(now),
    updatedAt: new Date(now)
  }
}

export function getSession(id: string): Session | null {
  const row = getDb().prepare(`
    SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL
  `).get(id) as SessionRecord | undefined

  if (!row) return null

  const messages = getSessionMessages(id)

  return {
    id: row.id,
    projectId: row.project_id,
    messages,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

export function listSessions(projectId: string): Session[] {
  const rows = getDb().prepare(`
    SELECT * FROM sessions WHERE project_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC
  `).all(projectId) as SessionRecord[]

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    messages: [], // Don't load messages for list
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }))
}

export function deleteSession(id: string): boolean {
  const result = getDb().prepare(`
    UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL
  `).run(new Date().toISOString(), new Date().toISOString(), id)

  return result.changes > 0
}

// ============ Message Operations ============

export interface MessageRecord {
  id: string
  session_id: string
  role: string
  content: string
  created_at: string
}

export function addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Message {
  const now = new Date().toISOString()

  // Check for duplicate message (same session, role, and content within the last minute)
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()
  const existingMessage = getDb().prepare(`
    SELECT * FROM messages
    WHERE session_id = ? AND role = ? AND content = ? AND created_at > ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(sessionId, role, content, oneMinuteAgo) as MessageRecord | undefined

  if (existingMessage) {
    console.log('[Database] Skipping duplicate message:', { sessionId, role, contentLength: content.length })
    return {
      id: existingMessage.id,
      role: existingMessage.role as 'user' | 'assistant' | 'system',
      content: existingMessage.content,
      timestamp: new Date(existingMessage.created_at)
    }
  }

  const id = generateId()

  getDb().prepare(`
    INSERT INTO messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, sessionId, role, content, now)

  // Update session updated_at
  getDb().prepare(`
    UPDATE sessions SET updated_at = ? WHERE id = ?
  `).run(now, sessionId)

  return {
    id,
    role: role as 'user' | 'assistant' | 'system',
    content,
    timestamp: new Date(now)
  }
}

export function getSessionMessages(sessionId: string): Message[] {
  const rows = getDb().prepare(`
    SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC
  `).all(sessionId) as MessageRecord[]

  return rows.map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant' | 'system',
    content: row.content,
    timestamp: new Date(row.created_at)
  }))
}

// ============ Settings Operations ============

export function getSetting(key: string): string | null {
  const row = getDb().prepare(`
    SELECT value FROM settings WHERE key = ?
  `).get(key) as { value: string } | undefined

  return row?.value || null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run(key, value, new Date().toISOString())
}
