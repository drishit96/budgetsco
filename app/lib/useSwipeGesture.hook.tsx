import { useRef, useCallback } from "react";

/**
 * Configuration options for the swipe gesture hook
 */
export interface SwipeGestureConfig {
  /** Callback function triggered when a left swipe is detected */
  onSwipeLeft?: () => void;
  /** Callback function triggered when a right swipe is detected */
  onSwipeRight?: () => void;
  /** Minimum distance in pixels required to register a swipe (default: 50) */
  minSwipeDistance?: number;
  /** Whether the gesture detection is disabled */
  disabled?: boolean;
  /** Whether the component is currently animating (prevents gestures during animations) */
  isAnimating?: boolean;
}

/**
 * Touch event handlers returned by the hook
 */
export interface SwipeGestureHandlers {
  /** Handler for touch start events */
  onTouchStart: (e: React.TouchEvent) => void;
  /** Handler for touch move events */
  onTouchMove: (e: React.TouchEvent) => void;
  /** Handler for touch end events */
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Custom hook for detecting horizontal swipe gestures
 *
 * This hook provides touch event handlers that can detect left and right swipe gestures
 * while properly handling edge cases like vertical scrolling and animation conflicts.
 *
 * @param config Configuration options for swipe detection
 * @returns Object containing touch event handlers
 *
 * @example
 * ```tsx
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => console.log('Swiped right'),
 *   minSwipeDistance: 50,
 *   disabled: false,
 *   isAnimating: false
 * });
 *
 * return (
 *   <div {...swipeHandlers}>
 *     Swipeable content
 *   </div>
 * );
 * ```
 */
export function useSwipeGesture(config: SwipeGestureConfig = {}): SwipeGestureHandlers {
  const {
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
    disabled = false,
    isAnimating = false,
  } = config;

  // Refs to track touch coordinates
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  /**
   * Resets touch coordinates to clean state
   */
  const resetTouchState = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  /**
   * Handles the start of a touch gesture
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Don't handle gestures if disabled or animating
      if (disabled || isAnimating) return;

      try {
        const touch = e.touches[0];
        if (touch) {
          touchStartX.current = touch.clientX;
          touchStartY.current = touch.clientY;
        }
      } catch (error) {
        // Reset state on any error
        resetTouchState();
      }
    },
    [disabled, isAnimating, resetTouchState]
  );

  /**
   * Handles touch movement during a gesture
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Don't handle if no initial touch or if disabled/animating
      if (!touchStartX.current || !touchStartY.current || disabled || isAnimating) {
        return;
      }

      try {
        const touch = e.touches[0];
        if (!touch) return;

        const deltaX = touchStartX.current - touch.clientX;
        const deltaY = touchStartY.current - touch.clientY;

        // Only handle horizontal swipes (ignore vertical scrolling)
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          return;
        }

        // Prevent default scrolling for horizontal swipes that exceed threshold
        if (Math.abs(deltaX) > 10) {
          e.preventDefault();
        }
      } catch (error) {
        // Reset state on any error
        resetTouchState();
      }
    },
    [disabled, isAnimating, resetTouchState]
  );

  /**
   * Handles the end of a touch gesture and determines if a swipe occurred
   */
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      // Don't handle if no initial touch or if disabled/animating
      if (!touchStartX.current || !touchStartY.current || disabled || isAnimating) {
        resetTouchState();
        return;
      }

      try {
        const touch = e.changedTouches[0];
        if (!touch) {
          resetTouchState();
          return;
        }

        const deltaX = touchStartX.current - touch.clientX;
        const deltaY = touchStartY.current - touch.clientY;

        // Only handle horizontal swipes (ignore vertical scrolling)
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          resetTouchState();
          return;
        }

        // Check if swipe distance meets minimum threshold
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            // Swipe left (finger moved from right to left)
            onSwipeLeft?.();
          } else {
            // Swipe right (finger moved from left to right)
            onSwipeRight?.();
          }
        }
      } catch (error) {
        // Silently handle errors and reset state
        console.warn("Error handling touch end event:", error);
      } finally {
        // Always reset touch state after processing
        resetTouchState();
      }
    },
    [disabled, isAnimating, minSwipeDistance, onSwipeLeft, onSwipeRight, resetTouchState]
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
