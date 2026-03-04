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
        'flex-shrink-0 transition-colors relative',
        direction === 'horizontal'
          ? 'w-2 cursor-col-resize hover:bg-primary/10 active:bg-primary/20'
          : 'h-2 cursor-row-resize hover:bg-primary/10 active:bg-primary/20',
        isDragging && 'bg-primary/20',
        className
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Visible separator line */}
      <div
        className={cn(
          'absolute bg-border/50',
          direction === 'horizontal'
            ? 'left-1/2 top-0 bottom-0 w-px -translate-x-1/2'
            : 'top-1/2 left-0 right-0 h-px -translate-y-1/2'
        )}
      />
    </div>
  )
}
