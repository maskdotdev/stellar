# Leader Key Hotkey System Usage

## Overview
The hotkey system supports a **leader key** (Space) that activates hotkey mode, showing indicators on interactive elements.

## How to Use

### 1. Activate Hotkey Mode
- Press **Space** when not in an editable field (like input boxes or text editors)
- You'll see a yellow indicator at the top center: "Hotkey Mode Active"
- All interactive elements will show small badges with their hotkey prefixes

### 2. Navigate with Hotkeys
- Type letters to match element labels (e.g., "l" for Library, "s" for Settings)
- As you type, you'll see:
  - Current typing buffer in the indicator
  - Elements get filtered to matching prefixes
  - The first potential match gets highlighted in yellow

### 3. Activate Elements
**Immediate Mode** (default):
- Actions execute immediately when you type the exact prefix
- Fast workflow for power users

**Confirmation Mode**:
- Press **Enter** to activate the focused element after typing
- Safer option, prevents accidental activations
- Press **Escape** to cancel hotkey mode

## Example Workflows

### Immediate Mode (default)
1. Press **Space** → Hotkey mode activates
2. Type **"l"** → Library view opens immediately

### Confirmation Mode
1. Press **Space** → Hotkey mode activates  
2. Type **"l"** → Library button gets focused
3. Press **Enter** → Library view opens

## Available Hotkeys (Navigation)

- **Focus** → Opens focus pane
- **Library** → Library view  
- **Graph** → Graph view
- **Workspace** → Workspace view
- **History** → History view
- **Sessions** → Sessions view
- **Analytics** → Analytics view
- **Settings** → Settings view
- **Toggle Theme** → Switch light/dark mode

## Features

- ✅ **Non-intrusive**: Only shows indicators when actively using hotkeys
- ✅ **Smart filtering**: Prefixes are automatically generated for uniqueness
- ✅ **Visual feedback**: Clear indication of current mode and typing progress
- ✅ **Configurable behavior**: Choose between immediate execution or confirmation
- ✅ **Escape hatch**: Always can press Escape to cancel
- ✅ **Auto-timeout**: Mode automatically deactivates after 750ms of inactivity

## Customization

Configure the leader key and confirmation behavior in the HotkeyProvider:

```tsx
<HotkeyProvider leaderKey=" " requireConfirmation={false}> 
  {/* Space key, immediate execution (default) */}
  
<HotkeyProvider leaderKey=" " requireConfirmation={true}>  
  {/* Space key, require Enter confirmation */}
  
<HotkeyProvider leaderKey="f" requireConfirmation={false}> 
  {/* F key, immediate execution */}
```

### Confirmation Modes

**Immediate Execution** (`requireConfirmation={false}`) - Default
- Type exact prefix → Action executes immediately
- Faster workflow for power users
- Indicator shows: "Type letters to activate elements"

**Confirmation Required** (`requireConfirmation={true}`)
- Type exact prefix → Element gets focused, wait for Enter
- Safer for beginners or when precision is important  
- Indicator shows: "Type letters to focus elements"
- Follow with Enter to activate 