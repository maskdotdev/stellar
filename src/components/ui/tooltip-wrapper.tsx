import * as React from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

interface TooltipWrapperProps {
  content: string | React.ReactNode
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  delayDuration?: number
  disabled?: boolean
}

export function TooltipWrapper({
  content,
  children,
  side = "top",
  sideOffset = 4,
  delayDuration = 200,
  disabled = false
}: TooltipWrapperProps) {
  if (disabled || !content) {
    return <>{children}</>
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
} 