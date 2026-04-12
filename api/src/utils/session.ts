export const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export function getSessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + SESSION_DURATION_MS);
}

export function isSessionExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
