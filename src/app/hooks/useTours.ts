import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '../context/AuthContext';
import { getTourForPath } from '../utils/tours';
import { hasSeen, markSeen, WELCOME_ID } from '../utils/onboarding';

const pad = (n: number) => String(n).padStart(2, '0');

// Run a driver.js tour over the steps whose target elements currently exist.
// Returns false if nothing could be shown (so callers can avoid marking it "seen").
//
// The popover is restyled into the brand "instrument" voice (see tours.css):
// a mono eyebrow with the page label + step counter is injected above the title,
// and a calibration tick-rail replaces driver's default "n of n" progress text.
// driver.js rebuilds the popover DOM on every step, so the injection never stacks.
function runTour(steps: DriveStep[], label: string, onDone?: () => void): boolean {
  const present = steps.filter((s) => !s.element || document.querySelector(s.element as string));
  if (present.length === 0) return false;

  const total = present.length;
  const instance = driver({
    showProgress: false,
    overlayColor: 'rgba(1, 4, 9, 0.78)',
    stagePadding: 8,
    stageRadius: 6,
    popoverClass: 'ym-tour',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onPopoverRender: (popover, { driver: d }) => {
      const current = (d.getActiveIndex() ?? 0) + 1;

      const eyebrow = document.createElement('div');
      eyebrow.className = 'ym-tour-eyebrow';
      const tag = document.createElement('span');
      tag.className = 'ym-tour-eyebrow-label';
      tag.textContent = label;
      eyebrow.appendChild(tag);
      if (total > 1) {
        const count = document.createElement('span');
        count.className = 'ym-tour-eyebrow-count';
        count.textContent = `${pad(current)} / ${pad(total)}`;
        eyebrow.appendChild(count);
      }
      popover.wrapper.insertBefore(eyebrow, popover.title);

      if (total > 1) {
        const rail = document.createElement('div');
        rail.className = 'ym-tour-ticks';
        rail.setAttribute('aria-hidden', 'true');
        for (let i = 1; i <= total; i++) {
          const tick = document.createElement('span');
          tick.className = i <= current ? 'ym-tour-tick is-on' : 'ym-tour-tick';
          rail.appendChild(tick);
        }
        popover.footer.insertBefore(rail, popover.footer.firstChild);
      }
    },
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
  if (tour) runTour(tour.steps, tour.label);
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
      const started = runTour(tour.steps, tour.label, () => markSeen(user.id, tour.id));
      if (started) ranForPath.current = tour.id;
    }, 700);

    return () => window.clearTimeout(timer);
  }, [location.pathname, user?.id]);
}
