/**
 * Utility functions for formatting data
 * Provides reusable helpers for dates, percentages, names, and text.
 */

/**
 * Format a date into a readable long-form string
 * @param {Date|string} date - Date input (Date object or ISO string)
 * @param {string} locale - Output locale (default: 'en-US')
 * @returns {string} Formatted date string or empty string if invalid
 */
function formatDate(date, locale = 'en-US') {
  if (!date) return ''; // Handle null/undefined
  const d = new Date(date); // Normalize input into Date object
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date with time included
 * @param {Date|string} date - Date input
 * @param {string} locale - Output locale (default: 'en-US')
 * @returns {string} Formatted date/time string or empty string if invalid
 */
function formatDateTime(date, locale = 'en-US') {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Convert a decimal value to a percentage string
 * @param {number} value - Decimal value (e.g., 0.25 → 25%)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Percentage string
 */
function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) return '0%'; // Safe fallback
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Combine first and last name into a full name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Full name (skips empty values)
 */
function formatFullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Truncate text and append ellipsis if too long
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated text with "..." if needed
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format a capacity value (0–1) as a percentage
 * @param {number} capacity - Decimal capacity value
 * @returns {string} Formatted capacity or 'N/A' if invalid
 */
function formatCapacity(capacity) {
  if (capacity === null || capacity === undefined) return 'N/A';
  return formatPercentage(capacity);
}

// Export all formatting helpers
module.exports = {
  formatDate,
  formatDateTime,
  formatPercentage,
  formatFullName,
  truncate,
  formatCapacity
};
