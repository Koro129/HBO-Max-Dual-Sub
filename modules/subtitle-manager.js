/**
 * Subtitle Manager Module
 * Handles subtitle loading, synchronization, and video management
 */

const SubtitleManager = {
  // State variables
  state: {
    subtitle1Subtitles: [],
    subtitle2Subtitles: [],
    videoElement: null,
    isActive: false,
    lastSubtitle1Text: '',
    lastSubtitle2Text: '',
    currentTime: 0,
    timeUpdateHandler: null,
    cleanupInterval: null // Added for enhanced cleanup
  },

  // Configuration
  CONFIG: {
    VIDEO_SELECTOR: 'video[data-testid="VideoElement"]',
    TIME_UPDATE_INTERVAL: 100, // milliseconds
    TOLERANCE: 0.1, // seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // milliseconds
    CLEANUP_INTERVAL: 30000 // 30 seconds
  },

  /**
   * Initialize the subtitle manager
   */
  init() {
    Utils.log('Initializing subtitle manager');
    this.setupStorageListener();
    this.setupPeriodicCleanup();
  },

  /**
   * Pause subtitle operations (when page is hidden)
   */
  pauseOperations() {
    try {
      if (this.state.isActive && this.state.videoElement && this.state.timeUpdateHandler) {
        // Remove event listener to pause updates
        this.state.videoElement.removeEventListener('timeupdate', this.state.timeUpdateHandler);
        Utils.log('Subtitle operations paused');
      }
    } catch (error) {
      Utils.log(`Error pausing operations: ${error.message}`, 'error');
    }
  },

  /**
   * Resume subtitle operations (when page becomes visible)
   */
  resumeOperations() {
    try {
      if (this.state.isActive && this.state.videoElement && this.state.timeUpdateHandler) {
        // Re-add event listener to resume updates
        this.state.videoElement.addEventListener('timeupdate', this.state.timeUpdateHandler);
        Utils.log('Subtitle operations resumed');
      }
    } catch (error) {
      Utils.log(`Error resuming operations: ${error.message}`, 'error');
    }
  },

  /**
   * Enhanced cleanup with better resource management
   */
  performCleanup() {
    try {
      // Clean up invalid subtitle entries
      this.state.subtitle1Subtitles = this.state.subtitle1Subtitles.filter(sub => 
        sub && sub.startTime >= 0 && sub.endTime > sub.startTime && sub.text
      );
      
      this.state.subtitle2Subtitles = this.state.subtitle2Subtitles.filter(sub => 
        sub && sub.startTime >= 0 && sub.endTime > sub.startTime && sub.text
      );
      
      // Verify video element still exists
      if (this.state.videoElement && !document.contains(this.state.videoElement)) {
        Utils.log('Video element no longer in DOM, reconnecting...', 'warn');
        this.reconnectVideoElement();
      }
      
      // Clear any stale timeouts or intervals
      if (this.state.cleanupInterval) {
        clearInterval(this.state.cleanupInterval);
        this.state.cleanupInterval = null;
      }
      
      // Re-setup cleanup interval
      this.setupPeriodicCleanup();
      
      Utils.log('Enhanced cleanup completed');
    } catch (error) {
      Utils.log(`Error during enhanced cleanup: ${error.message}`, 'error');
    }
  },

  /**
   * Setup periodic cleanup to prevent memory leaks
   */
  setupPeriodicCleanup() {
    // Clear existing interval if any
    if (this.state.cleanupInterval) {
      clearInterval(this.state.cleanupInterval);
    }
    
    this.state.cleanupInterval = setInterval(() => {
      if (this.state.isActive) {
        this.performCleanup();
      }
    }, this.CONFIG.CLEANUP_INTERVAL);
  },

  /**
   * Reconnect to video element if lost
   */
  reconnectVideoElement() {
    try {
      if (this.state.timeUpdateHandler) {
        this.state.videoElement.removeEventListener('timeupdate', this.state.timeUpdateHandler);
      }
      
      this.state.videoElement = Utils.safeQuerySelector(this.CONFIG.VIDEO_SELECTOR);
      
      if (this.state.videoElement && this.state.timeUpdateHandler) {
        this.state.videoElement.addEventListener('timeupdate', this.state.timeUpdateHandler);
        Utils.log('Video element reconnected');
      }
    } catch (error) {
      Utils.log(`Error reconnecting video element: ${error.message}`, 'error');
    }
  },

  /**
   * Start subtitle display
   * @param {string} subtitle1Url - URL for Subtitle 1
   * @param {string} subtitle2Url - URL for Subtitle 2
   */
  async start(subtitle1Url, subtitle2Url) {
    try {
      Utils.log('Starting subtitle display');
      
      // Load subtitles
      await this.loadSubtitles(subtitle1Url, subtitle2Url);
      
      // Setup video monitoring
      this.setupVideoMonitoring();
      
      this.state.isActive = true;
      
      Utils.log('Subtitle display started successfully');
      return { success: true };
    } catch (error) {
      Utils.log(`Error starting subtitle display: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  },

  /**
   * Stop subtitle display
   */
  stop() {
    try {
      Utils.log('Stopping subtitle display');
      
      // Remove video event listener
      if (this.state.videoElement && this.state.timeUpdateHandler) {
        this.state.videoElement.removeEventListener('timeupdate', this.state.timeUpdateHandler);
      }
      
      // Clear state
      this.state.videoElement = null;
      this.state.timeUpdateHandler = null;
      this.state.isActive = false;
      this.state.subtitle1Subtitles = [];
      this.state.subtitle2Subtitles = [];
      
      // Hide overlay
      SubtitleOverlay.updateOverlay('', '');
      
      Utils.log('Subtitle display stopped');
      return { success: true };
    } catch (error) {
      Utils.log(`Error stopping subtitle display: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  },

  /**
   * Load subtitles from URLs
   * @param {string} subtitle1Url - URL for Subtitle 1
   * @param {string} subtitle2Url - URL for Subtitle 2
   */
  async loadSubtitles(subtitle1Url, subtitle2Url) {
    try {
      const promises = [];
      
      if (subtitle1Url) {
        promises.push(
          SubtitleParser.fetchAllVTTs(subtitle1Url)
            .then(content => SubtitleParser.parseVTT(content))
            .then(subtitles => {
              this.state.subtitle1Subtitles = subtitles;
              Utils.log(`Loaded ${subtitles.length} Subtitle 1 entries`);
            })
        );
      }
      
      if (subtitle2Url) {
        promises.push(
          SubtitleParser.fetchAllVTTs(subtitle2Url)
            .then(content => SubtitleParser.parseVTT(content))
            .then(subtitles => {
              this.state.subtitle2Subtitles = subtitles;
              Utils.log(`Loaded ${subtitles.length} Subtitle 2 entries`);
            })
        );
      }
      
      await Promise.all(promises);
      
      // Validate loaded subtitles
      this.validateLoadedSubtitles();
      
    } catch (error) {
      Utils.log(`Error loading subtitles: ${error.message}`, 'error');
      throw error;
    }
  },

  /**
   * Validate loaded subtitles
   */
  validateLoadedSubtitles() {
    const subtitle1Validation = SubtitleParser.validateSubtitles(this.state.subtitle1Subtitles);
    const subtitle2Validation = SubtitleParser.validateSubtitles(this.state.subtitle2Subtitles);
    
    if (!subtitle1Validation.isValid && this.state.subtitle1Subtitles.length > 0) {
      Utils.log(`Subtitle 1 validation errors: ${subtitle1Validation.errors.join(', ')}`, 'warn');
    }
    
    if (!subtitle2Validation.isValid && this.state.subtitle2Subtitles.length > 0) {
      Utils.log(`Subtitle 2 validation errors: ${subtitle2Validation.errors.join(', ')}`, 'warn');
    }
    
    Utils.log(`Validation complete - Sub 1: ${subtitle1Validation.count}, Sub 2: ${subtitle2Validation.count}`);
  },

  /**
   * Setup video monitoring
   */
  setupVideoMonitoring() {
    try {
      // Find video element
      this.state.videoElement = Utils.safeQuerySelector(this.CONFIG.VIDEO_SELECTOR);
      
      if (!this.state.videoElement) {
        throw new Error('Video element not found');
      }
      
      // Create throttled time update handler
      this.state.timeUpdateHandler = Utils.throttle(
        this.handleVideoTimeUpdate.bind(this),
        this.CONFIG.TIME_UPDATE_INTERVAL
      );
      
      // Add event listener
      this.state.videoElement.addEventListener('timeupdate', this.state.timeUpdateHandler);
      
      Utils.log('Video monitoring setup complete');
    } catch (error) {
      Utils.log(`Error setting up video monitoring: ${error.message}`, 'error');
      throw error;
    }
  },

  /**
   * Handle video time updates
   */
  handleVideoTimeUpdate() {
    try {
      if (!this.state.videoElement || !this.state.isActive) return;
      
      const currentTime = this.state.videoElement.currentTime;
      
      if (isNaN(currentTime)) {
        // Utils.log('Invalid video time detected', 'warn');
        return;
      }
      
      this.state.currentTime = currentTime;
      
      // Find matching subtitles
      const subtitle1Match = SubtitleParser.findSubtitleForTime(
        this.state.subtitle1Subtitles, 
        currentTime, 
        this.CONFIG.TOLERANCE
      );
      
      const subtitle2Match = SubtitleParser.findSubtitleForTime(
        this.state.subtitle2Subtitles, 
        currentTime, 
        this.CONFIG.TOLERANCE
      );
      
      // Update overlay
      const subtitle1Text = subtitle1Match ? subtitle1Match.text : '';
      const subtitle2Text = subtitle2Match ? subtitle2Match.text : '';
      
      // Only update if text has changed
      if (subtitle1Text !== this.state.lastSubtitle1Text || 
          subtitle2Text !== this.state.lastSubtitle2Text) {
        
        this.state.lastSubtitle1Text = subtitle1Text;
        this.state.lastSubtitle2Text = subtitle2Text;
        
        SubtitleOverlay.updateOverlay(subtitle1Text, subtitle2Text);
        
        // Update status in storage
        this.updateStatus(subtitle1Match, subtitle2Match);
      }
      
    } catch (error) {
      Utils.log(`Error handling video time update: ${error.message}`, 'error');
    }
  },

  /**
   * Update status in storage
   * @param {Object} subtitle1Match - Matched Subtitle 1
   * @param {Object} subtitle2Match - Matched Subtitle 2
   */
  updateStatus(subtitle1Match, subtitle2Match) {
    try {
      const timestampStatus = subtitle1Match || subtitle2Match ? 'Success' : 'Timestamp not matched';
      chrome.storage.local.set({ timestampStatus });
    } catch (error) {
      Utils.log(`Error updating status: ${error.message}`, 'error');
    }
  },

  /**
   * Setup storage change listener
   */
  setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      
      // Handle status changes
      if (changes.status) {
        const status = changes.status.newValue;
        if (status === 'start') {
          this.handleStartCommand();
        } else if (status === 'stop') {
          this.handleStopCommand();
        }
      }
      
      // Handle settings changes
      if (changes.sizeSub1 || changes.sizeSub2 || changes.posSub1 || changes.posSub2) {
        this.handleSettingsChange(changes);
      }
    });
  },

  /**
   * Handle start command from popup
   */
  async handleStartCommand() {
    try {
      const { subtitleSub1URL, subtitleSub2URL } = await chrome.storage.local.get([
        'subtitleSub1URL', 
        'subtitleSub2URL'
      ]);
      // Validate URLs first
      if (!subtitleSub1URL && !subtitleSub2URL) {
        throw new Error('No subtitle URLs provided');
      }
      // Start subtitle display
      const result = await this.start(subtitleSub1URL, subtitleSub2URL);
      if (result.success) {
        chrome.storage.local.set({ 
          subtitleStatus: 'Success',
          timestampStatus: 'Fetching'
        });
        Utils.log('Subtitle display started successfully');
      } else {
        throw new Error(result.error || 'Failed to start subtitle display');
      }
    } catch (error) {
      Utils.log(`Error in handleStartCommand: ${error.message}`, 'error');
      // Set appropriate error status
      let errorMessage = 'Failed to fetch subtitle';
      if (error.message.includes('No subtitle URLs')) {
        errorMessage = 'Subtitle URL cannot be empty';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Failed to fetch subtitle from URL';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Failed to parse VTT subtitle';
      } else if (error.message.includes('video')) {
        errorMessage = 'Video element not found';
      }
      chrome.storage.local.set({ 
        subtitleStatus: errorMessage,
        timestampStatus: 'Failed'
      });
    }
  },

  /**
   * Handle stop command from popup
   */
  handleStopCommand() {
    this.stop();
    chrome.storage.local.set({
      subtitleStatus: 'Stopped',
      timestampStatus: 'Stopped'
    });
  },

  /**
   * Handle settings changes
   * @param {Object} changes - Storage changes
   */
  handleSettingsChange(changes) {
    const settings = {};
    
    if (changes.sizeSub1) settings.sizeSub1 = changes.sizeSub1.newValue || 0;
    if (changes.sizeSub2) settings.sizeSub2 = changes.sizeSub2.newValue || 0;
    if (changes.posSub1) settings.posSub1 = changes.posSub1.newValue || 0;
    if (changes.posSub2) settings.posSub2 = changes.posSub2.newValue || 0;
    
    if (Object.keys(settings).length > 0) {
      SubtitleOverlay.updateSettings(settings);
    }
  },

  /**
   * Get current manager state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      isActive: this.state.isActive,
      hasVideo: !!this.state.videoElement,
      subtitleCounts: {
        subtitle1: this.state.subtitle1Subtitles.length,
        subtitle2: this.state.subtitle2Subtitles.length
      },
      currentTime: this.state.currentTime,
      lastTexts: {
        subtitle1: this.state.lastSubtitle1Text,
        subtitle2: this.state.lastSubtitle2Text
      }
    };
  }
};



// Make SubtitleManager globally available for Chrome Extension
if (typeof window !== 'undefined') {
  window.SubtitleManager = SubtitleManager;
}
