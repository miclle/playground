/**
 * Auto Debug Logger - Automatically captures and analyzes logs
 */

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: string
  message: string
  data?: unknown
}

class DebugLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private originalConsole: {
    log: typeof console.log
    warn: typeof console.warn
    error: typeof console.error
    debug?: typeof console.debug
  }

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug?.bind(console)
    }

    // Override console methods to capture logs
    this.setupInterception()
  }

  private setupInterception(): void {
    const self = this

    console.log = function (...args: unknown[]) {
      self.originalConsole.log(...args)
      self.addLog('info', 'console', args)
    }

    console.warn = function (...args: unknown[]) {
      self.originalConsole.warn(...args)
      self.addLog('warn', 'console', args)
    }

    console.error = function (...args: unknown[]) {
      self.originalConsole.error(...args)
      self.addLog('error', 'console', args)
    }

    if (console.debug) {
      console.debug = function (...args: unknown[]) {
        self.originalConsole.debug!(...args)
        self.addLog('debug', 'console', args)
      }
    }
  }

  private addLog(level: LogEntry['level'], source: LogEntry['source'], args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message: this.formatArgs(args),
      data: args.length > 0 ? args : undefined
    }

    this.logs.push(entry)

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  private formatArgs(args: unknown[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return arg.message
      try {
        return JSON.stringify(arg, null, 2)
      } catch {
        return String(arg)
      }
    }).join(' ')
  }

  /**
   * Analyze logs and provide diagnostic report
   */
  analyze(): DiagnosticReport {
    const report: DiagnosticReport = {
      timestamp: new Date().toISOString(),
      totalLogs: this.logs.length,
      errors: [],
      warnings: [],
      patterns: this.detectPatterns(),
      recommendations: [],
      summary: ''
    }

    // Collect errors
    report.errors = this.logs
      .filter(log => log.level === 'error')
      .map(log => ({
        timestamp: log.timestamp,
        source: log.source,
        message: log.message,
        context: this.extractContext(log)
      }))

    // Collect warnings
    report.warnings = this.logs
      .filter(log => log.level === 'warn')
      .map(log => ({
        timestamp: log.timestamp,
        source: log.source,
        message: log.message
      }))

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report)

    // Generate summary
    report.summary = this.generateSummary(report)

    return report
  }

  private detectPatterns(): Pattern[] {
    const patterns: Pattern[] = []
    const logText = this.logs.map(l => l.message).join('\n')

    // Tool call patterns
    const toolCallErrors = logText.match(/\[IPC\] Executing tool call:.*input:\s*\{\}/g)
    if (toolCallErrors && toolCallErrors.length > 0) {
      patterns.push({
        type: 'tool_call_empty_input',
        severity: 'error',
        count: toolCallErrors.length,
        description: 'Tool calls with empty input parameters',
        sample: toolCallErrors[0]
      })
    }

    // JSON parse errors
    const jsonErrors = logText.match(/Failed to parse tool input.*SyntaxError/g)
    if (jsonErrors && jsonErrors.length > 0) {
      patterns.push({
        type: 'json_parse_error',
        severity: 'error',
        count: jsonErrors.length,
        description: 'Failed to parse JSON in tool input',
        sample: jsonErrors[0]
      })
    }

    // Sandbox template errors
    const templateErrors = logText.match(/template.*not found/g)
    if (templateErrors && templateErrors.length > 0) {
      patterns.push({
        type: 'sandbox_template_not_found',
        severity: 'warn',
        count: templateErrors.length,
        description: 'Sandbox template not found (will retry with fallback)',
        sample: templateErrors[0]
      })
    }

    return patterns
  }

  private extractContext(log: LogEntry): string {
    const index = this.logs.indexOf(log)
    const contextLogs = this.logs.slice(Math.max(0, index - 3), Math.min(this.logs.length, index + 4))
    return contextLogs.map(l => `[${l.level.toUpperCase()}] ${l.message}`).join('\n')
  }

  private generateRecommendations(report: DiagnosticReport): string[] {
    const recommendations: string[] = []

    for (const pattern of report.patterns) {
      switch (pattern.type) {
        case 'tool_call_empty_input':
          recommendations.push('🔧 Tool calls have empty input - check AI service tool call parsing')
          recommendations.push('   -> Ensure content_block_delta input_json_delta is properly accumulated')
          break
        case 'json_parse_error':
          recommendations.push('🔧 JSON parsing failed - input_json_delta may be fragmented')
          recommendations.push('   -> Implement proper JSON accumulation or use streaming JSON parser')
          break
        case 'sandbox_template_not_found':
          recommendations.push('ℹ️  Sandbox template fallback working - this is expected behavior')
          break
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No critical issues detected in logs')
    }

    return recommendations
  }

  private generateSummary(report: DiagnosticReport): string {
    const errorCount = report.errors.length
    const warningCount = report.warnings.length
    const criticalPatterns = report.patterns.filter(p => p.severity === 'error').length

    let summary = `📊 Log Analysis Summary:\n`
    summary += `   Total logs: ${report.totalLogs}\n`
    summary += `   Errors: ${errorCount}\n`
    summary += `   Warnings: ${warningCount}\n`
    summary += `   Critical patterns: ${criticalPatterns}\n\n`

    if (criticalPatterns > 0) {
      summary += `⚠️  Action required: ${criticalPatterns} critical issue(s) detected\n`
    } else if (warningCount > 0) {
      summary += `⚠️  Review recommended: ${warningCount} warning(s) detected\n`
    } else {
      summary += `✅ System appears healthy\n`
    }

    return summary
  }

  /**
   * Get logs filtered by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs.filter(log => log.source === source || log.message.includes(`[${source}]`))
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count)
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = []
  }

  /**
   * Export logs as JSON
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * Print diagnostic report to console
   */
  printDiagnostic(): void {
    const report = this.analyze()
    console.log('\n' + '='.repeat(60))
    console.log('🔍 AUTO DIAGNOSTIC REPORT')
    console.log('='.repeat(60))
    console.log(report.summary)
    console.log('\n📋 Patterns Detected:')
    for (const pattern of report.patterns) {
      const emoji = pattern.severity === 'error' ? '❌' : pattern.severity === 'warn' ? '⚠️' : 'ℹ️'
      console.log(`   ${emoji} ${pattern.description} (${pattern.count} occurrences)`)
    }
    console.log('\n💡 Recommendations:')
    for (const rec of report.recommendations) {
      console.log(`   ${rec}`)
    }
    console.log('\n' + '='.repeat(60) + '\n')
  }

  /**
   * Restore original console methods
   */
  restore(): void {
    console.log = this.originalConsole.log
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    if (this.originalConsole.debug) {
      console.debug = this.originalConsole.debug
    }
  }
}

