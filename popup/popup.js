/**
 * Popup Controller for Dual Subtitle Extension
 * Handles user interface interactions and communication with content script
 */

class PopupController {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize the popup controller
   */
  init() {
    try {
      const startTime = performance.now();
      
      this.cacheElements();
      this.setupEventListeners();
      this.loadSavedData();
      this.setupStorageListener();
      this.setupErrorBoundary();
      this.setupPerformanceMonitoring();
      
      this.isInitialized = true;
      
      const initTime = performance.now() - startTime;
      console.log(`Popup controller initialized successfully in ${initTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Error initializing popup controller:', error);
      this.showError('Failed to initialize popup');
      this.showRecoveryOptions();
    }
  }

  /**
   * Setup performance monitoring for popup
   */
  setupPerformanceMonitoring() {
    // Monitor popup performance
    setInterval(() => {
      if (performance.memory) {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > 10 * 1024 * 1024) { // 10MB threshold for popup
          console.warn(`High popup memory usage: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Enhanced error boundary with better error reporting
   */
  setupErrorBoundary() {
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      this.showError('An unexpected error occurred');
      this.logError('Global Error', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('A network or processing error occurred');
      this.logError('Unhandled Rejection', event.reason);
    });
  }

  /**
   * Log errors for debugging
   */
  logError(type, error) {
    const errorInfo = {
      type,
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    console.error('Error logged:', errorInfo);
    
    // Store error in storage for debugging
    chrome.storage.local.get(['errorLogs'], (result) => {
      const logs = result.errorLogs || [];
      logs.push(errorInfo);
      
      // Keep only last 10 errors
      if (logs.length > 10) {
        logs.splice(0, logs.length - 10);
      }
      
      chrome.storage.local.set({ errorLogs: logs });
    });
  }

  /**
   * Show recovery options when initialization fails
   */
  showRecoveryOptions() {
    const recoveryDiv = document.createElement('div');
    recoveryDiv.className = 'recovery-options';
    recoveryDiv.innerHTML = `
      <h3>Initialization Failed</h3>
      <p>Please try refreshing the popup or reloading the extension.</p>
      <div class="recovery-buttons">
        <button onclick="window.location.reload()" class="btn btn-primary">Refresh Popup</button>
        <button onclick="this.showExtensionInfo()" class="btn btn-secondary">Show Debug Info</button>
      </div>
    `;
    
    document.body.appendChild(recoveryDiv);
  }

  /**
   * Show extension debug information
   */
  showExtensionInfo() {
    chrome.storage.local.get(['errorLogs', 'subtitleStatus', 'timestampStatus'], (result) => {
      const info = {
        errorLogs: result.errorLogs || [],
        status: {
          subtitle: result.subtitleStatus || 'Unknown',
          timestamp: result.timestampStatus || 'Unknown'
        },
        timestamp: new Date().toISOString()
      };
      
      alert(`Debug Info:\n${JSON.stringify(info, null, 2)}`);
    });
  }

  /**
   * Cache DOM elements for better performance
   */
  cacheElements() {
    // Input fields
    this.elements.sub1Url = document.getElementById('sub1Url');
    this.elements.sub2Url = document.getElementById('sub2Url');
    
    // Control buttons
    this.elements.sub1FontPlus = document.getElementById('sub1FontPlus');
    this.elements.sub1FontMinus = document.getElementById('sub1FontMinus');
    this.elements.sub1PosUp = document.getElementById('sub1PosUp');
    this.elements.sub1PosDown = document.getElementById('sub1PosDown');
    
    this.elements.sub2FontPlus = document.getElementById('sub2FontPlus');
    this.elements.sub2FontMinus = document.getElementById('sub2FontMinus');
    this.elements.sub2PosUp = document.getElementById('sub2PosUp');
    this.elements.sub2PosDown = document.getElementById('sub2PosDown');
    
    // Action buttons
    this.elements.btnStart = document.getElementById('btnStart');
    this.elements.btnStop = document.getElementById('btnStop');
    this.elements.btnSwitchPosition = document.getElementById('btnSwitchPosition');
    
    // Status elements
    this.elements.statusSubtitle = document.getElementById('statusSubtitle');
    this.elements.statusTimestamp = document.getElementById('statusTimestamp');
    
    // Validate all elements exist
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        throw new Error(`Required element not found: ${key}`);
      }
    });
  }

