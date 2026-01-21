/**
 * Validation schemas and functions
 * Provides reusable helpers for validating input data across the application.
 */

/**
 * Validate email format using a basic regex pattern
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function validateEmail(email) {
  if (!email) return false; // Reject empty/null values
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email structure
  return emailRegex.test(email);
}

/**
 * Validate that required fields exist in an object
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
export function validateRequiredFields(data, requiredFields) {
  // Collect fields that are missing or falsy
  const missing = requiredFields.filter(field => !data[field]);

  return {
    valid: missing.length === 0, // True if no missing fields
    missing
  };
}

/**
 * Validate employee ID format (must be a positive integer)
 * @param {number} employeeID - Employee ID to validate
 * @returns {boolean} True if valid
 */
export function validateEmployeeID(employeeID) {
  return Number.isInteger(employeeID) && employeeID > 0;
}

/**
 * Validate that a date range is chronological
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {boolean} True if start <= end
 */
export function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start <= end;
}

/**
 * Validate capacity value (must be between 0 and 1)
 * @param {number} capacity - Capacity value
 * @returns {boolean} True if valid
 */
export function validateCapacity(capacity) {
  return typeof capacity === 'number' && capacity >= 0 && capacity <= 1;
}

/**
 * Validate month value (1–12)
 * @param {number} month - Month value
 * @returns {boolean} True if valid
 */
export function validateMonth(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

/**
 * Validate year value (2000–2100)
 * @param {number} year - Year value
 * @returns {boolean} True if valid
 */
export function validateYear(year) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/**
 * Sanitize string input by trimming and removing unsafe characters
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (!input) return ''; // Handle null/undefined
  return input.trim().replace(/[<>]/g, ''); // Remove angle brackets
}