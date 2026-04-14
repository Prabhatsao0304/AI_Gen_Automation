/**
 * String utility helpers used across test steps and page objects.
 */

/**
 * Converts a string to a URL-safe slug.
 * @param {string} str
 * @returns {string}
 */
export function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Generates a random alphanumeric string of given length.
 * Useful for creating unique test data.
 * @param {number} [length=8]
 * @returns {string}
 */
export function randomString(length = 8) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generates a unique test email address.
 * @param {string} [prefix='testuser']
 * @returns {string}
 */
export function generateTestEmail(prefix = 'testuser') {
  return `${prefix}+${randomString(6)}@automation.test`;
}

/**
 * Trims and normalises whitespace in a string (collapses multiple spaces).
 * @param {string} str
 * @returns {string}
 */
export function normalise(str) {
  return str.trim().replace(/\s+/g, ' ');
}
