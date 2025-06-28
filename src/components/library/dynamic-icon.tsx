import { Folder } from "lucide-react"
import { DynamicIcon as LucideDynamicIcon, dynamicIconImports } from "lucide-react/dynamic"

interface DynamicIconProps {
  iconKey: string
  className?: string
  style?: React.CSSProperties
}

export function DynamicIcon({ iconKey, className, style }: DynamicIconProps) {
  // Check if the icon exists in the dynamic imports
  if (dynamicIconImports[iconKey as keyof typeof dynamicIconImports]) {
    return (
      <LucideDynamicIcon 
        name={iconKey as any} 
        className={className} 
        style={style}
      />
    )
  }
  
  // Fallback to Folder icon if the icon doesn't exist
  return <Folder className={className} style={style} />
} 