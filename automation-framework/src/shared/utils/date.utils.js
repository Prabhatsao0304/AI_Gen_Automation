/**
 * Date utility helpers used in test data generation and assertions.
 */

/**
 * Returns today's date formatted as YYYY-MM-DD.
 * @returns {string}
 */
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns a date offset by N days from today, formatted as YYYY-MM-DD.
 * Use negative values for past dates.
 * @param {number} days
 * @returns {string}
 */
export function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Formats a Date object as DD/MM/YYYY (common in Indian enterprise UIs).
 * @param {Date} [date]
 * @returns {string}
 */
export function formatDDMMYYYY(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Returns a timestamp string suitable for use in file names.
 * @returns {string}
 */
export function fileTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
