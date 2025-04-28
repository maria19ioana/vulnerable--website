/**
 * URL Masking Utility
 * 
 * This utility provides functions to encrypt and decrypt URLs to prevent
 * direct manipulation and exposure of internal IDs and routing patterns.
 */

const crypto = require('crypto');

// Secret key for encryption - in production, use environment variables!
const SECRET_KEY = 'your_secret_key_for_url_masking';
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Encrypt a URL or URL component
 * 
 * @param {string} text - URL or URL component to encrypt
 * @return {string} Base64-encoded encrypted string
 */
function maskUrl(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Return IV + encrypted data, both base64 encoded and URL safe
  return Buffer.concat([iv, Buffer.from(encrypted, 'base64')])
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decrypt an encrypted URL or URL component
 * 
 * @param {string} encryptedText - Encrypted URL to decrypt
 * @return {string} Original URL or URL component
 */
function unmaskUrl(encryptedText) {
  try {
    // Convert URL-safe characters back to base64 standard
    const text = encryptedText
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add back any missing padding
    const paddedText = text + '='.repeat((4 - text.length % 4) % 4);
    
    const buffer = Buffer.from(paddedText, 'base64');
    
    // Extract IV and encrypted data
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedData = buffer.slice(IV_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error unmasking URL:', error);
    return null;
  }
}

module.exports = {
  maskUrl,
  unmaskUrl
}; 