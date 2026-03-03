import { ipcMain, shell } from 'electron'
import * as db from '../database'
import * as config from '../services/config'
import type { Project, Session, Message } from '../../shared/types'

// Register all IPC handlers
export function registerIpcHandlers(): void {
  // ============ Shell Handlers ============

  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<void> => {
    await shell.openExternal(url)
  })

  // ============ Project Handlers ============

  ipcMain.handle('project:create', async (_event, data: { name: string; description?: string }): Promise<Project> => {
    return db.createProject(data.name, data.description)
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

  // ============ Configuration/Profile Handlers ============

  ipcMain.handle('profile:save', async (_event, profile: config.Profile): Promise<void> => {
    await config.saveProfile(profile)
    config.registerProfileId(profile.id)
  })

  ipcMain.handle('profile:load', async (_event, id: string): Promise<config.Profile | null> => {
    return config.loadProfile(id)
  })

  ipcMain.handle('profile:delete', async (_event, id: string): Promise<void> => {
    await config.deleteProfile(id)
  })

  ipcMain.handle('profile:listIds', async (): Promise<string[]> => {
    return config.listProfileIds()
  })

  ipcMain.handle('profile:getActive', async (): Promise<string | null> => {
    return config.getActiveProfileId()
  })

  ipcMain.handle('profile:setActive', async (_event, id: string): Promise<void> => {
    config.setActiveProfileId(id)
  })
}
