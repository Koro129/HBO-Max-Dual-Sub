const engInput = document.getElementById('engUrl');
const idInput = document.getElementById('idUrl');

const btnFontPlus = document.getElementById('idFontPlus');
const btnFontMinus = document.getElementById('idFontMinus');
const btnPosUp = document.getElementById('idPosUp');
const btnPosDown = document.getElementById('idPosDown');

const btnFontPlusEng = document.getElementById('engFontPlus');
const btnFontMinusEng = document.getElementById('engFontMinus');
const btnPosUpEng = document.getElementById('engPosUp');
const btnPosDownEng = document.getElementById('engPosDown');

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');

const statusSubtitle = document.getElementById('statusSubtitle');
const statusTimestamp = document.getElementById('statusTimestamp');

function updateStatus(subtitle, timestamp) {
  statusSubtitle.textContent = 'Subtitle: ' + subtitle;
  statusTimestamp.textContent = 'Video Timestamp: ' + timestamp;
}


// Load saved URLs and status if any
chrome.storage.local.get(['subtitleEngURL', 'subtitleIdURL', 'subtitleStatus', 'timestampStatus'], (res) => {
  engInput.value = res.subtitleEngURL || '';
  idInput.value = res.subtitleIdURL || '';
  updateStatus(res.subtitleStatus || '-', res.timestampStatus || '-');
});

// Listen for storage changes to update status in popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.subtitleStatus) {
    statusSubtitle.textContent = 'Subtitle: ' + (changes.subtitleStatus.newValue || '-');
  }
  if (changes.timestampStatus) {
  statusTimestamp.textContent = 'Video Timestamp: ' + (changes.timestampStatus.newValue || '-');
  }
});


btnStart.addEventListener('click', () => {
  const engUrl = engInput.value.trim();
  const idUrl = idInput.value.trim();
  if (!engUrl && !idUrl) {
    alert('Please fill at least one subtitle URL.');
    return;
  }
  // Save to storage and set status to start
  chrome.storage.local.set({
    subtitleEngURL: engUrl,
    subtitleIdURL: idUrl,
    status: 'start',
    subtitleStatus: 'Fetching',
    timestampStatus: 'Fetching'
  });
});


btnStop.addEventListener('click', () => {
  chrome.storage.local.set({
    status: 'stop',
    subtitleStatus: '-',
    timestampStatus: '-'
  });
});



// Debounce map for each storageKey
const debounceMap = {};
function createStorageButtonHandler(storageKey, delta, min = 0) {
  return () => {
    if (debounceMap[storageKey]) clearTimeout(debounceMap[storageKey]);
    debounceMap[storageKey] = setTimeout(() => {
      chrome.storage.local.get([storageKey], (res) => {
        let value = Number(res[storageKey]) || 0;
        value = Math.max(min, value + delta);
        chrome.storage.local.set({ [storageKey]: value });
      });
    }, 80); // 80ms debounce
  };
}

btnFontPlus.addEventListener('click', createStorageButtonHandler('sizeId', 1));
btnFontMinus.addEventListener('click', createStorageButtonHandler('sizeId', -1));
btnPosUp.addEventListener('click', createStorageButtonHandler('posId', 3));
btnPosDown.addEventListener('click', createStorageButtonHandler('posId', -3));
btnFontPlusEng.addEventListener('click', createStorageButtonHandler('sizeEng', 1));
btnFontMinusEng.addEventListener('click', createStorageButtonHandler('sizeEng', -1));
btnPosUpEng.addEventListener('click', createStorageButtonHandler('posEng', 3));
btnPosDownEng.addEventListener('click', createStorageButtonHandler('posEng', -3));
