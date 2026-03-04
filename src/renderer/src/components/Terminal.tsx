import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import 'xterm/css/xterm.css'
import './Terminal.css'

interface TerminalPanelProps {
  projectId?: string
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentLineRef = useRef('')
  const isExecutingRef = useRef(false)
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1)

  useEffect(() => {
    if (!terminalRef.current) return

    const terminal = new Terminal({
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: true, // Convert \n to \r\n for proper line breaks
      fontFamily: "'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace",
      fontSize: 13,
      fontWeight: 'normal',
      fontWeightBold: 'bold',
      letterSpacing: 0,
      lineHeight: 1.2,
      theme: {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
        cursorAccent: '#1a1a1a',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 8,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    // Load Unicode11 addon for proper character width handling (CJK, emoji, etc.)
    const unicode11Addon = new Unicode11Addon()
    terminal.loadAddon(unicode11Addon)
    terminal.unicode.activeVersion = '11'

    terminal.open(terminalRef.current)

    // Wait for DOM to render before fitting
    setTimeout(() => {
      fitAddon.fit()
      // Log terminal dimensions for debugging
      console.log('[Terminal] Dimensions:', {
        cols: terminal.cols,
        rows: terminal.rows,
        actual: terminalRef.current?.getBoundingClientRect()
      })
    }, 100)

    xtermRef.current = terminal
    fitAddonRef.current = fitAddon

    // 显示欢迎消息
    terminal.writeln('\x1b[1;36mWelcome to Playground Terminal\x1b[0m')
    terminal.writeln('Connected to sandbox. Type a command to execute.\r')
    writePrompt()

    function writePrompt() {
      terminal.write('\x1b[1;32m$\x1b[0m ')
    }

    function clearLine() {
      terminal.write('\r\x1b[2K')
      writePrompt()
    }

    // 执行命令
    const executeCommand = async (cmd: string) => {
      if (!projectId || isExecutingRef.current) return

      // 添加到历史记录
      commandHistoryRef.current.push(cmd)
      historyIndexRef.current = -1

      isExecutingRef.current = true

      terminal.writeln('')
      terminal.write(`\x1b[1;36m${cmd}\x1b[0m\r\n`)

      // 使用终端实际列数设置 COLUMNS 环境变量
      // 注意：E2B sandbox 没有 PTY，所以 stty 不工作，只能依赖环境变量
      const cols = terminal.cols || 80
      const cmdWithCols = `COLUMNS=${cols} ${cmd}`

      try {
        // 监听流式输出
        const unsubscribe = window.api?.sandbox.onTerminalOutput((data) => {
          if (data.type === 'stderr') {
            terminal.write(`\x1b[33m${data.content}\x1b[0m`)
          } else {
            terminal.write(data.content)
          }
        })

        // 执行命令
        await window.api?.sandbox.execute(projectId, cmdWithCols)

        unsubscribe?.()

        // 显示新提示符
        terminal.writeln('')
        writePrompt()
      } catch (err) {
        terminal.write(`\x1b[31mError: ${(err as Error).message}\x1b[0m\r\n`)
        writePrompt()
      } finally {
        isExecutingRef.current = false
      }
    }

    // 处理用户输入
    terminal.onData((data: string) => {
      if (isExecutingRef.current) return

      if (data === '\r') {
        // Enter key - 执行命令
        const cmd = currentLineRef.current.trim()
        if (cmd) {
          executeCommand(cmd)
        } else {
          terminal.writeln('')
          writePrompt()
        }
        currentLineRef.current = ''
        historyIndexRef.current = -1
      } else if (data === '\u007F') {
        // Backspace
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1)
          terminal.write('\b \b')
        }
      } else if (data === '\u001B[A') {
        // Arrow Up
        const history = commandHistoryRef.current
        if (history.length > 0 && historyIndexRef.current < history.length - 1) {
          historyIndexRef.current++
          clearLine()
          const cmd = history[history.length - 1 - historyIndexRef.current]
          currentLineRef.current = cmd
          terminal.write(cmd)
        }
      } else if (data === '\u001B[B') {
        // Arrow Down
        const history = commandHistoryRef.current
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--
          clearLine()
          const cmd = history[history.length - 1 - historyIndexRef.current]
          currentLineRef.current = cmd
          terminal.write(cmd)
        } else if (historyIndexRef.current === 0) {
          historyIndexRef.current = -1
          clearLine()
          currentLineRef.current = ''
        }
      } else if (data >= ' ' && data <= '~') {
        // 可打印字符
        currentLineRef.current += data
        terminal.write(data)
      }
    })

    // 窗口大小变化时重新适配
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(terminalRef.current)

    return () => {
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [projectId])

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] terminal-container">
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden"
        style={{ padding: '8px' }}
      />
    </div>
  )
}
