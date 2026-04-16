/**
 * Helpers to tag functional failures as product bugs in reports.
 * Format: [BUG][<TYPE>] <message>
 */

export function bugError(type, message) {
  const t = String(type || 'UNKNOWN').trim() || 'UNKNOWN';
  const msg = String(message || '').trim() || 'Bug detected';
  return new Error(`[BUG][${t}] ${msg}`);
}

