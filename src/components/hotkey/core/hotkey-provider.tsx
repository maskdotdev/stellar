import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { 
  HotkeyContext, 
  HotItem, 
  HotkeyMode, 
  buildPrefixes, 
  isUserActivelyEditing, 
  isElementInteractive,
 
} from '@/lib/core/hotkey-system';

interface HotkeyProviderProps {
  children: React.ReactNode;
  bufferTimeout?: number; // How long to wait before clearing the buffer
  showOverlayDelay?: number; // How long to wait before showing overlay
  enabled?: boolean; // Global enable/disable
  leaderKey?: string; // The leader key to trigger hotkey mode (default: ' ')
  requireConfirmation?: boolean; // Whether to require Enter confirmation or execute immediately on exact match
}

// Reducer state and actions
interface HotkeyState {
  items: HotItem[];
  prefixes: Record<string, string>;
  mode: HotkeyMode;
  currentBuffer: string;
}

type HotkeyAction =
  | { type: 'REGISTER_ITEM'; payload: HotItem }
  | { type: 'UNREGISTER_ITEM'; payload: string }
  | { type: 'SET_MODE'; payload: HotkeyMode }
  | { type: 'SET_BUFFER'; payload: string }
  | { type: 'CLEAR_BUFFER' }
  | { type: 'RECOMPUTE' };

const initialState: HotkeyState = {
  items: [],
  prefixes: {},
  mode: 'inactive',
  currentBuffer: ''
};

const hotkeyReducer = (state: HotkeyState, action: HotkeyAction): HotkeyState => {
  switch (action.type) {
    case 'REGISTER_ITEM': {
      const newItems = state.items.filter(item => item.label !== action.payload.label).concat(action.payload);
      return { ...state, items: newItems };
    }
    case 'UNREGISTER_ITEM': {
      const newItems = state.items.filter(item => item.label !== action.payload);
      return { ...state, items: newItems };
    }
    case 'SET_MODE':
      return { ...state, mode: action.payload };
    case 'SET_BUFFER':
      return { ...state, currentBuffer: action.payload };
    case 'CLEAR_BUFFER':
      return { ...state, mode: 'inactive', currentBuffer: '' };
    case 'RECOMPUTE': {
      const interactiveItems = state.items.filter(item =>
        item.ref.current && isElementInteractive(item.ref.current)
      );
      const labels = interactiveItems.map(item => item.label);
      const newPrefixes = buildPrefixes(labels);
      return { ...state, prefixes: newPrefixes };
    }
    default:
      return state;
  }
};

