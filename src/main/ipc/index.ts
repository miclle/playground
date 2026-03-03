import { ipcMain } from 'electron'
import * as db from '../database'
import type { Project, Session, Message } from '../../shared/types'

// Register all IPC handlers
export function registerIpcHandlers(): void {
  // ============ Project Handlers ============

  ipcMain.handle('project:create', async (_event, name: string, description?: string): Promise<Project> => {
    return db.createProject(name, description)
  })

  ipcMain.handle('project:get', async (_event, id: string): Promise<Project | null> => {
    return db.getProject(id)
  })

  ipcMain.handle('project:list', async (): Promise<Project[]> => {
    return db.listProjects()
  })

  ipcMain.handle('project:update', async (_event, id: string, data: {
    name?: string
    description?: string
    sandboxId?: string
  }): Promise<Project | null> => {
    return db.updateProject(id, data)
  })

  ipcMain.handle('project:delete', async (_event, id: string): Promise<boolean> => {
    return db.deleteProject(id)
  })

  // ============ Session Handlers ============

  ipcMain.handle('session:create', async (_event, projectId: string): Promise<Session> => {
    return db.createSession(projectId)
  })

  ipcMain.handle('session:get', async (_event, id: string): Promise<Session | null> => {
    return db.getSession(id)
  })

  ipcMain.handle('session:list', async (_event, projectId: string): Promise<Session[]> => {
    return db.listSessions(projectId)
  })

  ipcMain.handle('session:delete', async (_event, id: string): Promise<boolean> => {
    return db.deleteSession(id)
  })

  // ============ Message Handlers ============

  ipcMain.handle('message:add', async (_event, sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Message> => {
    return db.addMessage(sessionId, role, content)
  })

  ipcMain.handle('message:list', async (_event, sessionId: string): Promise<Message[]> => {
    return db.getSessionMessages(sessionId)
  })

  // ============ Settings Handlers ============

  ipcMain.handle('settings:get', async (_event, key: string): Promise<string | null> => {
    return db.getSetting(key)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: string): Promise<void> => {
    db.setSetting(key, value)
  })
}
