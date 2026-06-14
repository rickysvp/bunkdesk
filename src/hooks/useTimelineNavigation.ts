import { useEffect, useCallback, useRef } from 'react';
import { addDays, subDays, startOfDay } from 'date-fns';

interface UseTimelineNavigationOptions {
  goBack: () => void;
  goForward: () => void;
  goToday: () => void;
  onEscape?: () => void;
}

/**
 * Keyboard navigation hook for timeline view.
 * ArrowLeft/Right: navigate weeks
 * Home: jump to today
 * Escape: close modals / clear selection
 */
export function useTimelineNavigation({
  goBack,
  goForward,
  goToday,
  onEscape,
}: UseTimelineNavigationOptions) {
  // Use refs to avoid re-registering the listener on every render
  const handlersRef = useRef({ goBack, goForward, goToday, onEscape });
  handlersRef.current = { goBack, goForward, goToday, onEscape };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        h.goBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        h.goForward();
      } else if (e.key === 'Home') {
        e.preventDefault();
        h.goToday();
      } else if (e.key === 'Escape') {
        h.onEscape?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

/**
 * Stable callbacks for timeline date navigation.
 */
export function useTimelineDateNavigation(startDate: Date, setStartDate: (d: Date) => void) {
  const goBack = useCallback(() => setStartDate(subDays(startDate, 7)), [startDate, setStartDate]);
  const goForward = useCallback(() => setStartDate(addDays(startDate, 7)), [startDate, setStartDate]);
  const goToday = useCallback(() => setStartDate(startOfDay(new Date())), [setStartDate]);

  return { goBack, goForward, goToday };
}
