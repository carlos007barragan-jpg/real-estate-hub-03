import { useState, useCallback, Dispatch, SetStateAction } from "react";

/**
 * Module-level cache that persists across page navigations.
 * Data stays in memory as long as the app is loaded.
 * When returning to a page, cached data renders instantly.
 */
const pageCache = new Map<string, any>();

/**
 * Drop-in replacement for useState that persists data in memory.
 * On first mount, initializes from cache if available.
 * Every state update also writes to cache.
 * 
 * Usage: const [data, setData] = useCachedState("leads-list", []);
 */
export function useCachedState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, _setState] = useState<T>(() => {
    const cached = pageCache.get(key);
    return cached !== undefined ? cached : initialValue;
  });

  const setState: Dispatch<SetStateAction<T>> = useCallback((action) => {
    _setState(prev => {
      const next = typeof action === 'function'
        ? (action as (prev: T) => T)(prev)
        : action;
      pageCache.set(key, next);
      return next;
    });
  }, [key]);

  return [state, setState];
}
