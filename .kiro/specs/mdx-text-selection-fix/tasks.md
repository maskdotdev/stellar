# Implementation Plan

- [x] 1. Create text selection hook with proper event handling
  - Implement `useTextSelection` hook that uses `selectionchange` event instead of interfering mouse events
  - Add debouncing logic to prevent excessive selection updates
  - Include selection validation to ensure selection is within target container
  - Add proper cleanup of event listeners to prevent memory leaks
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Create selection event manager utility
  - Implement `SelectionEventManager` class with static methods for selection validation
  - Add `isValidSelection` method to check if selection exists and has content
  - Add `getSelectionBounds` method to calculate selection rectangle
  - Add `calculatePopoverPosition` method for positioning logic
  - Add `isSelectionWithinContainer` method to validate selection scope
  - _Requirements: 1.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Enhance MDXRenderer component for proper text selection
  - Remove the existing `onMouseUp` prop that interferes with native selection
  - Integrate the new `useTextSelection` hook into MDXRenderer
  - Add `onTextSelection` callback prop for handling selection events
  - Add `enableTextSelection` prop to control selection behavior
  - Ensure ReactMarkdown components don't interfere with selection
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 4. Enhance TextSelectionPopover positioning system
  - Update popover to accept `selectionRange` and `containerRef` props
  - Implement improved positioning algorithm that accounts for container bounds
  - Add scroll-aware positioning updates using scroll event listeners
  - Implement viewport boundary detection and adjustment
  - Add proper z-index management for MDX content
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Create selection testing utilities
  - Implement `createMockSelection` utility for simulating text selections in tests
  - Create `simulateTextSelection` helper for integration tests
  - Add `getSelectionBounds` test utility for position verification
  - Create `waitForPopover` helper for async popover testing
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Write unit tests for text selection hook
  - Test `useTextSelection` hook with various selection scenarios
  - Verify debouncing behavior with rapid selection changes
  - Test selection validation logic with valid and invalid selections
  - Test cleanup behavior when component unmounts
  - Test selection detection across different content types
  - _Requirements: 4.1, 4.2, 4.5_

- [ ] 7. Write unit tests for selection event manager
  - Test `isValidSelection` with various selection states
  - Test `getSelectionBounds` with different selection ranges
  - Test `calculatePopoverPosition` with various container sizes
  - Test `isSelectionWithinContainer` with selections inside and outside container
  - Test edge cases like empty selections and invalid ranges
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 8. Write unit tests for enhanced MDXRenderer
  - Test MDXRenderer with text selection enabled and disabled
  - Verify that selection events are properly handled without interference
  - Test selection behavior across different MDX content types (paragraphs, headings, lists, code blocks)
  - Test that ReactMarkdown components don't break selection
  - _Requirements: 4.1, 4.4, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 9. Write unit tests for enhanced TextSelectionPopover
  - Test popover positioning with various selection bounds
  - Test scroll-aware position updates
  - Test viewport boundary handling and position adjustment
  - Test popover appearance and disappearance based on selection state
  - Test z-index management and overlay behavior
  - _Requirements: 4.1, 4.2, 4.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 10. Create integration tests for complete selection flow
  - Test end-to-end flow: select text → popover appears → interact → selection clears
  - Test selection across different MDX content types in a single document
  - Test popover positioning accuracy with real DOM measurements
  - Test selection persistence and popover movement when scrolling
  - Test selection clearing when clicking outside or pressing escape
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 1.1, 1.2, 2.1, 2.3, 2.4_

- [ ] 11. Add error handling and edge case management
  - Add error boundaries for selection-related components
  - Implement graceful degradation when Selection API is unavailable
  - Handle edge cases where selection spans multiple containers
  - Add error logging for debugging without breaking user experience
  - Test error scenarios and recovery behavior
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 12. Wire together all components in document renderer
  - Update document rendering components to use enhanced MDXRenderer
  - Connect TextSelectionPopover with the new selection system
  - Ensure proper prop passing and event handling throughout the component tree
  - Test the complete integration in the actual document viewing context
  - Verify that existing functionality remains unaffected
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_