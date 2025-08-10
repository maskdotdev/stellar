/**
 * SelectionEventManager - Utility class for handling text selection events and validation
 * Provides static methods for selection validation, bounds calculation, and popover positioning
 */

export interface PopoverPosition {
  x: number;
  y: number;
  placement: 'top' | 'bottom';
  adjustedForViewport: boolean;
}

export class SelectionEventManager {
  /**
   * Validates if a selection exists and has meaningful content
   * @param selection - The browser Selection object
   * @param container - The container element to validate selection within
   * @returns true if selection is valid and has content
   */
  static isValidSelection(selection: Selection | null, container?: Element): boolean {
    // Check if selection exists
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    // Get the range from selection
    const range = selection.getRangeAt(0);
    
    // Check if range is collapsed (no actual selection)
    if (range.collapsed) {
      return false;
    }

    // Check if selection has meaningful text content
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length === 0) {
      return false;
    }

    // If container is provided, validate selection is within it
    if (container && !this.isSelectionWithinContainer(selection, container)) {
      return false;
    }

    return true;
  }

  /**
   * Calculates the bounding rectangle of a selection range
   * @param range - The Range object representing the selection
   * @returns DOMRect representing the bounds of the selection
   */
  static getSelectionBounds(range: Range): DOMRect {
    // Use getBoundingClientRect for accurate positioning
    const rect = range.getBoundingClientRect();
    
    // If the range spans multiple lines, we might get a zero-height rect
    // In that case, try to get bounds from the range's common ancestor
    if (rect.height === 0 && rect.width === 0) {
      const container = range.commonAncestorContainer;
      if (container.nodeType === Node.ELEMENT_NODE) {
        return (container as Element).getBoundingClientRect();
      } else if (container.parentElement) {
        return container.parentElement.getBoundingClientRect();
      }
    }

    return rect;
  }

  /**
   * Calculates the optimal position for a popover relative to a selection
   * @param bounds - The DOMRect bounds of the selection
   * @param container - The container element for boundary calculations
   * @param popoverHeight - Estimated height of the popover (default: 60px)
   * @param popoverWidth - Estimated width of the popover (default: 200px)
   * @returns PopoverPosition object with coordinates and placement info
   */
  static calculatePopoverPosition(
    bounds: DOMRect,
    container: Element,
    popoverHeight: number = 60,
    popoverWidth: number = 200
  ): PopoverPosition {
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate initial position above the selection
    let x = bounds.left + (bounds.width / 2) - (popoverWidth / 2);
    let y = bounds.top - popoverHeight - 8; // 8px gap above selection
    let placement: 'top' | 'bottom' = 'top';
    let adjustedForViewport = false;

    // Adjust horizontal position to stay within container bounds
    const containerLeft = containerRect.left;
    const containerRight = containerRect.right;
    
    if (x < containerLeft) {
      x = containerLeft + 8; // 8px padding from container edge
      adjustedForViewport = true;
    } else if (x + popoverWidth > containerRight) {
      x = containerRight - popoverWidth - 8; // 8px padding from container edge
      adjustedForViewport = true;
    }

    // Adjust horizontal position to stay within viewport
    if (x < 0) {
      x = 8; // 8px padding from viewport edge
      adjustedForViewport = true;
    } else if (x + popoverWidth > viewportWidth) {
      x = viewportWidth - popoverWidth - 8; // 8px padding from viewport edge
      adjustedForViewport = true;
    }

    // Check if there's enough space above the selection
    if (y < 0 || y < containerRect.top) {
      // Not enough space above, position below the selection
      y = bounds.bottom + 8; // 8px gap below selection
      placement = 'bottom';
      adjustedForViewport = true;
    }

    // Final check: if positioned below and it goes beyond viewport, try to fit above
    if (placement === 'bottom' && y + popoverHeight > viewportHeight) {
      const spaceAbove = bounds.top - containerRect.top;
      const spaceBelow = viewportHeight - bounds.bottom;
      
      if (spaceAbove > spaceBelow && spaceAbove >= popoverHeight) {
        // More space above, position there
        y = bounds.top - popoverHeight - 8;
        placement = 'top';
      } else {
        // Keep below but adjust to fit in viewport
        y = Math.max(viewportHeight - popoverHeight - 8, bounds.bottom + 8);
      }
      adjustedForViewport = true;
    }

    return {
      x: Math.round(x),
      y: Math.round(y),
      placement,
      adjustedForViewport
    };
  }

  /**
   * Validates if a selection is entirely within a specified container element
   * @param selection - The browser Selection object
   * @param container - The container element to check against
   * @returns true if the entire selection is within the container
   */
  static isSelectionWithinContainer(selection: Selection, container: Element): boolean {
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    
    // Check if the range's common ancestor is within the container
    const commonAncestor = range.commonAncestorContainer;
    
    // If common ancestor is the container itself, selection is within
    if (commonAncestor === container) {
      return true;
    }

    // If common ancestor is a text node, check its parent
    let ancestorElement: Element;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
      ancestorElement = commonAncestor.parentElement!;
    } else {
      ancestorElement = commonAncestor as Element;
    }

    // Check if the ancestor element is contained within the container
    return container.contains(ancestorElement);
  }

  /**
   * Helper method to get the current browser selection
   * @returns Selection object or null if no selection exists
   */
  static getCurrentSelection(): Selection | null {
    return window.getSelection();
  }

  /**
   * Helper method to clear the current selection
   */
  static clearSelection(): void {
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  /**
   * Helper method to check if selection spans multiple elements
   * @param selection - The browser Selection object
   * @returns true if selection spans multiple elements
   */
  static isMultiElementSelection(selection: Selection): boolean {
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // If start and end containers are different, it spans multiple elements
    return startContainer !== endContainer;
  }
}