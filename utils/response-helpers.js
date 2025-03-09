/**
 * Utility functions for standardizing HTTP responses across Netlify functions
 * These helpers ensure consistent response formats and error handling
 */

/**
 * Creates a standardized response object
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body
 * @param {object} headers - Additional headers to include
 * @returns {object} - Formatted response object for Netlify functions
 */
function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Creates a success response
 * @param {object} data - Data to include in the response
 * @param {object} headers - Additional headers to include
 * @returns {object} - Formatted success response
 */
function successResponse(data, headers = {}) {
  return createResponse(200, data, headers);
}

/**
 * Creates an error response
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Error} error - Original error object (optional)
 * @returns {object} - Formatted error response
 */
function errorResponse(statusCode, message, error = null) {
  const body = {
    error: message
  };
  
  // Include error details in non-production environments
  if (error && process.env.NODE_ENV !== 'production') {
    body.details = error.message;
    body.stack = error.stack;
  }
  
  return createResponse(statusCode, body);
}

module.exports = {
  createResponse,
  successResponse,
  errorResponse
};
