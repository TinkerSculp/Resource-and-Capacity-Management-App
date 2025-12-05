/**
 * Validation schemas and functions
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function validateEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required fields in an object
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
function validateRequiredFields(data, requiredFields) {
  const missing = requiredFields.filter(field => !data[field]);
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate employee ID format
 * @param {number} employeeID - Employee ID to validate
 * @returns {boolean} True if valid
 */
function validateEmployeeID(employeeID) {
  return Number.isInteger(employeeID) && employeeID > 0;
}

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {boolean} True if valid range
 */
function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * Validate capacity value (0-1)
 * @param {number} capacity - Capacity value
 * @returns {boolean} True if valid
 */
function validateCapacity(capacity) {
  return typeof capacity === 'number' && capacity >= 0 && capacity <= 1;
}

/**
 * Validate month (1-12)
 * @param {number} month - Month value
 * @returns {boolean} True if valid
 */
function validateMonth(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

/**
 * Validate year
 * @param {number} year - Year value
 * @returns {boolean} True if valid
 */
function validateYear(year) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

module.exports = {
  validateEmail,
  validateRequiredFields,
  validateEmployeeID,
  validateDateRange,
  validateCapacity,
  validateMonth,
  validateYear,
  sanitizeString
};
