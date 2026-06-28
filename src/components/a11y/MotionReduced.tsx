import { useEffect } from 'react';

/**
 * Detects prefers-reduced-motion and sets a CSS class on <html>.
 * Allows animations to be disabled at the global level.
 */
export function MotionReduced(): null {
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.classList.toggle('motion-reduced', e.matches);
    };

    update(mql);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return null;
}
