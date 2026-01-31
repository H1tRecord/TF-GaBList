const DEFAULT_CONFIG = {
    blacklistedSubreddits: [],
    greenlistedSubreddits: [],
    blacklistEnabled: true,
    greenlistEnabled: true
};

let CONFIG = { ...DEFAULT_CONFIG };

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    initializeTabs();
    initializeEventListeners();
    updateUI();
});

async function loadSettings() {
    try {
        const result = await chrome.storage.local.get(['taskflux_config']);
        if (result.taskflux_config) {
            CONFIG = { ...DEFAULT_CONFIG, ...result.taskflux_config };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({ taskflux_config: CONFIG });
        showStatus('Settings saved successfully!', 'success');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('taskflux.net')) {
            chrome.tabs.sendMessage(tab.id, { action: 'configUpdated', config: CONFIG });
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatus('Failed to save settings', 'error');
    }
}

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.dataset.tab + '-tab';
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function initializeEventListeners() {
    document.getElementById('toggleGreenlist').addEventListener('click', () => toggleList('greenlist'));
    document.getElementById('toggleBlacklist').addEventListener('click', () => toggleList('blacklist'));
    
    document.getElementById('removeDupsGreen').addEventListener('click', () => removeDuplicates('greenlist'));
    document.getElementById('removeDupsBlack').addEventListener('click', () => removeDuplicates('blacklist'));
    
    document.getElementById('clearGreenlist').addEventListener('click', () => clearList('greenlist'));
    document.getElementById('clearBlacklist').addEventListener('click', () => clearList('blacklist'));
    
    document.getElementById('saveBtn').addEventListener('click', saveChanges);
    
    document.getElementById('greenlistInput').addEventListener('input', updateCounts);
    document.getElementById('blacklistInput').addEventListener('input', updateCounts);
}

function updateUI() {
    document.getElementById('greenlistInput').value = CONFIG.greenlistedSubreddits.join(', ');
    document.getElementById('blacklistInput').value = CONFIG.blacklistedSubreddits.join(', ');
    
    updateToggleButton('greenlist', CONFIG.greenlistEnabled);
    updateToggleButton('blacklist', CONFIG.blacklistEnabled);
    
    updateCounts();
}

function updateToggleButton(listType, isEnabled) {
    const btn = document.getElementById(listType === 'greenlist' ? 'toggleGreenlist' : 'toggleBlacklist');
    const textarea = document.getElementById(listType === 'greenlist' ? 'greenlistInput' : 'blacklistInput');
    
    if (isEnabled) {
        btn.textContent = 'Enabled';
        btn.classList.remove('disabled');
        btn.classList.add('enabled');
        textarea.disabled = false;
    } else {
        btn.textContent = 'Disabled';
        btn.classList.remove('enabled');
        btn.classList.add('disabled');
        textarea.disabled = true;
    }
}

function updateCounts() {
    const greenlistInput = document.getElementById('greenlistInput').value;
    const blacklistInput = document.getElementById('blacklistInput').value;
    
    const greenCount = normalizeSubreddits(greenlistInput).length;
    const blackCount = normalizeSubreddits(blacklistInput).length;
    
    document.getElementById('greenlistCount').textContent = greenCount;
    document.getElementById('blacklistCount').textContent = blackCount;
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 3000);
}

function toggleList(listType) {
    if (listType === 'greenlist') {
        CONFIG.greenlistEnabled = !CONFIG.greenlistEnabled;
        updateToggleButton('greenlist', CONFIG.greenlistEnabled);
    } else {
        CONFIG.blacklistEnabled = !CONFIG.blacklistEnabled;
        updateToggleButton('blacklist', CONFIG.blacklistEnabled);
    }
}

function removeDuplicates(listType) {
    const input = document.getElementById(listType === 'greenlist' ? 'greenlistInput' : 'blacklistInput');
    const subreddits = normalizeSubreddits(input.value);
    const uniqueSubreddits = [...new Set(subreddits)];
    const removed = subreddits.length - uniqueSubreddits.length;
    
    input.value = uniqueSubreddits.join(', ');
    updateCounts();
    
    if (removed > 0) {
        showStatus(`Removed ${removed} duplicate(s)`, 'success');
    } else {
        showStatus('No duplicates found', 'info');
    }
}

function clearList(listType) {
    if (confirm(`Are you sure you want to clear the ${listType}?`)) {
        document.getElementById(listType === 'greenlist' ? 'greenlistInput' : 'blacklistInput').value = '';
        updateCounts();
        showStatus(`${listType.charAt(0).toUpperCase() + listType.slice(1)} cleared`, 'success');
    }
}

function saveChanges() {
    const greenlist = normalizeSubreddits(document.getElementById('greenlistInput').value);
    const blacklist = normalizeSubreddits(document.getElementById('blacklistInput').value);
    
    const greenlistLower = greenlist.map(s => s.toLowerCase());
    const blacklistLower = blacklist.map(s => s.toLowerCase());
    
    const duplicates = greenlistLower.filter(s => blacklistLower.includes(s));
    
    if (duplicates.length > 0) {
        showStatus(`Error: ${duplicates.join(', ')} exists in both lists!`, 'error');
        return;
    }
    
    CONFIG.greenlistedSubreddits = greenlist;
    CONFIG.blacklistedSubreddits = blacklist;
    
    saveSettings();
}

function normalizeSubreddits(input) {
    if (!input || input.trim() === '') return [];
    
    return [...new Set(
        input.split(',')
            .map(item => item.trim())
            .map(item => item.replace(/^\/+/, '').replace(/\/+$/, ''))
            .filter(Boolean)
    )];
}
