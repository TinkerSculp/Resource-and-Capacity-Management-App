/**
 * API client utility functions
 */

/**
 * Make a GET request
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function get(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'GET',
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
    console.error('GET request error:', error);
    throw error;
  }
}

/**
 * Make a POST request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function post(url, data, options = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
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
    console.error('POST request error:', error);
    throw error;
  }
}

/**
 * Make a PUT request
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
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
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
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

module.exports = {
  get,
  post,
  put,
  delete: del
};
