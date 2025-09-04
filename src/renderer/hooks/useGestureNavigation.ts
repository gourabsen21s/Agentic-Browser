import { useEffect, useCallback, useRef } from 'react';

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onTwoFingerSwipeLeft?: () => void;
  onTwoFingerSwipeRight?: () => void;
  onTwoFingerSwipeUp?: () => void;
  onTwoFingerSwipeDown?: () => void;
  onThreeFingerSwipeLeft?: () => void;
  onThreeFingerSwipeRight?: () => void;
  onThreeFingerSwipeUp?: () => void;
  onThreeFingerSwipeDown?: () => void;
  onLongPress?: (x: number, y: number) => void;
  onDoubleTap?: (x: number, y: number) => void;
  onRotate?: (angle: number) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
  id: number;
}

interface GestureState {
  type: 'none' | 'swipe' | 'pinch' | 'rotate' | 'longpress' | 'tap';
  fingerCount: number;
  startTime: number;
  lastUpdateTime: number;
}

export const useGestureNavigation = (callbacks: GestureCallbacks) => {
  // Early return if no callbacks provided
  if (!callbacks || Object.keys(callbacks).length === 0) {
    console.log('[Gestures] No callbacks provided, gesture navigation disabled');
    return;
  }

  console.log('[Gestures] Initializing gesture navigation with callbacks:', Object.keys(callbacks));
  const touchPoints = useRef<Map<number, TouchPoint>>(new Map());
  const gestureState = useRef<GestureState>({
    type: 'none',
    fingerCount: 0,
    startTime: 0,
    lastUpdateTime: 0
  });
  const initialDistance = useRef<number>(0);
  const initialAngle = useRef<number>(0);
  const lastTapTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Configuration constants - improved sensitivity for better UX
  const MIN_SWIPE_DISTANCE = 60; // Reduced for better sensitivity
  const MAX_SWIPE_TIME = 800; // Increased for easier gestures
  const MIN_PINCH_DISTANCE_CHANGE = 30; // Reduced for better sensitivity
  const LONG_PRESS_DURATION = 500;
  const DOUBLE_TAP_MAX_DELAY = 300;
  const MIN_ROTATION_ANGLE = 15;
  const MAX_TAP_DISTANCE = 20;

  // Utility functions
  const getDistance = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getAngle = (p1: TouchPoint, p2: TouchPoint): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  };

  const getCenterPoint = (points: TouchPoint[]): TouchPoint => {
    const avgX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x: avgX, y: avgY, timestamp: Date.now(), id: -1 };
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    clearLongPressTimer();
    
    const now = Date.now();
    const fingerCount = e.touches.length;

    console.log(`[Gestures] Touch start: ${fingerCount} finger(s)`);

    // Update touch points
    touchPoints.current.clear();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      touchPoints.current.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now,
        id: touch.identifier
      });
    }

    // Initialize gesture state
    gestureState.current = {
      type: 'none',
      fingerCount,
      startTime: now,
      lastUpdateTime: now
    };

    // Set up gesture detection based on finger count
    if (fingerCount === 1) {
      const touch = e.touches[0];
      const touchPoint = { x: touch.clientX, y: touch.clientY, timestamp: now, id: touch.identifier };
      
      // Check for double tap
      if (now - lastTapTime.current < DOUBLE_TAP_MAX_DELAY) {
        callbacks.onDoubleTap?.(touchPoint.x, touchPoint.y);
        lastTapTime.current = 0; // Reset to prevent triple tap
        return;
      }

      // Set up long press detection
      longPressTimer.current = setTimeout(() => {
        if (gestureState.current.type === 'none') {
          gestureState.current.type = 'longpress';
          callbacks.onLongPress?.(touchPoint.x, touchPoint.y);
        }
      }, LONG_PRESS_DURATION);

    } else if (fingerCount === 2) {
      const points = Array.from(touchPoints.current.values());
      initialDistance.current = getDistance(points[0], points[1]);
      initialAngle.current = getAngle(points[0], points[1]);
      
    } else if (fingerCount >= 3) {
      // Three or more finger gesture
      gestureState.current.type = 'swipe';
    }
  }, [callbacks]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    
    if (touchPoints.current.size === 0) return;

    const now = Date.now();
    const fingerCount = e.touches.length;

    // Update touch points
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const existingPoint = touchPoints.current.get(touch.identifier);
      if (existingPoint) {
        touchPoints.current.set(touch.identifier, {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: now,
          id: touch.identifier
        });
      }
    }

    gestureState.current.lastUpdateTime = now;

    if (fingerCount === 2) {
      const points = Array.from(touchPoints.current.values());
      if (points.length === 2) {
        const currentDistance = getDistance(points[0], points[1]);
        const currentAngle = getAngle(points[0], points[1]);
        
        // Detect pinch
        const distanceChange = currentDistance - initialDistance.current;
        if (Math.abs(distanceChange) > MIN_PINCH_DISTANCE_CHANGE) {
          if (gestureState.current.type === 'none') {
            gestureState.current.type = 'pinch';
            clearLongPressTimer();
          }
        }

        // Detect rotation
        const angleDiff = Math.abs(currentAngle - initialAngle.current);
        if (angleDiff > MIN_ROTATION_ANGLE && angleDiff < 180 - MIN_ROTATION_ANGLE) {
          if (gestureState.current.type === 'none') {
            gestureState.current.type = 'rotate';
            clearLongPressTimer();
          }
        }
      }
    }

    // Clear long press if finger moved too much
    if (fingerCount === 1 && gestureState.current.type === 'none') {
      const points = Array.from(touchPoints.current.values());
      const startPoint = points[0];
      const currentTouch = e.touches[0];
      const moveDistance = Math.sqrt(
        Math.pow(currentTouch.clientX - startPoint.x, 2) + 
        Math.pow(currentTouch.clientY - startPoint.y, 2)
      );
      
      if (moveDistance > MAX_TAP_DISTANCE) {
        clearLongPressTimer();
        gestureState.current.type = 'swipe';
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    clearLongPressTimer();
    
    const now = Date.now();
    const fingerCount = gestureState.current.fingerCount;
    const startTime = gestureState.current.startTime;
    const gestureType = gestureState.current.type;

    console.log(`[Gestures] Touch end: ${fingerCount} finger(s), type: ${gestureType}`);

    if (fingerCount === 1 && gestureType === 'swipe') {
      // Single finger swipe
      const points = Array.from(touchPoints.current.values());
      if (points.length > 0) {
        const startPoint = points[0];
        const endTouch = e.changedTouches[0];
        
        const deltaX = endTouch.clientX - startPoint.x;
        const deltaY = endTouch.clientY - startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = now - startTime;

        console.log(`[Gestures] Single finger swipe: distance=${distance}, duration=${duration}`);

        if (distance > MIN_SWIPE_DISTANCE && duration < MAX_SWIPE_TIME) {
          const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI);
          
          if (angle < 45) {
            // Horizontal swipe
            if (deltaX > 0) {
              console.log('[Gestures] Single finger swipe right');
              callbacks.onSwipeRight?.();
            } else {
              console.log('[Gestures] Single finger swipe left');
              callbacks.onSwipeLeft?.();
            }
          } else {
            // Vertical swipe
            if (deltaY > 0) {
              console.log('[Gestures] Single finger swipe down');
              callbacks.onSwipeDown?.();
            } else {
              console.log('[Gestures] Single finger swipe up');
              callbacks.onSwipeUp?.();
            }
          }
        }
      }
    } else if (fingerCount === 2) {
      // Two finger gestures
      if (gestureType === 'pinch') {
        const points = Array.from(touchPoints.current.values());
        if (points.length === 2) {
          const finalDistance = getDistance(points[0], points[1]);
          const distanceChange = finalDistance - initialDistance.current;
          
          if (distanceChange > MIN_PINCH_DISTANCE_CHANGE) {
            callbacks.onPinchOut?.();
          } else if (distanceChange < -MIN_PINCH_DISTANCE_CHANGE) {
            callbacks.onPinchIn?.();
          }
        }
      } else if (gestureType === 'rotate') {
        const points = Array.from(touchPoints.current.values());
        if (points.length === 2) {
          const finalAngle = getAngle(points[0], points[1]);
          const angleDiff = finalAngle - initialAngle.current;
          callbacks.onRotate?.(angleDiff);
        }
      } else if (gestureType === 'swipe') {
        // Two finger swipe
        const points = Array.from(touchPoints.current.values());
        if (points.length === 2) {
          const centerStart = getCenterPoint(points);
          
          // Calculate average movement
          let totalDeltaX = 0;
          let totalDeltaY = 0;
          
          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const startPoint = touchPoints.current.get(touch.identifier);
            if (startPoint) {
              totalDeltaX += touch.clientX - startPoint.x;
              totalDeltaY += touch.clientY - startPoint.y;
            }
          }
          
          const avgDeltaX = totalDeltaX / e.changedTouches.length;
          const avgDeltaY = totalDeltaY / e.changedTouches.length;
          const distance = Math.sqrt(avgDeltaX * avgDeltaX + avgDeltaY * avgDeltaY);
          const duration = now - startTime;

          if (distance > MIN_SWIPE_DISTANCE && duration < MAX_SWIPE_TIME) {
            const angle = Math.atan2(Math.abs(avgDeltaY), Math.abs(avgDeltaX)) * (180 / Math.PI);
            
            if (angle < 45) {
              // Horizontal swipe
              if (avgDeltaX > 0) {
                callbacks.onTwoFingerSwipeRight?.();
              } else {
                callbacks.onTwoFingerSwipeLeft?.();
              }
            } else {
              // Vertical swipe
              if (avgDeltaY > 0) {
                callbacks.onTwoFingerSwipeDown?.();
              } else {
                callbacks.onTwoFingerSwipeUp?.();
              }
            }
          }
        }
      }
    } else if (fingerCount >= 3 && gestureType === 'swipe') {
      // Three finger swipe
      let totalDeltaX = 0;
      let totalDeltaY = 0;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const startPoint = touchPoints.current.get(touch.identifier);
        if (startPoint) {
          totalDeltaX += touch.clientX - startPoint.x;
          totalDeltaY += touch.clientY - startPoint.y;
        }
      }
      
      const avgDeltaX = totalDeltaX / e.changedTouches.length;
      const avgDeltaY = totalDeltaY / e.changedTouches.length;
      const distance = Math.sqrt(avgDeltaX * avgDeltaX + avgDeltaY * avgDeltaY);
      const duration = now - startTime;

      if (distance > MIN_SWIPE_DISTANCE && duration < MAX_SWIPE_TIME) {
        const angle = Math.atan2(Math.abs(avgDeltaY), Math.abs(avgDeltaX)) * (180 / Math.PI);
        
        if (angle < 45) {
          // Horizontal swipe
          if (avgDeltaX > 0) {
            callbacks.onThreeFingerSwipeRight?.();
          } else {
            callbacks.onThreeFingerSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (avgDeltaY > 0) {
            callbacks.onThreeFingerSwipeDown?.();
          } else {
            callbacks.onThreeFingerSwipeUp?.();
          }
        }
      }
    } else if (fingerCount === 1 && gestureType === 'none') {
      // Single tap
      lastTapTime.current = now;
    }

    // Reset state
    if (e.touches.length === 0) {
      touchPoints.current.clear();
      gestureState.current = {
        type: 'none',
        fingerCount: 0,
        startTime: 0,
        lastUpdateTime: 0
      };
    }
  }, [callbacks]);

  useEffect(() => {
    // Use main app container for better scope
    const element = document.getElementById('root') || document.body;
    
    console.log('[Gestures] Adding touch event listeners to:', element.tagName);
    
    // Use capture phase for better event handling
    const options = { passive: false, capture: true };
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, options);
    element.addEventListener('touchcancel', handleTouchEnd, options); // Handle touch cancel

    return () => {
      console.log('[Gestures] Removing touch event listeners');
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
};