
# Dual Subtitle for HBO Max (Chrome Extension)

This is a simple Chrome Extension that lets you show two subtitles at the same time on HBO Max. It was made as a learning project and is great for anyone who wants to watch with dual subtitles (for example, English and your native language).

**Version:** 1.0.0  
**Works on:** Chrome 88+ (Manifest V3)

---

## Features

- Show two subtitles at once (Subtitle 1 & Subtitle 2)
- Subtitles are synced with the video
- Supports WebVTT (.vtt) subtitle files
- Switch the URLs for Subtitle 1 and 2 easily
- Change font size and position for both subtitles

---

## How to Install

1. Download or clone this extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Turn on "Developer mode" (top right)
4. Click "Load unpacked" and select this extension folder

---

## How to Use

1. Enter the URLs for your Subtitle 1 and Subtitle 2 (must be .vtt files)
2. Adjust the font size and position if you want
3. Use the "Switch URLs" button if you want to swap the two subtitle URLs
4. Click "Show" to start displaying the subtitles
5. You can see the status of the subtitles and timestamps at the bottom
6. Click "Stop" to hide the subtitles

---

## Controls

- **Font Size:** Use `+` to make bigger, `-` to make smaller
- **Position:** Use `↑` to move up, `↓` to move down
- **Switch:** Swap Subtitle 1 and 2 URLs
- **Show/Stop:** Start or stop showing subtitles

---

## Troubleshooting

- If loading is stuck, the extension will try to reset itself every few seconds
- If the video is not found, it will try to reconnect automatically
- If there are network errors, it will retry a few times
- If you see memory issues, the extension will try to clean up by itself

**If you have problems:**
- Try refreshing the popup
- Reload the extension in Chrome
- Check the browser console for more details

---

## About This Project

This extension was made by a recent graduate as a way to practice making Chrome Extensions and working with JavaScript modules. The code is organized into several files to keep things neat:

- `content.js`: Main logic for the extension
- `modules/utils.js`: Helper functions
- `modules/subtitle-parser.js`: For reading VTT files
- `modules/subtitle-overlay.js`: Shows the subtitles on the video
- `modules/subtitle-manager.js`: Handles loading and syncing subtitles
- `popup/`: Files for the popup window (HTML, CSS, JS)

Feel free to use, modify, or learn from this project!