interface DiagnosticReport {
  timestamp: string
  totalLogs: number
  errors: Array<{
    timestamp: string
    source: string
    message: string
    context: string
  }>
  warnings: Array<{
    timestamp: string
    source: string
    message: string
  }>
  patterns: Pattern[]
  recommendations: string[]
  summary: string
}

interface Pattern {
  type: string
  severity: 'error' | 'warn' | 'info'
  count: number
  description: string
  sample: string
}

// Global debug logger instance
export const debugLogger = new DebugLogger()

/**
 * Auto-diagnose after operations
 */
export function autoDiagnose(): void {
  debugLogger.printDiagnostic()
}

/**
 * Watch for specific error patterns and auto-fix suggestions
 */
export function watchErrors(callback: (error: Error, suggestion: string) => void): void {
  const originalHandler = globalThis.onerror
  globalThis.onerror = (message, source, lineno, colno, error) => {
    const suggestion = suggestFix(error || new Error(String(message)))
    callback(error || new Error(String(message)), suggestion)
    if (originalHandler) return originalHandler(message, source, lineno, colno, error)
    return false
  }
}

function suggestFix(error: Error): string {
  const message = error.message.toLowerCase()

  if (message.includes('json') && message.includes('parse')) {
    return 'JSON Parse Error: Check for incomplete JSON fragments in streaming responses. Consider using a streaming JSON parser.'
  }
  if (message.includes('template') && message.includes('not found')) {
    return 'Template Not Found: Add more template names to the fallback list in TEMPLATE_FALLBACKS.'
  }
  if (message.includes('eperm') || message.includes('permission')) {
    return 'Permission Error: Try running with appropriate permissions or use a different port.'
  }
  if (message.includes('econnrefused')) {
    return 'Connection Refused: Check if the server/API is running and accessible.'
  }

  return 'Review the error details above for more information.'
}
