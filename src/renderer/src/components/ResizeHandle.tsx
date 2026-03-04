import { useState, useCallback, useEffect } from 'react'
import { cn } from '../lib/utils'

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
  className?: string
}

export function ResizeHandle({ direction, onResize, className }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
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
      setIsHovering(false)
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
        'flex-shrink-0 transition-all duration-200 relative z-10',
        direction === 'horizontal'
          ? 'w-4 cursor-col-resize'
          : 'h-4 cursor-row-resize',
        (isHovering || isDragging) && 'bg-primary/5',
        isDragging && 'bg-primary/10',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Visible separator line - always visible */}
      <div
        className={cn(
          'absolute bg-border transition-all duration-200',
          direction === 'horizontal'
            ? 'left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2'
            : 'top-1/2 left-0 right-0 h-[2px] -translate-y-1/2',
          // Make it more visible on hover/drag
          (isHovering || isDragging) && 'bg-primary/60 shadow-[0_0_4px_rgba(0,0,0,0.2)]'
        )}
      />
    </div>
  )
}
