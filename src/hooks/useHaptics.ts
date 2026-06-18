import { useCallback } from "react";

/**
 * A simple hook for triggering device haptics on mobile devices.
 * Gracefully fails on desktop browsers or unsupported devices.
 */
export function useHaptics() {
  const trigger = useCallback((pattern: number | number[]) => {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(pattern);
      } catch (e) {
        // Ignore errors (e.g., user hasn't interacted with document yet)
      }
    }
  }, []);

  const lightTap = useCallback(() => trigger(50), [trigger]);
  const heavyTap = useCallback(() => trigger(100), [trigger]);
  const success = useCallback(() => trigger([50, 100, 50]), [trigger]);
  const error = useCallback(() => trigger([50, 50, 50, 50, 100]), [trigger]);

  return { lightTap, heavyTap, success, error, trigger };
}
