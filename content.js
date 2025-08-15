/**
 * Dual Subtitle Extension - Main Content Script
 * Initializes and coordinates all subtitle modules
 */

// Main extension class
class DualSubtitleExtension {
  constructor() {
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.maxInitAttempts = 3;
    this.init();
  }

  /**
   * Initialize the extension
   */
  async init() {
    try {
      Utils.log('Initializing Dual Subtitle Extension');
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupExtension());
      } else {
        this.setupExtension();
      }
      
      // Setup page visibility change handler
      this.setupVisibilityHandler();
      
    } catch (error) {
      Utils.log(`Error initializing extension: ${error.message}`, 'error');
      this.handleInitializationError();
    }
  }

  /**
   * Setup the extension after DOM is ready
   */
  setupExtension() {
    try {
      // Check if modules are available
      if (!this.validateModules()) {
        throw new Error('Required modules not loaded');
      }
      
      // Initialize all modules
      SubtitleOverlay.init();
      SubtitleManager.init();
      
      this.isInitialized = true;
      Utils.log('Extension setup complete');
      
      // Log initial state
      this.logExtensionState();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
    } catch (error) {
      Utils.log(`Error setting up extension: ${error.message}`, 'error');
      this.handleInitializationError();
    }
  }

  /**
   * Validate that all required modules are loaded
   */
  validateModules() {
    const requiredModules = ['Utils', 'SubtitleParser', 'SubtitleOverlay', 'SubtitleManager'];
    
    for (const moduleName of requiredModules) {
      if (typeof window[moduleName] === 'undefined') {
        Utils.log(`Required module not found: ${moduleName}`, 'error');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Handle initialization errors with retry logic
   */
  handleInitializationError() {
    this.initializationAttempts++;
    
    if (this.initializationAttempts < this.maxInitAttempts) {
      Utils.log(`Retrying initialization (${this.initializationAttempts}/${this.maxInitAttempts})`, 'warn');
      
      setTimeout(() => {
        this.init();
      }, 1000 * this.initializationAttempts);
    } else {
      Utils.log('Max initialization attempts reached', 'error');
    }
  }

  /**
   * Setup page visibility change handler
   */
  setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Utils.log('Page hidden, pausing extension operations');
      } else {
        Utils.log('Page visible, resuming extension operations');
        this.resumeOperations();
      }
    });
  }

  /**
   * Resume operations when page becomes visible
   */
  resumeOperations() {
    try {
      if (this.isInitialized) {
        // Refresh video element connection
        if (SubtitleManager && SubtitleManager.reconnectVideoElement) {
          SubtitleManager.reconnectVideoElement();
        }
        
        Utils.log('Operations resumed');
      }
    } catch (error) {
      Utils.log(`Error resuming operations: ${error.message}`, 'error');
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor memory usage
    if (performance.memory) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
          Utils.log(`High memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`, 'warn');
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Log current extension state for debugging
   */
  logExtensionState() {
    try {
      const overlayState = SubtitleOverlay.getState();
      const managerState = SubtitleManager.getState();
      
      Utils.log('Extension State:', 'log');
      Utils.log(`- Initialized: ${this.isInitialized}`, 'log');
      Utils.log(`- Overlay: ${JSON.stringify(overlayState)}`, 'log');
      Utils.log(`- Manager: ${JSON.stringify(managerState)}`, 'log');
      
    } catch (error) {
      Utils.log(`Error logging extension state: ${error.message}`, 'error');
    }
  }

  /**
   * Get extension status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      initializationAttempts: this.initializationAttempts,
      overlay: SubtitleOverlay.getState(),
      manager: SubtitleManager.getState()
    };
  }

  /**
   * Cleanup extension resources
   */
  cleanup() {
    try {
      if (SubtitleManager && SubtitleManager.stop) {
        SubtitleManager.stop();
      }
      
      if (SubtitleOverlay && SubtitleOverlay.removeOverlay) {
        SubtitleOverlay.removeOverlay();
      }
      
      Utils.log('Extension cleanup completed');
    } catch (error) {
      Utils.log(`Error during cleanup: ${error.message}`, 'error');
    }
  }
}

// Initialize the extension when the script loads
const dualSubtitleExtension = new DualSubtitleExtension();

// Export for debugging purposes
if (typeof window !== 'undefined') {
  window.dualSubtitleExtension = dualSubtitleExtension;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (dualSubtitleExtension && dualSubtitleExtension.cleanup) {
    dualSubtitleExtension.cleanup();
  }
});
