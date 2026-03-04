import { describe, it, expect } from 'vitest'

// Type tests - ensure types are well-formed
describe('Shared Types', () => {
  describe('Message', () => {
    it('should have required fields', () => {
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date()
      }
      expect(message.id).toBe('msg-1')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello')
      expect(message.timestamp).toBeInstanceOf(Date)
    })

    it('should support tool messages', () => {
      const toolMessage = {
        id: 'msg-2',
        role: 'tool' as const,
        content: '{"result": "success"}',
        timestamp: new Date(),
        toolCallId: 'tool-123'
      }
      expect(toolMessage.role).toBe('tool')
      expect(toolMessage.toolCallId).toBe('tool-123')
    })
  })

  describe('Project', () => {
    it('should have required fields', () => {
      const project = {
        id: 'proj-1',
        name: 'Test Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      expect(project.id).toBe('proj-1')
      expect(project.name).toBe('Test Project')
      expect(typeof project.createdAt).toBe('string')
      expect(typeof project.updatedAt).toBe('string')
    })
  })

  describe('FileInfo', () => {
    it('should support file and folder types', () => {
      const file = { name: 'test.ts', path: '/test.ts', type: 'file' as const }
      const folder = { name: 'src', path: '/src', type: 'folder' as const }

      expect(file.type).toBe('file')
      expect(folder.type).toBe('folder')
    })
  })
})
