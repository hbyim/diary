/**
 * The app locks itself whenever it goes to the background. Opening the photo
 * picker or the share sheet also backgrounds the app, so callers mark those
 * moments here to skip the next lock.
 */
let suppressUntil = 0;

export function suppressNextLock(ms = 120_000) {
  suppressUntil = Date.now() + ms;
}

export function consumeSuppression(): boolean {
  const active = Date.now() < suppressUntil;
  suppressUntil = 0;
  return active;
}
