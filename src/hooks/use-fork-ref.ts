import * as React from 'react';

/**
 * A utility hook for merging multiple refs into a single callback ref.
 * This is useful for forwarding refs while also maintaining a local ref.
 *
 * @param refs - An array of refs to be merged.
 * @returns A single callback ref or null.
 */
export function useForkRef<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> | null {
  return React.useCallback((instance: T | null) => {
    if (refs.every((ref) => ref == null)) {
      return;
    }

    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(instance);
      } else {
        // Type assertion to mutable ref object since we're setting the current value
        (ref as React.MutableRefObject<T | null>).current = instance;
      }
    });
  }, [...refs]);
} 