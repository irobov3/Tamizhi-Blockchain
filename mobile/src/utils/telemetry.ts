/**
 * Telemetry / crash reporting shim.
 *
 * Pluggable interface compatible with Sentry's surface area
 * (captureException / captureMessage / setUser / addBreadcrumb).
 *
 * In development this just logs to console. To wire up Sentry later:
 *   1. `npx expo install sentry-expo`
 *   2. Replace the `report*` implementations below with calls to
 *      `Sentry.Native.captureException(err)` etc.
 *
 * This indirection means the rest of the app never imports Sentry
 * directly, so swapping providers (Bugsnag, custom, off) is one file.
 */

type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

interface Breadcrumb {
  message: string;
  category?: string;
  level?: Severity;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface UserContext {
  id?: string;
  pubKey?: string;
}

const breadcrumbs: Breadcrumb[] = [];
const MAX_BREADCRUMBS = 50;
let userContext: UserContext = {};
let enabled = !__DEV__; // production-on by default; quiet in dev

export function setTelemetryEnabled(value: boolean): void {
  enabled = value;
}

export function setUser(user: UserContext): void {
  userContext = { ...user };
}

export function addBreadcrumb(b: Omit<Breadcrumb, 'timestamp'>): void {
  breadcrumbs.push({ ...b, timestamp: Date.now() });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    if (__DEV__) console.error('[telemetry/dev]', err, context);
    return;
  }
  // TODO: Sentry.Native.captureException(err, { extra: context });
  console.error('[telemetry]', err, {
    user: userContext,
    breadcrumbs: breadcrumbs.slice(-10),
    ...context,
  });
}

export function reportMessage(message: string, level: Severity = 'info'): void {
  if (!enabled) return;
  // TODO: Sentry.Native.captureMessage(message, level);
  console.log(`[telemetry/${level}]`, message);
}

export function getRecentBreadcrumbs(): readonly Breadcrumb[] {
  return breadcrumbs.slice();
}
