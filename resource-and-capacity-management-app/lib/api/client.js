/**
 * API client utility functions
 * Provides reusable wrappers for common HTTP methods (GET, POST, PUT, DELETE)
 * using the Fetch API with consistent error handling.
 */

/**
 * Make a GET request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Additional fetch options (optional)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function get(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers // Allow custom headers
      },
      ...options // Spread any additional fetch options
    });

    // Throw error if response is not successful
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return parsed JSON response
    return await response.json();
  } catch (error) {
    console.error('GET request error:', error);
    throw error; // Re-throw so calling code can handle it
  }
}

/**
 * Make a POST request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body payload
 * @param {Object} options - Additional fetch options (optional)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function post(url, data, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data), // Convert payload to JSON
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('POST request error:', error);
    throw error;
  }
}

/**
 * Make a PUT request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body payload
 * @param {Object} options - Additional fetch options (optional)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function put(url, data, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('PUT request error:', error);
    throw error;
  }
}

/**
 * Make a DELETE request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Additional fetch options (optional)
 * @returns {Promise<Object>} Parsed JSON response
 */
async function del(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('DELETE request error:', error);
    throw error;
  }
}

// Export all HTTP helpers
module.exports = {
  get,
  post,
  put,
  delete: del
};
