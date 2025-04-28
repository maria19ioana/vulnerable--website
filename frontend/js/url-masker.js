/**
 * URL Masking Utilities for Frontend
 *
 * This script provides functions to work with masked URLs on the client side.
 * It communicates with the backend's masking API.
 */

/**
 * Mask a URL or ID by calling the backend API
 * 
 * @param {string} url - The URL or ID to mask
 * @return {Promise<string>} A promise that resolves to the masked URL
 */
async function maskUrl(url) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Authentication token not found');
      return null;
    }

    const response = await fetch(`/api/maskUrl?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error masking URL: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      return data.maskedUrl;
    } else {
      throw new Error(data.message || 'Failed to mask URL');
    }
  } catch (error) {
    console.error('Error in maskUrl:', error);
    return null;
  }
}

/**
 * Replace all URLs in a page with masked versions
 * 
 * @param {string} selector - CSS selector for elements to process
 * @param {string} attribute - Attribute containing the URL (href, data-id, etc.)
 * @param {function} urlTransformer - Function to transform the masked URL (optional)
 */
async function maskPageUrls(selector, attribute, urlTransformer = null) {
  const elements = document.querySelectorAll(selector);
  
  for (const element of elements) {
    const originalUrl = element.getAttribute(attribute);
    if (originalUrl) {
      try {
        // Skip URLs that are already masked or external
        if (originalUrl.startsWith('http') || originalUrl.includes('base64')) {
          continue;
        }
        
        const maskedUrl = await maskUrl(originalUrl);
        if (maskedUrl) {
          // Apply optional transformer function
          const finalUrl = urlTransformer ? urlTransformer(maskedUrl, originalUrl) : maskedUrl;
          element.setAttribute(attribute, finalUrl);
        }
      } catch (error) {
        console.error(`Error masking URL for element:`, element, error);
      }
    }
  }
}

/**
 * Replace IDs in URLs with masked versions
 * 
 * @param {string} selector - CSS selector for elements to process
 * @param {RegExp} pattern - Regular expression pattern to extract ID from URL
 * @param {function} replacer - Function to create new URL with masked ID
 */
async function maskUrlIds(selector, pattern, replacer) {
  const elements = document.querySelectorAll(selector);
  
  for (const element of elements) {
    const href = element.getAttribute('href');
    if (href) {
      const match = href.match(pattern);
      if (match && match[1]) {
        const id = match[1];
        try {
          const maskedId = await maskUrl(id);
          if (maskedId) {
            const newHref = replacer(href, maskedId);
            element.setAttribute('href', newHref);
          }
        } catch (error) {
          console.error(`Error masking ID in URL for element:`, element, error);
        }
      }
    }
  }
}

// Export utilities to global scope
window.urlMasker = {
  maskUrl,
  maskPageUrls,
  maskUrlIds
}; 