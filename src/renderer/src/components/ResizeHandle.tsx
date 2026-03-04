import { useState, useCallback, useEffect } from 'react'
import { cn } from '../lib/utils'

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  className?: string
}

export function ResizeHandle({ direction, onResize, className }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'horizontal') {
        onResize(e.movementX)
      } else {
        onResize(e.movementY)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, direction, onResize])

  return (
    <div
      className={cn(
        // Container takes no space
        'relative shrink-0',
        direction === 'horizontal' ? 'w-0' : 'h-0',
        // Cursor
        direction === 'horizontal' ? 'cursor-col-resize' : 'cursor-row-resize',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Visible separator line - using ::before pseudo-element approach */}
      <div
        className={cn(
          'absolute bg-border transition-all',
          // Horizontal: vertical line on the left edge
          direction === 'horizontal'
            ? 'inset-y-0 -left-px w-px hover:w-0.5 hover:-left-0.5 hover:bg-muted-foreground'
            : 'inset-x-0 -top-px h-px hover:h-0.5 hover:-top-0.5 hover:bg-muted-foreground',
          // Wider and darker when dragging
          isDragging && (direction === 'horizontal' ? 'w-0.5 -left-0.5 bg-primary' : 'h-0.5 -top-0.5 bg-primary')
        )}
      />
      {/* Invisible drag handle area - larger click area */}
      <div
        className={cn(
          'absolute bg-transparent',
          // Horizontal: extends left to capture drags
          direction === 'horizontal'
            ? 'inset-y-0 -left-1 w-2'
            : 'inset-x-0 -top-1 h-2'
        )}
      />
    </div>
  )
}
