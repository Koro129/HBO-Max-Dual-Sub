/**
 * Utility functions for the Dual Subtitle extension
 */

const Utils = {
  /**
   * Convert time format HH:MM:SS.mmm to seconds
   * @param {string} hms - Time string in format HH:MM:SS.mmm
   * @returns {number} Time in seconds
   */
  timeToSeconds(hms) {
    const match = hms.match(/(\d+):(\d+):(\d+\.\d+)/);
    return match ? (+match[1]) * 3600 + (+match[2]) * 60 + parseFloat(match[3]) : 0;
  },

  /**
   * Format seconds to HH:MM:SS.mmm
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
  },

  /**
   * Debounce function to limit function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function to limit function calls
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    
    return function() {
      const args = arguments;
      const context = this;
      
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  },

  /**
   * Memoize function results for performance
   * @param {Function} func - Function to memoize
   * @param {Function} resolver - Key resolver function
   * @returns {Function} Memoized function
   */
  memoize(func, resolver) {
    const cache = new Map();
    
    return function(...args) {
      const key = resolver ? resolver.apply(this, args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },

  /**
   * Safe DOM element creation with error handling
   * @param {string} tagName - HTML tag name
   * @param {Object} attributes - Element attributes
   * @returns {HTMLElement|null} Created element or null if failed
   */
  createElement(tagName, attributes = {}) {
    try {
      const element = document.createElement(tagName);
      
      // Apply attributes safely
      Object.entries(attributes).forEach(([key, value]) => {
        try {
          if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
          } else if (key === 'className') {
            element.className = value;
          } else if (key === 'textContent') {
            element.textContent = value;
          } else if (key === 'innerHTML') {
            element.innerHTML = value;
          } else {
            element.setAttribute(key, value);
          }
        } catch (attrError) {
          console.warn(`Failed to set attribute ${key}:`, attrError);
        }
      });
      
      return element;
    } catch (error) {
      console.error('Error creating element:', error);
      return null;
    }
  },

  /**
   * Safe DOM query selector with error handling and retry
   * @param {string} selector - CSS selector
   * @param {Element} parent - Parent element (defaults to document)
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Element|null} Found element or null if not found
   */
  safeQuerySelector(selector, parent = document, maxRetries = 3) {
    try {
      let element = parent.querySelector(selector);
      
      // Retry logic for dynamic content
      if (!element && maxRetries > 0) {
        return new Promise((resolve) => {
          let attempts = 0;
          const interval = setInterval(() => {
            attempts++;
            element = parent.querySelector(selector);
            
            if (element || attempts >= maxRetries) {
              clearInterval(interval);
              resolve(element);
            }
          }, 100);
        });
      }
      
      return element;
    } catch (error) {
      console.error('Error in querySelector:', error);
      return null;
    }
  },

  /**
   * Log message with timestamp and extension prefix
   * @param {string} message - Message to log
   * @param {string} level - Log level (log, warn, error)
   */
  log(message, level = 'log') {
    const timestamp = new Date().toISOString();
    const prefix = '[Dual Subtitle]';
    
    // Only log in development mode or if explicitly enabled
    // if (this.isDevelopmentMode() || level === 'error') {
    // }
    console[level](`${prefix} [${timestamp}] ${message}`);
  },

  /**
   * Check if extension is running in development mode
   * @returns {boolean} True if in development mode
   */
  // isDevelopmentMode() {
  //   return !chrome.runtime || chrome.runtime.getManifest().version.includes('dev');
  // },

  /**
   * Measure execution time of a function
   * @param {Function} func - Function to measure
   * @param {string} label - Label for the measurement
   * @returns {any} Function result
   */
  measureTime(func, label = 'Function execution') {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    
    this.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Async version of measureTime for async functions
   * @param {Function} asyncFunc - Async function to measure
   * @param {string} label - Label for the measurement
   * @returns {Promise<any>} Function result
   */
  async measureTimeAsync(asyncFunc, label = 'Async function execution') {
    const start = performance.now();
    const result = await asyncFunc();
    const end = performance.now();
    
    this.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Performance monitoring utility
   * @param {string} operation - Operation name
   * @param {Function} callback - Function to monitor
   * @returns {any} Function result
   */
  monitorPerformance(operation, callback) {
    const start = performance.now();
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    try {
      const result = callback();
      const end = performance.now();
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      this.log(`${operation} - Time: ${(end - start).toFixed(2)}ms, Memory: ${((endMemory - startMemory) / 1024).toFixed(2)}KB`);
      return result;
    } catch (error) {
      const end = performance.now();
      this.log(`${operation} - Failed after ${(end - start).toFixed(2)}ms: ${error.message}`, 'error');
      throw error;
    }
  },

  /**
   * Debounced function with immediate execution option
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @param {boolean} immediate - Whether to execute immediately
   * @returns {Function} Debounced function
   */
  debounceAdvanced(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const context = this;
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  },

  /**
   * Retry function with exponential backoff
   * @param {Function} func - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise<any>} Function result
   */
  async retryWithBackoff(func, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await func();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        this.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${error.message}`, 'warn');
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  },

  /**
   * Batch DOM operations for better performance
   * @param {Array} operations - Array of DOM operations
   * @param {number} batchSize - Size of each batch
   */
  batchDOMOperations(operations, batchSize = 10) {
    return new Promise((resolve) => {
      let index = 0;
      
      const processBatch = () => {
        const batch = operations.slice(index, index + batchSize);
        
        batch.forEach(operation => {
          try {
            operation();
          } catch (error) {
            this.log(`DOM operation failed: ${error.message}`, 'error');
          }
        });
        
        index += batchSize;
        
        if (index < operations.length) {
          requestAnimationFrame(processBatch);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(processBatch);
    });
  },

  /**
   * Check if browser supports modern features
   * @returns {Object} Feature support object
   */
  checkBrowserSupport() {
    return {
      fetch: typeof fetch !== 'undefined',
      performance: typeof performance !== 'undefined' && performance.now,
      requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      resizeObserver: typeof ResizeObserver !== 'undefined',
      mutationObserver: typeof MutationObserver !== 'undefined'
    };
  },

  /**
   * Get system performance info
   * @returns {Object} Performance information
   */
  getPerformanceInfo() {
    const info = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
    
    if (performance.memory) {
      info.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    
    if (performance.timing) {
      info.timing = {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd
      };
    }
    
    return info;
  }
};

// Make Utils globally available for Chrome Extension
if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
