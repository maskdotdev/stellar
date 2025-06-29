# 🎯 Hotkey System Usage Guide

A flexible, zero-boilerplate hotkey system that auto-generates collision-free prefixes using a trie algorithm.

## ✨ The Transformation

### Before (Boilerplate Hell 😢)
```tsx
// 20+ lines of boilerplate per component
const focusRef = useHotkey("Focus", () => setCurrentView("focus"))
const libraryRef = useHotkey("Library", () => setCurrentView("library"))
const focusPrefix = useHotkeyPrefix("Focus")
const libraryPrefix = useHotkeyPrefix("Library")

<Button ref={focusRef as any} className="relative" onClick={...}>
  <BookOpen />
  {focusPrefix && (
    <HotkeyIndicator 
      prefix={focusPrefix} 
      className="absolute -top-1 -right-1" 
    />
  )}
</Button>
```

### After (Pure Elegance ✨)
```tsx
// 1 line per component
<HotkeyWrapper hotkey="Focus" onAction={() => setCurrentView("focus")}>
  <Button onClick={() => setCurrentView("focus")}>
    <BookOpen />
  </Button>
</HotkeyWrapper>
```

## 🚀 Usage Patterns

### 1. Simple Wrapper (Recommended)
Just wrap any existing component:

```tsx
import { HotkeyWrapper } from "@/components/hotkey"

<HotkeyWrapper hotkey="Save Document" onAction={() => save()}>
  <Button>Save</Button>
</HotkeyWrapper>

<HotkeyWrapper hotkey="Delete Item" onAction={() => delete()}>
  <Button variant="destructive">Delete</Button>
</HotkeyWrapper>
```

### 2. Render Props (Full Control)
When you need complete control over ref and prefix display:

```tsx
<HotkeyWrapper hotkey="Search" onAction={() => openSearch()}>
  {({ ref, prefix }) => (
    <Button ref={ref} className="flex items-center gap-2">
      <Search className="h-4 w-4" />
      Search
      {prefix && <Badge>{prefix}</Badge>}
    </Button>
  )}
</HotkeyWrapper>
```

### 3. Indicator Positioning
Control where the hotkey badge appears:

```tsx
<HotkeyWrapper 
  hotkey="Settings" 
  onAction={() => openSettings()}
  indicatorPosition="top-left"    // top-right (default), top-left, bottom-right, bottom-left, inline
  showIndicator={true}            // Show/hide the badge
>
  <Button>Settings</Button>
</HotkeyWrapper>
```

### 4. Groups & Priority
Organize hotkeys and control prefix length:

```tsx
{/* Navigation items get high priority = shorter prefixes */}
<HotkeyWrapper 
  hotkey="Home" 
  onAction={() => goHome()}
  group="navigation"
  priority={10}
>
  <Button>Home</Button>
</HotkeyWrapper>

{/* Secondary actions get normal priority */}
<HotkeyWrapper 
  hotkey="Like Post" 
  onAction={() => like()}
  group="actions"
>
  <Button>Like</Button>
</HotkeyWrapper>
```

### 5. Higher-Order Components
Create enhanced components once, use everywhere:

```tsx
import { withHotkey } from "@/components/hotkey/utils"

const HotkeyButton = withHotkey(Button)
const HotkeyCard = withHotkey(Card)

// Usage
<HotkeyButton 
  hotkey="Enhanced Save" 
  onAction={() => save()}
  variant="default"
>
  Save
</HotkeyButton>

<HotkeyCard 
  hotkey="Interactive Card" 
  onAction={() => selectCard()}
  className="cursor-pointer"
>
  <CardContent>Click me!</CardContent>
</HotkeyCard>
```

## 🎮 How It Works

1. **Type any letter** → Enter hotkey mode
2. **Auto-generated prefixes** → Collision-free using trie algorithm  
3. **Visual feedback** → Overlay shows available hotkeys
4. **Smart filtering** → Prefixes update as you type
5. **Enter to activate** → Executes the matched action
6. **Escape to cancel** → Clears the buffer

## 🎨 Customization

### Custom Indicator Styles
```tsx
<HotkeyWrapper 
  hotkey="Custom Style"
  onAction={() => {}}
  indicatorClassName="bg-red-500 text-white"
>
  <Button>Styled Hotkey</Button>
</HotkeyWrapper>
```

### Different Wrapper Elements
```tsx
<HotkeyWrapper 
  hotkey="Span Wrapper"
  onAction={() => {}}
  as="span"                // Use span instead of div
  className="inline-flex"
>
  <Button>Inline Button</Button>
</HotkeyWrapper>
```

## 📦 Imports

```tsx
// Everything you need
import { HotkeyWrapper } from "@/components/hotkey"

// Or use the convenience index
import { 
  HotkeyWrapper, 
  HotkeyButton, 
  withHotkey,
  useSimpleHotkey 
} from "@/components/hotkey"
```

## 🚀 Setup (Already Done!)

The system is already integrated in your app:

1. ✅ `HotkeyProvider` wraps your entire app
2. ✅ `HotkeyOverlay` shows visual feedback  
3. ✅ Smart context detection (doesn't interfere with text editing)
4. ✅ Works with existing static keybindings (⌘K, ⌘1, etc.)

## 💡 Pro Tips

- **Use descriptive labels**: "Save Document" vs "Save" → Better prefix generation
- **Group related actions**: Navigation, editing, etc. → Organized overlay
- **Set priorities**: Important actions get shorter prefixes
- **Test with many items**: The trie algorithm shines with lots of elements

## 🔥 Real-World Example

```tsx
// Navigation rail with hotkeys
{navItems.map((item) => (
  <HotkeyWrapper
    key={item.id}
    hotkey={item.label}
    onAction={() => setCurrentView(item.id)}
    group="navigation"
  >
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <item.icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{item.label}</TooltipContent>
    </Tooltip>
  </HotkeyWrapper>
))}
```

That's it! **Zero boilerplate, maximum flexibility.** 🎯 