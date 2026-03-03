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
        'flex-shrink-0 transition-colors',
        direction === 'horizontal'
          ? 'w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/40'
          : 'h-1 cursor-row-resize hover:bg-primary/20 active:bg-primary/40',
        isDragging && 'bg-primary/40',
        className
      )}
      onMouseDown={handleMouseDown}
    />
  )
}
