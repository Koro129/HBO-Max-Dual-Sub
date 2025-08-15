let engSubs = [];
let idSubs = [];
let lastIdText = '';
let lastEnText = '';

const baseSize = 18;
const basePos = 4;

let currentSizeId = 0;
let currentSizeEng = 0;
let currentPosId = 0;
let currentPosEng = 0;

let videoEl = null;
let overlayCache = null;
let idLineCache = null;
let enLineCache = null;
let debounceTimer = null;

function parseVTT(vttText) {
  const lines = vttText.split(/\r?\n/);
  const subs = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}/.test(line)) {
      const [start, end] = line.split(' --> ');
      i++;
      let textLines = [];
      while (i < lines.length && lines[i].trim() !== '') textLines.push(lines[i++]);
      subs.push({ startTime: toSeconds(start), endTime: toSeconds(end.split(' ')[0]), text: textLines.join('\n') });
    } else {
      i++;
    }
  }
  return subs;
}

function toSeconds(hms) {
  const m = hms.match(/(\d+):(\d+):(\d+\.\d+)/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0;
}

function findSubtitleForTime(subs, currentTime) {
  const tolerance = 0.1;
  return subs.find(s => (s.startTime - tolerance) <= currentTime && currentTime <= (s.endTime + tolerance)) || null;
}

function createOverlay() {
  removeOverlay();
  const container = document.createElement('div');
  container.id = 'dual-subtitle-overlay';
  Object.assign(container.style, {
    position: 'fixed',
    left: '50%',
    bottom: '12%',
    transform: 'translateX(-50%)',
    zIndex: '9999999',
    textAlign: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    maxWidth: '80%',
    fontFamily: 'Arial, sans-serif',
    textShadow: '0 0 2px black'
  });

  const idLine = document.createElement('div');
  idLine.id = 'subtitle-id';
  Object.assign(idLine.style, {
    color: 'yellow',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '4px 8px',
    marginBottom: '4px',
    borderRadius: '6px',
    fontSize: `${baseSize + currentSizeId}px`
  });

  const enLine = document.createElement('div');
  enLine.id = 'subtitle-en';
  Object.assign(enLine.style, {
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: '4px 8px',
    marginBottom: '4px',
    borderRadius: '6px',
    fontSize: `${baseSize + currentSizeEng}px`
  });

  container.append(idLine, enLine);
  document.body.appendChild(container);
  overlayCache = container;
  idLineCache = idLine;
  enLineCache = enLine;
}

function removeOverlay() {
  if (overlayCache) {
    overlayCache.remove();
    overlayCache = null;
    idLineCache = null;
    enLineCache = null;
  } else {
    const old = document.getElementById('dual-subtitle-overlay');
    if (old) old.remove();
  }
}

function updateOverlay(idText, enText) {
  if (!overlayCache && (idText || enText)) {
    createOverlay();
  }
  if (!overlayCache) return;

  idLineCache.textContent = idText || '';
  enLineCache.textContent = enText || '';
  idLineCache.style.fontSize = `${baseSize + currentSizeId}px`;
  enLineCache.style.fontSize = `${baseSize + currentSizeEng}px`;
  idLineCache.style.marginBottom = `${basePos + currentPosId}px`;
  enLineCache.style.marginBottom = `${basePos + currentPosEng}px`;

  if (!idText && !enText) removeOverlay();
}

function onVideoTimeUpdate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    if (!videoEl || isNaN(videoEl.currentTime)) {
      chrome.storage.local.set({ timestampStatus: 'Failed to read video timestamp' });
      updateOverlay('', '');
      return;
    }
    const cur = videoEl.currentTime;
    const enMatch = findSubtitleForTime(engSubs, cur);
    const idMatch = findSubtitleForTime(idSubs, cur);

    lastIdText = idMatch ? idMatch.text : '';
    lastEnText = enMatch ? enMatch.text : '';
    updateOverlay(lastIdText, lastEnText);

    chrome.storage.local.set({
      timestampStatus: enMatch || idMatch ? 'Success' : 'Timestamp not matched'
    });
  }, 100); // Debounce by 100ms
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  if (changes.status) {
    const status = changes.status.newValue;
    if (status === 'start') {
      try {
        const { subtitleEngURL, subtitleIdURL } = await chrome.storage.local.get(['subtitleEngURL', 'subtitleIdURL']);

        async function fetchAllVTTs(baseUrl) {
          let idx = 1;
          let allText = '';
          while (true) {
        const url = baseUrl.replace(/(\d+)\.vtt$/, `${idx}.vtt`);
        try {
          const resp = await fetch(url);
          if (!resp.ok) break;
          const text = await resp.text();
          // Check for error XML
          if (text.includes('<Error>') && text.includes('<Code>NoSuchKey</Code>')) break;
          allText += text + '\n';
          idx++;
        } catch {
          break;
        }
          }
          return allText;
        }

        engSubs = subtitleEngURL ? parseVTT(await fetchAllVTTs(subtitleEngURL)) : [];
        idSubs = subtitleIdURL ? parseVTT(await fetchAllVTTs(subtitleIdURL)) : [];
        chrome.storage.local.set({ subtitleStatus: 'Success' });
      } catch {
        chrome.storage.local.set({ subtitleStatus: 'Failed to fetch subtitle' });
        return;
      }
      chrome.storage.local.set({ timestampStatus: 'Fetching' });
      createOverlay();
      videoEl = document.querySelector('video[data-testid="VideoElement"]');
      if (!videoEl) {
        chrome.storage.local.set({ timestampStatus: 'Video element not found' });
        return;
      }
      videoEl.addEventListener('timeupdate', onVideoTimeUpdate);
    } else if (status === 'stop') {
      if (videoEl) {
        videoEl.removeEventListener('timeupdate', onVideoTimeUpdate);
        videoEl = null;
      }
      removeOverlay();
      chrome.storage.local.set({
        subtitleStatus: 'Stopped',
        timestampStatus: 'Stopped'
      });
    }
  }

  if (changes.sizeId) currentSizeId = changes.sizeId.newValue || 0;
  if (changes.sizeEng) currentSizeEng = changes.sizeEng.newValue || 0;
  if (changes.posId) currentPosId = changes.posId.newValue || 0;
  if (changes.posEng) currentPosEng = changes.posEng.newValue || 0;
  if (changes.sizeId || changes.sizeEng || changes.posId || changes.posEng) {
    updateOverlay(lastIdText, lastEnText);
  }
});
