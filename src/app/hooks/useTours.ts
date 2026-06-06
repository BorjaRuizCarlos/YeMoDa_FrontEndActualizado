import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../context/AuthContext';
import { getTourForPath } from '../utils/tours';
import { hasSeen, markSeen, WELCOME_ID } from '../utils/onboarding';

// Run a driver.js tour over the steps whose target elements currently exist.
// Returns false if nothing could be shown (so callers can avoid marking it "seen").
function runTour(steps: DriveStep[], onDone?: () => void): boolean {
  const present = steps.filter((s) => !s.element || document.querySelector(s.element as string));
  if (present.length === 0) return false;

  const instance = driver({
    showProgress: present.length > 1,
    overlayColor: 'rgba(3, 5, 8, 0.7)',
    stagePadding: 6,
    stageRadius: 6,
    popoverClass: 'ym-tour',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Got it',
    steps: present,
    onDestroyed: () => onDone?.(),
  });
  instance.drive();
  return true;
}

// Replay the tour for a given path on demand (the Topbar "?" button). Falls back to
// the dashboard tour when the current page has none.
export function replayTour(pathname: string): void {
  const tour = getTourForPath(pathname) ?? getTourForPath('/dashboard');
  if (tour) runTour(tour.steps);
}

// Auto-run the matching tour the first time a user lands on a route. Mount once
// (e.g. in AppLayout) inside the router.
export function useTours(): void {
  const { user } = useAuth();
  const location = useLocation();
  const ranForPath = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Let the first-run welcome flow finish before any tour auto-runs, so a tour
    // never fires underneath the welcome overlay.
    if (!hasSeen(user.id, WELCOME_ID)) return;
    const tour = getTourForPath(location.pathname);
    if (!tour) return;
    if (hasSeen(user.id, tour.id)) return;
    if (ranForPath.current === tour.id) return;

    // Give the page a moment to render its tour targets before highlighting.
    const timer = window.setTimeout(() => {
      const started = runTour(tour.steps, () => markSeen(user.id, tour.id));
      if (started) ranForPath.current = tour.id;
    }, 700);

    return () => window.clearTimeout(timer);
  }, [location.pathname, user?.id]);
}
