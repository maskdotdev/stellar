# Design Document

## Overview

The MDX text selection issue stems from event handling conflicts and DOM manipulation problems within the ReactMarkdown component. The current implementation has an `onMouseUp` prop that may interfere with native text selection behavior, and the text selection popover positioning logic needs to be more robust to handle the dynamic nature of MDX content.

This design addresses the core issues by:
1. Implementing proper text selection event handling that doesn't interfere with native browser behavior
2. Creating a robust text selection detection system that works with ReactMarkdown's rendered DOM
3. Ensuring the popover positioning system works correctly with MDX content
4. Adding comprehensive testing to prevent regressions

## Architecture

### Component Structure
```
MDXRenderer (Enhanced)
├── Text Selection Handler (New)
├── Selection Event Manager (New)
├── TextSelectionPopover (Enhanced)
└── ReactMarkdown (Existing)
```

### Event Flow
1. User initiates text selection in MDX content
2. Selection Handler captures selection events without interfering
3. Selection Event Manager validates and processes selection
4. TextSelectionPopover positions and displays above selection
5. User interacts with popover or dismisses selection

## Components and Interfaces

### Enhanced MDXRenderer Component

The MDXRenderer will be enhanced with proper text selection handling:

```typescript
interface MDXRendererProps {
  content: string;
  className?: string;
  onTextSelection?: (selectedText: string, range: Range) => void;
  enableTextSelection?: boolean;
}

interface TextSelectionState {
  selectedText: string;
  range: Range | null;
  isActive: boolean;
}
```

Key enhancements:
- Remove conflicting `onMouseUp` handler that interferes with selection
- Add dedicated text selection detection logic
- Implement proper event delegation for selection events
- Ensure compatibility with ReactMarkdown's component structure

### Text Selection Handler

A new hook to manage text selection without interfering with native behavior:

```typescript
interface UseTextSelectionOptions {
  onSelectionChange?: (selection: TextSelectionState) => void;
  minSelectionLength?: number;
  debounceMs?: number;
}

interface UseTextSelectionReturn {
  selectionState: TextSelectionState;
  clearSelection: () => void;
  isSelectionActive: boolean;
}
```

Features:
- Non-intrusive selection detection using `selectionchange` event
- Debounced selection processing to avoid excessive updates
- Validation of selection within the target container
- Proper cleanup of event listeners

### Enhanced TextSelectionPopover

The existing popover will be enhanced for better MDX compatibility:

```typescript
interface TextSelectionPopoverProps {
  selectedText: string;
  selectionRange: Range | null;
  containerRef: React.RefObject<HTMLElement>;
  onAsk: () => void;
  onNote: () => void;
  onClose: () => void;
  // ... existing props
}
```

Enhancements:
- Improved positioning algorithm that accounts for MDX container bounds
- Better handling of selection range changes
- Scroll-aware positioning updates
- Proper z-index management for MDX content

### Selection Event Manager

A utility class to handle complex selection scenarios:

```typescript
class SelectionEventManager {
  static isValidSelection(selection: Selection, container: Element): boolean;
  static getSelectionBounds(range: Range): DOMRect;
  static calculatePopoverPosition(bounds: DOMRect, container: Element): Position;
  static isSelectionWithinContainer(selection: Selection, container: Element): boolean;
}
```

## Data Models

### TextSelection Model
```typescript
interface TextSelection {
  text: string;
  range: Range;
  bounds: DOMRect;
  containerElement: Element;
  timestamp: number;
}
```

### PopoverPosition Model
```typescript
interface PopoverPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  adjustedForViewport: boolean;
}
```

## Error Handling

### Selection Validation
- Validate that selection exists and has content
- Ensure selection is within the MDX container
- Handle edge cases where selection spans multiple containers
- Graceful degradation when selection APIs are unavailable

### Popover Positioning Errors
- Fallback positioning when calculated position is off-screen
- Handle cases where container bounds cannot be determined
- Manage z-index conflicts with other UI elements

### Event Handler Errors
- Prevent event handler errors from breaking text selection
- Implement error boundaries for selection-related components
- Log selection errors for debugging without breaking user experience

## Testing Strategy

### Unit Tests
1. **Text Selection Detection**
   - Test selection event handling without DOM interference
   - Verify selection validation logic
   - Test debouncing and cleanup behavior

2. **Popover Positioning**
   - Test position calculation algorithms
   - Verify viewport boundary handling
   - Test scroll-aware position updates

3. **MDX Integration**
   - Test selection across different MDX elements (headings, paragraphs, lists, code blocks)
   - Verify compatibility with ReactMarkdown components
   - Test custom component selection handling

### Integration Tests
1. **End-to-End Selection Flow**
   - User selects text → popover appears → user interacts → selection clears
   - Test across different content types in MDX
   - Verify popover positioning accuracy

2. **Cross-Browser Compatibility**
   - Test selection behavior in Chrome, Firefox, Safari
   - Verify touch selection on mobile devices
   - Test keyboard navigation compatibility

3. **Performance Tests**
   - Measure selection detection latency
   - Test with large MDX documents
   - Verify memory cleanup after selection events

### Visual Regression Tests
1. **Popover Appearance**
   - Screenshot tests for popover positioning
   - Test popover appearance across themes
   - Verify popover styling consistency

2. **Selection Highlighting**
   - Test native selection highlighting preservation
   - Verify selection appearance across different content types
   - Test selection highlighting in dark/light themes

### Automated Testing Setup
- Use React Testing Library for component testing
- Implement custom selection simulation utilities
- Use Playwright for cross-browser integration tests
- Set up visual regression testing with Percy or similar

## Implementation Approach

### Phase 1: Core Selection Handling
1. Implement UseTextSelection hook with proper event handling
2. Enhance MDXRenderer to use new selection system
3. Remove conflicting event handlers

### Phase 2: Popover Enhancement
1. Improve TextSelectionPopover positioning logic
2. Add container-aware positioning
3. Implement scroll-aware updates

### Phase 3: Testing Infrastructure
1. Create selection testing utilities
2. Implement unit tests for all components
3. Set up integration test suite

### Phase 4: Cross-Content Compatibility
1. Test and fix selection across all MDX content types
2. Handle edge cases for complex selections
3. Optimize performance for large documents

## Technical Considerations

### Browser Compatibility
- Use standard Selection API (supported in all modern browsers)
- Implement fallbacks for older browsers if needed
- Handle touch selection events for mobile devices

### Performance Optimization
- Debounce selection change events to avoid excessive processing
- Use RAF for smooth popover position updates
- Implement efficient cleanup to prevent memory leaks

### Accessibility
- Ensure selection behavior works with screen readers
- Maintain keyboard navigation compatibility
- Preserve native selection announcement behavior

### Security
- Sanitize selected text before processing
- Validate selection ranges to prevent XSS
- Ensure popover positioning cannot be exploited