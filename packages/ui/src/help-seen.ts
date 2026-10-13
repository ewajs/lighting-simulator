// Remembers, per browser, that the getting-started help was seen, so a host's
// `help-on-start` shows it once (ADR 0046). Storage can be missing or blocked
// (private windows, previews); then the help simply shows again next time.

const KEY = 'lxs-help-seen';

/** Whether this browser has seen the help before. */
export function helpSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Notes that this browser has seen the help. */
export function markHelpSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Storage unavailable: the help shows again next time, which is harmless.
  }
}
