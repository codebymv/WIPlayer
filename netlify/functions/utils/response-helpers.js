/**
 * Utility functions for standardizing HTTP responses across Netlify functions
 */

// Import the main response helpers to ensure consistency
const mainResponseHelpers = require('../../../utils/response-helpers');

// Re-export the main response helpers
module.exports = mainResponseHelpers;
