import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.api
vi.stubGlobal('window', {
  api: undefined,
  electron: undefined
})
