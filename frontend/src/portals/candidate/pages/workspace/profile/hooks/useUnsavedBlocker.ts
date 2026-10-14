// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Hook: useUnsavedBlocker
// Intercepts in-app navigation and tab closing when dirty
// Uses React Router useBlocker with safe fallback
// ============================================================

import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export function useUnsavedBlocker(isDirty: boolean) {
  let blocker: any = null;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    blocker = useBlocker(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
    );
  } catch {
    // Fallback if rendered outside data router
    blocker = null;
  }

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return blocker;
}