export const HotkeyProvider: React.FC<HotkeyProviderProps> = ({ 
  children, 
  bufferTimeout = 750,
  enabled = true,
  leaderKey = ' ', // Default to space key
  requireConfirmation = false
}) => {
  const [state, dispatch] = useReducer(hotkeyReducer, initialState);
  const { items, prefixes, mode, currentBuffer } = state;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  
  const bufferTimeoutRef = useRef<NodeJS.Timeout>();
  const prefixesRef = useRef(prefixes);
  prefixesRef.current = prefixes;

  // Register and unregister are now stable
  const register = useCallback((item: HotItem) => {
    dispatch({ type: 'REGISTER_ITEM', payload: item });
    return () => {
      dispatch({ type: 'UNREGISTER_ITEM', payload: item.label });
    };
  }, []);

  const unregister = useCallback((label: string) => {
    dispatch({ type: 'UNREGISTER_ITEM', payload: label });
  }, []);

  // Recompute prefixes when items change
  useEffect(() => {
    dispatch({ type: 'RECOMPUTE' });
  }, [items.length]);

  const clearBuffer = useCallback(() => {
    dispatch({ type: 'CLEAR_BUFFER' });
    clearTimeout(bufferTimeoutRef.current);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Handle Escape key FIRST - it should work everywhere
      if (e.key === 'Escape') {
        clearBuffer();
        
        // Blur the currently focused element if it's an input field
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable ||
          activeElement.closest('[role="textbox"]') ||
          activeElement.closest('.tiptap') ||
          activeElement.closest('.ProseMirror')
        )) {
          activeElement.blur();
        }
        return;
      }
      
      if (isUserActivelyEditing(target) || e.metaKey || e.ctrlKey || e.altKey) {
        clearBuffer();
        return;
      }

      if (e.key === leaderKey && mode === 'inactive') {
        e.preventDefault();
        dispatch({ type: 'SET_MODE', payload: 'leader' });
        bufferTimeoutRef.current = setTimeout(clearBuffer, bufferTimeout);
        return;
      }

      if (e.key === 'Enter' && mode === 'active' && currentBuffer) {
        e.preventDefault();
        const match = itemsRef.current.find(item => 
          prefixesRef.current[item.label] === currentBuffer &&
          item.ref.current &&
          isElementInteractive(item.ref.current)
        );
        
        if (match) {
          // Defer action to next tick to avoid conflicts with other keydown handlers
          setTimeout(() => {
            match.action ? match.action() : match.ref.current?.click?.();
          }, 0);
        }
        clearBuffer();
        return;
      }

      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && (mode === 'leader' || mode === 'active')) {
        e.preventDefault();
        const newBuffer = currentBuffer + e.key.toLowerCase();
        dispatch({ type: 'SET_BUFFER', payload: newBuffer });
        dispatch({ type: 'SET_MODE', payload: 'active' });
        
        clearTimeout(bufferTimeoutRef.current);
        bufferTimeoutRef.current = setTimeout(clearBuffer, bufferTimeout);

        const match = itemsRef.current.find(item => 
          prefixesRef.current[item.label] === newBuffer &&
          item.ref.current &&
          isElementInteractive(item.ref.current)
        );

        if (match) {
          if (requireConfirmation) {
            // Defer focus to next tick to avoid conflicts with other keydown handlers
            setTimeout(() => {
              match.ref.current?.focus();
            }, 0);
          } else {
            // Defer action to next tick to avoid conflicts with other keydown handlers  
            setTimeout(() => {
              match.action ? match.action() : match.ref.current?.click?.();
            }, 0);
            clearBuffer();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, mode, currentBuffer, bufferTimeout, clearBuffer, leaderKey, requireConfirmation]);

  // Recompute on DOM changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      dispatch({ type: 'RECOMPUTE' });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'disabled', 'aria-hidden']
    });

    return () => observer.disconnect();
  }, []);

  const contextValue = useMemo(() => ({
    register,
    unregister,
    mode,
    prefixes,
    currentBuffer,
    showOverlay: false, // Simplified, can be derived from mode if needed
    leaderKey,
    requireConfirmation
  }), [register, unregister, mode, prefixes, currentBuffer, leaderKey, requireConfirmation]);

  return (
    <HotkeyContext.Provider value={contextValue}>
      {children}
    </HotkeyContext.Provider>
  );
};

// Hook to use the hotkey context
export const useHotkeyContext = () => {
  const context = useContext(HotkeyContext);
  if (!context) {
    throw new Error('useHotkeyContext must be used within a HotkeyProvider');
  }
  return context;
};

// Hook to register a hotkey
export const useHotkey = (label: string, action?: () => void, options?: { group?: string; priority?: number }) => {
  const { register } = useHotkeyContext();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (label && ref.current) {
      const item: HotItem = {
        label,
        ref: ref as React.RefObject<HTMLElement>,
        action,
        group: options?.group,
        priority: options?.priority
      };
      const unregister = register(item);
      return unregister;
    }
  }, [label, action, options?.group, options?.priority, register]);

  return ref;
};

// Hook to get the prefix for a given label
export const useHotkeyPrefix = (label: string): string | undefined => {
  const { prefixes } = useHotkeyContext();
  return prefixes[label];
}; 

