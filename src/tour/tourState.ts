/**
 * Guided-tour state: entry choice (tutorial vs free) + current step,
 * persisted per session so a flag-enable reload doesn't lose progress.
 */

export type TourMode = 'tutorial' | 'free' | null;

const KEY_MODE = 'hr-demo:tour-mode';
const KEY_STEP = 'hr-demo:tour-step';

let mode: TourMode = readMode();
let step: number = readStep();
const listeners = new Set<() => void>();

function readMode(): TourMode {
  try {
    const v = sessionStorage.getItem(KEY_MODE);
    return v === 'tutorial' || v === 'free' ? v : null;
  } catch {
    return null;
  }
}

function readStep(): number {
  try {
    const v = Number(sessionStorage.getItem(KEY_STEP));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
}

function persist(): void {
  try {
    if (mode) sessionStorage.setItem(KEY_MODE, mode);
    else sessionStorage.removeItem(KEY_MODE);
    sessionStorage.setItem(KEY_STEP, String(step));
  } catch {
    /* private mode */
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribeTour(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTourMode(): TourMode {
  return mode;
}

export function getTourStep(): number {
  return step;
}

export function setTourMode(next: TourMode): void {
  mode = next;
  step = 0;
  persist();
  emit();
}

export function setTourStep(next: number): void {
  step = next;
  persist();
  emit();
}

/** Advance only if the tour is running and currently at `current`. */
export function advanceTourFrom(current: number): void {
  if (mode === 'tutorial' && step === current) {
    step = current + 1;
    persist();
    emit();
  }
}

export function endTour(): void {
  mode = 'free';
  persist();
  emit();
}
