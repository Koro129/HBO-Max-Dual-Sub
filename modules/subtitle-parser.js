/**
 * Subtitle Parser Module
 * Handles VTT file parsing and subtitle data management
 */

const SubtitleParser = {
  /**
   * Parse VTT content and extract subtitle data
   * @param {string} vttText - Raw VTT content
   * @returns {Array} Array of subtitle objects
   */
  parseVTT(vttText) {
    try {
      const lines = vttText.split(/\r?\n/);
      const subtitles = [];
      
      for (let i = 0; i < lines.length;) {
        const line = lines[i].trim();
        
        // Check for timestamp line
        if (this.isTimestampLine(line)) {
          const [start, end] = line.split(' --> ');
          i++;
          
          // Collect text lines until empty line
          let textLines = [];
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i++]);
          }
          
          const subtitle = {
            startTime: Utils.timeToSeconds(start),
            endTime: Utils.timeToSeconds(end.split(' ')[0]),
            text: textLines.join('\n').trim(),
            originalStart: start,
            originalEnd: end
          };
          
          if (subtitle.text) {
            subtitles.push(subtitle);
          }
        } else {
          i++;
        }
      }
      
      Utils.log(`Parsed ${subtitles.length} subtitles from VTT`);
      return subtitles;
    } catch (error) {
      Utils.log(`Error parsing VTT: ${error.message}`, 'error');
      return [];
    }
  },

  /**
   * Check if a line contains timestamp information
   * @param {string} line - Line to check
   * @returns {boolean} True if line contains timestamp
   */
  isTimestampLine(line) {
    return /^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/.test(line);
  },

  /**
   * Find subtitle for a specific time with tolerance
   * @param {Array} subtitles - Array of subtitle objects
   * @param {number} currentTime - Current time in seconds
   * @param {number} tolerance - Time tolerance in seconds (default: 0.1)
   * @returns {Object|null} Matching subtitle or null
   */
  findSubtitleForTime(subtitles, currentTime, tolerance = 0.1) {
    if (!subtitles || subtitles.length === 0) return null;
    
    return subtitles.find(subtitle => 
      (subtitle.startTime - tolerance) <= currentTime && 
      currentTime <= (subtitle.endTime + tolerance)
    ) || null;
  },

  /**
   * Enhanced VTT content validation with detailed checks
   * @param {string} content - Content to validate
   * @returns {Object} Validation result with details
   */
  validateVTTContentDetailed(content) {
    const result = {
      isValid: false,
      hasHeader: false,
      hasTimestamps: false,
      timestampCount: 0,
      textCount: 0,
      errors: [],
      warnings: []
    };
    
    try {
      if (!content || content.trim() === '') {
        result.errors.push('Content is empty');
        return result;
      }
      
      const lines = content.split(/\r?\n/);
      
      // Check for VTT header
      if (content.includes('WEBVTT')) {
        result.hasHeader = true;
      } else {
        result.warnings.push('Missing WEBVTT header');
      }
      
      // Count timestamps and text blocks
      let inTextBlock = false;
      let currentTextBlock = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (this.isTimestampLine(trimmedLine)) {
          result.hasTimestamps = true;
          result.timestampCount++;
          inTextBlock = false;
        } else if (trimmedLine !== '' && inTextBlock) {
          currentTextBlock += trimmedLine + ' ';
        } else if (trimmedLine === '' && currentTextBlock.trim() !== '') {
          result.textCount++;
          currentTextBlock = '';
          inTextBlock = false;
        } else if (trimmedLine !== '' && !inTextBlock) {
          inTextBlock = true;
          currentTextBlock = trimmedLine + ' ';
        }
      }
      
      // Final text block
      if (currentTextBlock.trim() !== '') {
        result.textCount++;
      }
      
      // Determine validity
      result.isValid = result.hasTimestamps && result.timestampCount > 0 && result.textCount > 0;
      
      // Add specific error messages
      if (!result.hasTimestamps) {
        result.errors.push('No timestamp lines found');
      }
      
      if (result.timestampCount === 0) {
        result.errors.push('No valid timestamps found');
      }
      
      if (result.textCount === 0) {
        result.errors.push('No subtitle text found');
      }
      
      // Check for common VTT format issues
      if (result.timestampCount !== result.textCount) {
        result.warnings.push(`Timestamp count (${result.timestampCount}) doesn't match text block count (${result.textCount})`);
      }
      
      return result;
      
    } catch (error) {
      result.errors.push(`Validation error: ${error.message}`);
      return result;
    }
  },

  /**
   * Enhanced fetch with better error handling and retry logic
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async enhancedFetch(url, options = {}) {
    const defaultOptions = {
      signal: AbortSignal.timeout(15000), // 15 second timeout
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Dual-Subtitle-Extension/1.0.0'
      }
    };
    
    const fetchOptions = { ...defaultOptions, ...options };
    
    try {
      Utils.log(`Fetching: ${url}`);
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Fetch timeout for ${url}`);
      }
      throw error;
    }
  },

  /**
   * Enhanced VTT fetching with better progress tracking
   * @param {string} baseUrl - Base URL for VTT files
   * @returns {Promise<string>} Combined VTT content
   */
  async fetchAllVTTs(baseUrl) {
    try {
      let index = 1;
      let allContent = '';
      let retryCount = 0;
      const maxRetries = 3;
      const startTime = performance.now();
      
      Utils.log(`Starting enhanced VTT fetch from: ${baseUrl}`);
      
      while (true) {
        const url = baseUrl.replace(/(\d+)\.vtt$/, `${index}.vtt`);
        
        try {
          Utils.log(`Fetching VTT segment ${index}: ${url}`);
          
          const response = await this.enhancedFetch(url);
          const text = await response.text();
          
          // Enhanced content validation
          const validation = this.validateVTTContentDetailed(text);
          
          if (!validation.isValid) {
            Utils.log(`Invalid VTT content in segment ${index}: ${validation.errors.join(', ')}`, 'warn');
            break;
          }
          
          allContent += text + '\n';
          Utils.log(`Successfully fetched segment ${index} (${text.length} chars, ${validation.timestampCount} timestamps)`);
          
          index++;
          retryCount = 0; // Reset retry count on success
          
        } catch (error) {
          if (error.message.includes('404') || error.message.includes('NoSuchKey')) {
            Utils.log(`Segment ${index} not found - end of segments`);
            break;
          }
          
          Utils.log(`Error fetching VTT ${index}: ${error.message}`, 'warn');
          
          retryCount++;
          if (retryCount >= maxRetries) {
            Utils.log(`Max retries reached for VTT ${index}, stopping`, 'warn');
            break;
          }
          
          // Exponential backoff
          const delay = 1000 * Math.pow(2, retryCount - 1);
          Utils.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      if (allContent.trim() === '') {
        throw new Error('No valid VTT content found');
      }
      
      const totalTime = performance.now() - startTime;
      Utils.log(`Enhanced VTT fetch completed in ${totalTime.toFixed(2)}ms - ${index - 1} segments, ${allContent.length} total chars`);
      
      return allContent;
      
    } catch (error) {
      Utils.log(`Critical error in enhanced VTT fetch: ${error.message}`, 'error');
      throw error;
    }
  },

  /**
   * Validate subtitle data
   * @param {Array} subtitles - Array of subtitle objects
   * @returns {Object} Validation result with isValid and errors
   */
  validateSubtitles(subtitles) {
    const errors = [];
    
    if (!Array.isArray(subtitles)) {
      errors.push('Subtitles must be an array');
      return { isValid: false, errors };
    }
    
    subtitles.forEach((subtitle, index) => {
      if (!subtitle.startTime || subtitle.startTime < 0) {
        errors.push(`Subtitle ${index}: Invalid start time`);
      }
      if (!subtitle.endTime || subtitle.endTime < 0) {
        errors.push(`Subtitle ${index}: Invalid end time`);
      }
      if (subtitle.startTime >= subtitle.endTime) {
        errors.push(`Subtitle ${index}: Start time must be before end time`);
      }
      if (!subtitle.text || subtitle.text.trim() === '') {
        errors.push(`Subtitle ${index}: Empty text`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      count: subtitles.length
    };
  },

  /**
   * Clean and normalize subtitle text
   * @param {string} text - Raw subtitle text
   * @returns {string} Cleaned text
   */
  cleanSubtitleText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n+/g, '\n')
      .trim();
  },

  /**
   * Merge multiple subtitle arrays
   * @param {...Array} subtitleArrays - Arrays of subtitles to merge
   * @returns {Array} Merged and sorted subtitles
   */
  mergeSubtitles(...subtitleArrays) {
    const allSubtitles = subtitleArrays.flat();
    
    // Sort by start time
    return allSubtitles.sort((a, b) => a.startTime - b.startTime);
  }
};



// Make SubtitleParser globally available for Chrome Extension
if (typeof window !== 'undefined') {
  window.SubtitleParser = SubtitleParser;
}
