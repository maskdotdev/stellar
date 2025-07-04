// Core hotkey system with trie-based prefix generation
import { createContext } from 'react';

export type HotItem = { 
  label: string; 
  ref: React.RefObject<HTMLElement>;
  action?: () => void;
  group?: string;
  priority?: number; // Higher priority = shorter prefix when possible
};

export type HotkeyMode = 'inactive' | 'active' | 'showing' | 'leader';

// Trie-based prefix generation (from your design)
export function buildPrefixes(labels: string[]): Record<string, string> {
  // Phase 1: walk a trie counting how many labels share each prefix
  const counter: Record<string, number> = {};
  
  labels.forEach(label => {
    const normalized = normalizeLabel(label);
    for (let i = 1; i <= normalized.length; i++) {
      const prefix = normalized.slice(0, i);
      counter[prefix] = (counter[prefix] ?? 0) + 1;
    }
  });

  // Phase 2: first prefix whose count === 1 is guaranteed unique
  const result: Record<string, string> = {};
  labels.forEach(label => {
    const normalized = normalizeLabel(label);
    for (let i = 1; i <= normalized.length; i++) {
      const prefix = normalized.slice(0, i);
      if (counter[prefix] === 1) { 
        result[label] = prefix; 
        break; 
      }
    }
    // Fallback: use full normalized label if no unique prefix found
    if (!result[label]) {
      result[label] = normalized;
    }
  });
  
  return result;
}

// Label normalization with smart preprocessing
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '') // Remove whitespace
    .replace(/[^\w]/g, '') // Remove non-word characters
    .replace(/^(the|a|an)\b/i, '') // Remove articles
    .trim();
}

// Check if user is actively editing (enhanced from your current logic)
export function isUserActivelyEditing(target?: HTMLElement): boolean {
  if (!target) target = document.activeElement as HTMLElement;
  if (!target) return false;

  // Basic input/textarea/contentEditable check
  if (
    target.tagName === "INPUT" || 
    target.tagName === "TEXTAREA" || 
    target.isContentEditable
  ) {
    return true;
  }
  
  // Check for TipTap editor elements
  if (
    target.closest('.tiptap') ||
    target.closest('[data-tiptap-editor]') ||
    target.closest('.ProseMirror') ||
    target.closest('.tiptap-editor') ||
    target.closest('[data-editor]') ||
    target.closest('.editor-content')
  ) {
    return true;
  }
  
  // Allow shortcuts in command palette for navigation
  if (target.closest('[data-slot="command-input"]')) {
    return false;
  }
  
  // Other editor contexts
  if (
    target.closest('.monaco-editor') ||
    target.closest('.cm-editor') ||
    target.closest('[role="textbox"]') ||
    target.closest('[data-slot="textarea"]') ||
    target.closest('[data-slot="input"]') ||
    target.closest('.simple-editor') ||
    target.hasAttribute('contenteditable')
  ) {
    return true;
  }
  
  return false;
}

// Check if element is visible and interactive
export function isElementInteractive(element: HTMLElement): boolean {
  if (!element || !document.contains(element)) return false;
  
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0 &&
    !element.hasAttribute('disabled') &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}

// Hotkey context type
export interface HotkeyContextType {
  register: (item: HotItem) => void;
  unregister: (label: string) => void;
  mode: HotkeyMode;
  prefixes: Record<string, string>;
  currentBuffer: string;
  showOverlay: boolean;
  leaderKey: string;
  requireConfirmation: boolean;
}

export const HotkeyContext = createContext<HotkeyContextType | null>(null); 