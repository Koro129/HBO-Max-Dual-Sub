# Dual Subtitle HBO Max Chrome Extension

This Chrome extension allows you to display two subtitles (e.g., English & Indonesian) simultaneously on HBO Max, with separate controls for each subtitle's size and position.

## Features
- Overlay two subtitles on HBO Max videos.
- Automatic synchronization with the video timestamp.
- Separate controls for font size and position for each subtitle (English & Indonesian).
- Subtitle and timestamp status displayed in the popup.
- Supports external subtitle URLs (WebVTT `.vtt` format).
- Easily start/stop the subtitle overlay.

## How to Use
1. **Install the extension manually:**
   - Download or clone this repository.
   - Open Chrome and go to `chrome://extensions/`.
   - Enable "Developer mode".
   - Click "Load unpacked" and select this project folder.
2. **Open HBO Max and play the video you want to watch.**
3. **Click the extension icon, enter the English and/or Indonesian subtitle URLs (`.vtt` format).**
   - At least one URL must be filled in.
4. **Click "Start" to display the subtitles.**
   - Subtitles will appear over the video.
   - Subtitle and timestamp status will be shown in the popup.
5. **Use the + / - buttons to adjust the size and position of each subtitle as desired.**
6. **Click "Stop" to hide the subtitle overlay.**

## File Structure
- `manifest.json` — Chrome extension configuration.
- `popup.html` — Extension popup UI.
- `popup.js` — Popup logic (input, controls, status, etc).
- `content.js` — Main script for displaying and managing the subtitle overlay on the video page.