  /**
   * Setup event listeners for all interactive elements
   */
  setupEventListeners() {
    // Start/Stop buttons
    this.elements.btnStart.addEventListener('click', this.handleStart.bind(this));
    this.elements.btnStop.addEventListener('click', this.handleStop.bind(this));
    this.elements.btnSwitchPosition.addEventListener('click', this.handleSwitchPosition.bind(this));
    
    // Font size controls
    this.elements.sub1FontPlus.addEventListener('click', () => this.adjustSetting('sizeSub1', 1));
    this.elements.sub1FontMinus.addEventListener('click', () => this.adjustSetting('sizeSub1', -1));
    this.elements.sub2FontPlus.addEventListener('click', () => this.adjustSetting('sizeSub2', 1));
    this.elements.sub2FontMinus.addEventListener('click', () => this.adjustSetting('sizeSub2', -1));
    
    // Position controls
    this.elements.sub1PosUp.addEventListener('click', () => this.adjustSetting('posSub1', 3));
    this.elements.sub1PosDown.addEventListener('click', () => this.adjustSetting('posSub1', -3));
    this.elements.sub2PosUp.addEventListener('click', () => this.adjustSetting('posSub2', 3));
    this.elements.sub2PosDown.addEventListener('click', () => this.adjustSetting('posSub2', -3));
    
    // Input validation
    this.elements.sub1Url.addEventListener('input', this.validateUrl.bind(this));
    this.elements.sub2Url.addEventListener('input', this.validateUrl.bind(this));
  }

  /**
   * Load saved data from storage
   */
  async loadSavedData() {
    try {
      const result = await chrome.storage.local.get([
        'subtitleSub1URL', 
        'subtitleSub2URL', 
        'subtitleStatus', 
        'timestampStatus'
      ]);
      
      // Set input values
      if (result.subtitleSub1URL) {
        this.elements.sub1Url.value = result.subtitleSub1URL;
      }
      if (result.subtitleSub2URL) {
        this.elements.sub2Url.value = result.subtitleSub2URL;
      }
      
      // Update status
      this.updateStatus(result.subtitleStatus || '-', result.timestampStatus || '-');
      
    } catch (error) {
      console.error('Error loading saved data:', error);
      this.showError('Failed to load saved settings');
    }
  }

