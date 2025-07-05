import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { DynamicIcon } from "./dynamic-icon"

// Curated list of commonly used icons instead of importing all icons
const availableIcons = [
  "folder", "code", "calculator", "beaker", "book-marked", "globe", "palette",
  "book", "heart", "star", "home", "user", "settings", "search", "mail", 
  "phone", "calendar", "clock", "tag", "bookmark", "camera", "image", 
  "music", "video", "database", "server", "shield", "lock", "key",
  "file-text", "folder-open", "graduation-cap", "brain", "lightbulb",
  "target", "trending-up", "activity", "bar-chart", "pie-chart",
  "layers", "grid", "list", "map", "compass", "award", "trophy",
  "gift", "package", "shopping-cart", "credit-card", "dollar-sign",
  "users", "user-check", "user-plus", "message-circle", "phone-call",
  "wifi", "bluetooth", "cpu", "hard-drive", "smartphone", "laptop",
  "monitor", "printer", "headphones", "mouse", "keyboard", "gamepad",
  "play", "pause", "skip-forward", "skip-back", "volume-2",
  "edit", "copy", "trash", "download", "upload",
  "save", "refresh-cw", "rotate-ccw", "undo", "redo", "zoom-in",
  "zoom-out", "maximize", "minimize", "eye", "eye-off", "bell",
  "bell-off", "flag", "bookmark", "share", "external-link", "link",
  "paperclip", "scissors", "rulers", "pen-tool", "type", "bold",
  "italic", "underline", "align-left", "align-center", "align-right"
]

const popularIcons = [
  "folder", "code", "calculator", "beaker", "book-marked", "globe", "palette",
  "book", "heart", "star", "home", "user", "settings", "search", "mail", 
  "phone", "calendar", "clock", "tag", "bookmark", "camera", "image", 
  "music", "video", "database", "server", "shield", "lock", "key"
]

interface IconComboboxProps {
  selectedIcon: string
  onIconSelect: (iconKey: string) => void
  selectedColor: string
}

export function IconCombobox({ selectedIcon, onIconSelect, selectedColor }: IconComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show popular icons first, then others
      const popular = popularIcons.filter(name => availableIcons.includes(name))
      const remaining = availableIcons
        .filter(name => !popularIcons.includes(name))
        .slice(0, 50) // Limit for performance
      return [...popular, ...remaining]
    }
    
    const query = searchQuery.toLowerCase()
    return availableIcons
      .filter(name => 
        name.toLowerCase().includes(query) || 
        name.replace(/[-_]/g, ' ').toLowerCase().includes(query)
      )
      .slice(0, 50) // Limit results for performance
  }, [searchQuery])

  const handleIconSelect = (iconKey: string) => {
    onIconSelect(iconKey)
    setOpen(false)
    setSearchQuery("")
  }

  const getIconDisplayName = (iconName: string) => {
    return iconName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Icon</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between h-12"
            >
              <div className="flex items-center space-x-2">
                <DynamicIcon 
                  iconKey={selectedIcon}
                  className="h-5 w-5" 
                  style={{ color: selectedColor }}
                />
                <span>{getIconDisplayName(selectedIcon)}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput 
                placeholder="Search icons..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-72">
                <CommandEmpty>No icon found.</CommandEmpty>
                <CommandGroup>
                  {filteredIcons.map((iconName) => (
                    <CommandItem
                      key={iconName}
                      value={iconName}
                      onSelect={() => handleIconSelect(iconName)}
                      className="flex items-center space-x-2"
                    >
                      <DynamicIcon 
                        iconKey={iconName}
                        className="h-4 w-4" 
                        style={{ color: selectedColor }}
                      />
                      <span>{getIconDisplayName(iconName)}</span>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedIcon === iconName ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
} 