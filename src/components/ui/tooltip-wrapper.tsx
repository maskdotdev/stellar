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

export const TooltipWrapper = React.forwardRef<
  HTMLElement,
  TooltipWrapperProps
>(({
  content,
  children,
  side = "top",
  sideOffset = 4,
  delayDuration = 200,
  disabled = false
}, ref) => {
  if (disabled || !content) {
    // When disabled or no content, we need to forward the ref to the children
    if (React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, { ref })
    }
    return <>{children}</>
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<any>, { ref }) : children}
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
})

TooltipWrapper.displayName = "TooltipWrapper" 