  /**
   * Setup storage change listener
   */
  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        this.handleStorageChanges(changes);
      }
    });
  }

  /**
   * Handle storage changes
   */
  handleStorageChanges(changes) {
    try {
      if (changes.subtitleStatus) {
        this.updateSubtitleStatus(changes.subtitleStatus.newValue);
        
        // Auto-reset loading state based on status
        if (changes.subtitleStatus.newValue === 'Berhasil' || 
            changes.subtitleStatus.newValue === 'Gagal' ||
            changes.subtitleStatus.newValue === 'Error' ||
            changes.subtitleStatus.newValue.includes('Gagal')) {
          this.setLoadingState(false);
        }
      }
      
      if (changes.timestampStatus) {
        this.updateTimestampStatus(changes.timestampStatus.newValue);
        
        // Auto-reset loading state based on timestamp status
        if (changes.timestampStatus.newValue === 'Berhasil' || 
            changes.timestampStatus.newValue === 'Gagal' ||
            changes.timestampStatus.newValue === 'Error') {
          this.setLoadingState(false);
        }
      }
      
      // Reset loading state when status changes to stop
      if (changes.status && changes.status.newValue === 'stop') {
        this.setLoadingState(false);
      }
      
      // Reset loading state when status changes to start (prevent stuck loading)
      if (changes.status && changes.status.newValue === 'start') {
        // Give a small delay then reset loading state to prevent stuck
        setTimeout(() => {
          this.setLoadingState(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Error handling storage changes:', error);
      this.setLoadingState(false);
    }
  }

  /**
   * Force reset loading state (emergency function)
   */
  forceResetLoadingState() {
    console.log('Force resetting loading state');
    this.setLoadingState(false);
  }

  /**
   * Handle start button click
   */
  async handleStart() {
    try {
      const sub1Url = this.elements.sub1Url.value.trim();
      const sub2Url = this.elements.sub2Url.value.trim();
      
      // Validate input
      if (!sub1Url && !sub2Url) {
        this.showError('Please enter at least one subtitle URL');
        return;
      }
      
      if (sub1Url && !this.isValidUrl(sub1Url)) {
        this.showError('Invalid Subtitle 1 URL');
        return;
      }
      
      if (sub2Url && !this.isValidUrl(sub2Url)) {
        this.showError('Invalid Subtitle 2 URL');
        return;
      }
      
      // Show loading state
      this.setLoadingState(true);
      
      // Set timeout protection to prevent stuck loading
      const loadingTimeout = setTimeout(() => {
        Utils.log('Loading timeout - forcing reset', 'warn');
        this.setLoadingState(false);
        this.showError('Loading timeout - please check your subtitle URLs');
      }, 15000); // 15 second timeout
      
      // Save to storage and start
      await chrome.storage.local.set({
        subtitleSub1URL: sub1Url,
        subtitleSub2URL: sub2Url,
        status: 'start',
        subtitleStatus: 'Sedang diambil',
        timestampStatus: 'Sedang diambil'
      });
      
      // Update status
      this.updateStatus('Sedang diambil', 'Sedang diambil');
      
      // Clear timeout since we're done
      clearTimeout(loadingTimeout);
      
      // Reset loading state after successful start
      setTimeout(() => {
        this.setLoadingState(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting subtitles:', error);
      this.showError('Failed to start subtitle display');
      this.setLoadingState(false);
    }
  }

  /**
   * Handle stop button click
   */
  async handleStop() {
    try {
      await chrome.storage.local.set({
        status: 'stop'
      });
      
      this.updateStatus('Dihentikan', 'Dihentikan');
      this.setLoadingState(false);
      
    } catch (error) {
      console.error('Error stopping subtitles:', error);
      this.showError('Failed to stop subtitle display');
      this.setLoadingState(false);
    }
  }

  /**
   * Handle position switch button click
   */
  async handleSwitchPosition() {
    try {
      // Reset loading state first to prevent stuck loading
      this.setLoadingState(false);
      
      // Get current input values
      const sub1Url = this.elements.sub1Url.value.trim();
      const sub2Url = this.elements.sub2Url.value.trim();
      
      // Switch input field values
      this.elements.sub1Url.value = sub2Url;
      this.elements.sub2Url.value = sub1Url;
      
      // Show success message
      this.showSuccess('URL subtitle berhasil ditukar! Silakan klik Tampilkan.');
      
    } catch (error) {
      console.error('Error switching URLs:', error);
      this.showError('Failed to switch subtitle URLs');
      this.setLoadingState(false);
    }
  }

  /**
   * Adjust setting value
   */
  async adjustSetting(key, delta) {
    try {
      const result = await chrome.storage.local.get([key]);
      let value = result[key] || 0;
      
      // Apply limits
      if (key.includes('size')) {
        value = Math.max(-5, Math.min(10, value + delta));
      } else if (key.includes('pos')) {
        value = Math.max(-20, Math.min(20, value + delta));
      }
      
      await chrome.storage.local.set({ [key]: value });
      
    } catch (error) {
      console.error(`Error adjusting setting ${key}:`, error);
      this.showError(`Failed to adjust ${key}`);
    }
  }

  /**
   * Validate URL input
   */
  validateUrl(event) {
    const input = event.target;
    const url = input.value.trim();
    
    if (url && !this.isValidUrl(url)) {
      input.style.borderColor = '#dc3545';
      input.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
    } else {
      input.style.borderColor = '#e9ecef';
      input.style.boxShadow = 'none';
    }
  }

  /**
   * Check if URL is valid
   */
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  /**
   * Update status display
   */
  updateStatus(subtitleStatus, timestampStatus) {
    this.updateSubtitleStatus(subtitleStatus);
    this.updateTimestampStatus(timestampStatus);
  }

  /**
   * Update subtitle status
   */
  updateSubtitleStatus(status) {
    if (this.elements.statusSubtitle) {
      this.elements.statusSubtitle.textContent = status;
      this.elements.statusSubtitle.className = `status-value ${this.getStatusClass(status)}`;
    }
  }

  /**
   * Update timestamp status
   */
  updateTimestampStatus(status) {
    if (this.elements.statusTimestamp) {
      this.elements.statusTimestamp.textContent = status;
      this.elements.statusTimestamp.className = `status-value ${this.getStatusClass(status)}`;
    }
  }

  /**
   * Get CSS class for status
   */
  getStatusClass(status) {
    if (status === 'Berhasil' || status === 'Sedang diambil') return 'success';
    if (status === 'Gagal' || status === 'Error') return 'error';
    if (status === 'Dihentikan') return 'warning';
    return 'info';
  }

  /**
   * Set loading state for buttons
   */
  setLoadingState(isLoading) {
    this.elements.btnStart.disabled = isLoading;
    this.elements.btnStop.disabled = isLoading;
    
    if (isLoading) {
      this.elements.btnStart.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
      
      // Safety timeout to prevent stuck loading state
      setTimeout(() => {
        if (this.elements.btnStart.disabled) {
          console.warn('Loading state timeout - forcing reset');
          this.setLoadingState(false);
        }
      }, 5000); // 5 second timeout
      
    } else {
      this.elements.btnStart.innerHTML = '<span class="btn-icon">▶</span> Tampilkan';
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'error') {
    // Create temporary notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    const bgColor = type === 'success' ? '#28a745' : '#dc3545';
    const boxShadow = type === 'success' ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px ${boxShadow};
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Initialize popup controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.popupController = new PopupController();
});

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
