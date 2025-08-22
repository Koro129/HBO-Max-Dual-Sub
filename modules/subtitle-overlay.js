/**
 * Subtitle Overlay Module
 * Handles the visual display and styling of subtitle overlays
 */

const SubtitleOverlay = {
  // Configuration constants
  CONFIG: {
    BASE_FONT_SIZE: 18,
    BASE_POSITION: 4,
    Z_INDEX: 9999999,
    MAX_WIDTH: '80%',
    FONT_FAMILY: 'Arial, sans-serif',
    COLORS: {
      SUBTITLE_1: '#FFD700', // Yellow
      SUBTITLE_2: '#FFFFFF', // White
      BACKGROUND: 'rgba(0, 0, 0, 0.5)',
      SHADOW: '0 0 2px black'
    },
    ANIMATION: {
      DURATION: 200,
      EASING: 'ease-in-out'
    }
  },

  // State variables
  state: {
    container: null,
    subtitle1Line: null,
    subtitle2Line: null,
    isVisible: false,
    currentSettings: {
      sizeSub1: 0,
      sizeSub2: 0,
      posSub1: 0,
      posSub2: 0
    }
  },

  /**
   * Initialize the overlay system
   */
  init() {
    Utils.log('Initializing subtitle overlay');
    this.createOverlay();
    this.loadSettings();
    this.setupFullscreenHandler();
  },
  /**
   * Setup fullscreenchange event handler
   */
  setupFullscreenHandler() {
    document.addEventListener('webkitfullscreenchange', () => {
      Utils.log('Fullscreen change detected');
      this.handleFullscreenChange();
    });
  },

  /**
   * Handle moving overlay when entering/exiting fullscreen
   */
  handleFullscreenChange() {
    const overlay = this.state.container;
    if (!overlay) return;
    const fullscreenElem = document.fullscreenElement;
    if (fullscreenElem) {
      fullscreenElem.appendChild(overlay);
      overlay.style.position = 'absolute';
      overlay.style.left = '50%';
      overlay.style.bottom = '12%';
      overlay.style.transform = 'translateX(-50%)';
    } else {
      document.body.appendChild(overlay);
      overlay.style.position = 'fixed';
      overlay.style.left = '50%';
      overlay.style.bottom = '12%';
      overlay.style.transform = 'translateX(-50%)';
    }
  },

  /**
   * Create the main overlay container and subtitle lines
   */
  createOverlay() {
    try {
      // Remove existing overlay if any
      this.removeOverlay();

      // Create main container
      this.state.container = Utils.createElement('div', {
        id: 'dual-subtitle-overlay'
      });

      if (!this.state.container) {
        throw new Error('Failed to create container element');
      }

      // Apply container styles
      Object.assign(this.state.container.style, {
        position: 'fixed',
        left: '50%',
        bottom: '12%',
        transform: 'translateX(-50%)',
        zIndex: this.CONFIG.Z_INDEX.toString(),
        textAlign: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        maxWidth: this.CONFIG.MAX_WIDTH,
        fontFamily: this.CONFIG.FONT_FAMILY,
        textShadow: this.CONFIG.SHADOW,
        transition: `all ${this.CONFIG.ANIMATION.DURATION}ms ${this.CONFIG.ANIMATION.EASING}`
      });

      // Create Subtitle 1 line
      this.state.subtitle1Line = this.createSubtitleLine('subtitle-1', this.CONFIG.COLORS.SUBTITLE_1);
      
      // Create Subtitle 2 line
      this.state.subtitle2Line = this.createSubtitleLine('subtitle-2', this.CONFIG.COLORS.SUBTITLE_2);

      // Append lines to container
      this.state.container.appendChild(this.state.subtitle1Line);
      this.state.container.appendChild(this.state.subtitle2Line);

      // Add to document
      document.body.appendChild(this.state.container);
      
      Utils.log('Subtitle overlay created successfully');
    } catch (error) {
      Utils.log(`Error creating overlay: ${error.message}`, 'error');
    }
  },

  /**
   * Create a subtitle line element
   * @param {string} id - Element ID
   * @param {string} color - Text color
   * @returns {HTMLElement} Subtitle line element
   */
  createSubtitleLine(id, color) {
    const line = Utils.createElement('div', { id });
    
    if (!line) {
      throw new Error(`Failed to create subtitle line: ${id}`);
    }

    Object.assign(line.style, {
      color: color,
      backgroundColor: this.CONFIG.COLORS.BACKGROUND,
      padding: '4px 8px',
      marginBottom: '4px',
      borderRadius: '6px',
      fontSize: `${this.CONFIG.BASE_FONT_SIZE}px`,
      transition: `all ${this.CONFIG.ANIMATION.DURATION}ms ${this.CONFIG.ANIMATION.EASING}`
    });

    return line;
  },

  /**
   * Remove the overlay from the DOM
   */
  removeOverlay() {
    try {
      if (this.state.container && this.state.container.parentNode) {
        this.state.container.parentNode.removeChild(this.state.container);
      }
      
      this.state.container = null;
      this.state.subtitle1Line = null;
      this.state.subtitle2Line = null;
      this.state.isVisible = false;
      
      Utils.log('Subtitle overlay removed');
    } catch (error) {
      Utils.log(`Error removing overlay: ${error.message}`, 'error');
    }
  },

  /**
   * Update the overlay with new subtitle text
   * @param {string} subtitle1Text - Subtitle 1 text
   * @param {string} subtitle2Text - Subtitle 2 text
   */
  updateOverlay(subtitle1Text, subtitle2Text) {
    try {
      // Create overlay if it doesn't exist and we have text to show
      if (!this.state.container && (subtitle1Text || subtitle2Text)) {
        this.createOverlay();
      }

      if (!this.state.container) return;

      // Update text content
      if (this.state.subtitle1Line) {
        this.state.subtitle1Line.textContent = subtitle1Text || '';
      }
      
      if (this.state.subtitle2Line) {
        this.state.subtitle2Line.textContent = subtitle2Text || '';
      }

      // Apply current settings
      this.applySettings();

      // Show/hide overlay based on content
      if (subtitle1Text || subtitle2Text) {
        this.show();
      } else {
        this.hide();
      }

      // Utils.log(`Overlay updated - Sub 1: "${subtitle1Text}", Sub 2: "${subtitle2Text}"`);
    } catch (error) {
      Utils.log(`Error updating overlay: ${error.message}`, 'error');
    }
  },

  /**
   * Show the overlay with fade-in animation
   */
  show() {
    if (this.state.container && !this.state.isVisible) {
      this.state.container.style.opacity = '0';
      this.state.container.style.visibility = 'visible';
      
      // Trigger fade-in animation
      requestAnimationFrame(() => {
        if (this.state.container) {
          this.state.container.style.opacity = '1';
        }
      });
      
      this.state.isVisible = true;
    }
  },

  /**
   * Hide the overlay with fade-out animation
   */
  hide() {
    if (this.state.container && this.state.isVisible) {
      this.state.container.style.opacity = '0';
      
      setTimeout(() => {
        if (this.state.container) {
          this.state.container.style.visibility = 'hidden';
          this.state.isVisible = false;
        }
      }, this.CONFIG.ANIMATION.DURATION);
    }
  },

  /**
   * Apply current size and position settings
   */
  applySettings() {
    try {
      const { sizeSub1, sizeSub2, posSub1, posSub2 } = this.state.currentSettings;

      if (this.state.subtitle1Line) {
        this.state.subtitle1Line.style.fontSize = `${this.CONFIG.BASE_FONT_SIZE + sizeSub1}px`;
        this.state.subtitle1Line.style.marginBottom = `${this.CONFIG.BASE_POSITION + posSub1}px`;
      }

      if (this.state.subtitle2Line) {
        this.state.subtitle2Line.style.fontSize = `${this.CONFIG.BASE_FONT_SIZE + sizeSub2}px`;
        this.state.subtitle2Line.style.marginBottom = `${this.CONFIG.BASE_POSITION + posSub2}px`;
      }
    } catch (error) {
      Utils.log(`Error applying settings: ${error.message}`, 'error');
    }
  },

  /**
   * Update overlay settings
   * @param {Object} settings - New settings object
   */
  updateSettings(settings) {
    try {
      Object.assign(this.state.currentSettings, settings);
      this.applySettings();
      Utils.log(`Settings updated: ${JSON.stringify(settings)}`);
    } catch (error) {
      Utils.log(`Error updating settings: ${error.message}`, 'error');
    }
  },

  /**
   * Load settings from storage
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['sizeSub1', 'sizeSub2', 'posSub1', 'posSub2']);
      
      this.state.currentSettings = {
        sizeSub1: result.sizeSub1 || 0,
        sizeSub2: result.sizeSub2 || 0,
        posSub1: result.posSub1 || 0,
        posSub2: result.posSub2 || 0
      };

      this.applySettings();
      Utils.log('Settings loaded from storage');
    } catch (error) {
      Utils.log(`Error loading settings: ${error.message}`, 'error');
    }
  },

  /**
   * Get current overlay state
   * @returns {Object} Current state information
   */
  getState() {
    return {
      isVisible: this.state.isVisible,
      hasContainer: !!this.state.container,
      settings: { ...this.state.currentSettings }
    };
  }
};



// Make SubtitleOverlay globally available for Chrome Extension
if (typeof window !== 'undefined') {
  window.SubtitleOverlay = SubtitleOverlay;
}
