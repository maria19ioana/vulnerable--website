/**
 * URL Masking Middleware
 * 
 * This middleware handles the unmasking of encrypted URL parameters.
 */

const { unmaskUrl } = require('../utils/url-masker');

/**
 * Middleware to unmask a URL parameter
 * 
 * @param {string} paramName - The name of the parameter to unmask
 * @return {function} Express middleware function
 */
function unmaskParam(paramName) {
  return (req, res, next) => {
    try {
      if (req.params[paramName]) {
        const unmaskedValue = unmaskUrl(req.params[paramName]);
        if (unmaskedValue) {
          // Store both masked and unmasked values
          req.rawParams = req.rawParams || {};
          req.rawParams[paramName] = req.params[paramName]; // Save original value
          req.params[paramName] = unmaskedValue; // Replace with unmasked value
        }
      }
      next();
    } catch (error) {
      console.error(`Error unmasking parameter ${paramName}:`, error);
      res.status(400).json({ 
        success: false, 
        message: 'Invalid URL parameter'
      });
    }
  };
}

/**
 * Middleware to unmask a URL query parameter
 * 
 * @param {string} paramName - The name of the query parameter to unmask
 * @return {function} Express middleware function
 */
function unmaskQuery(paramName) {
  return (req, res, next) => {
    try {
      if (req.query[paramName]) {
        const unmaskedValue = unmaskUrl(req.query[paramName]);
        if (unmaskedValue) {
          // Store both masked and unmasked values
          req.rawQuery = req.rawQuery || {};
          req.rawQuery[paramName] = req.query[paramName]; // Save original value
          req.query[paramName] = unmaskedValue; // Replace with unmasked value
        }
      }
      next();
    } catch (error) {
      console.error(`Error unmasking query parameter ${paramName}:`, error);
      res.status(400).json({ 
        success: false, 
        message: 'Invalid query parameter'
      });
    }
  };
}

module.exports = {
  unmaskParam,
  unmaskQuery
}; 