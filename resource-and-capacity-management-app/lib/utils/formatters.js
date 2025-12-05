/**
 * Utility functions for formatting data
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
function formatDate(date, locale = 'en-US') {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format date and time to readable string
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date and time string
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
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format full name from parts
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Full name
 */
function formatFullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(' ');
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format capacity value
 * @param {number} capacity - Capacity value (0-1)
 * @returns {string} Formatted capacity string
 */
function formatCapacity(capacity) {
  if (capacity === null || capacity === undefined) return 'N/A';
  return formatPercentage(capacity);
}

module.exports = {
  formatDate,
  formatDateTime,
  formatPercentage,
  formatFullName,
  truncate,
  formatCapacity
};
