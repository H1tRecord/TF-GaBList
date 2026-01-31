(function() {
    'use strict';

    let CONFIG = {
        blacklistedSubreddits: [],
        greenlistedSubreddits: [],
        blacklistEnabled: true,
        greenlistEnabled: true
    };

    async function init() {
        await loadConfig();
        styleClaimButtons();
        observePageChanges();
    }

    async function loadConfig() {
        try {
            const result = await chrome.storage.local.get(['taskflux_config']);
            if (result.taskflux_config) {
                CONFIG = { ...CONFIG, ...result.taskflux_config };
            }
        } catch (error) {
            console.error('TaskFlux: Error loading config', error);
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'configUpdated') {
            CONFIG = { ...CONFIG, ...request.config };
            styleClaimButtons();
            sendResponse({ success: true });
        }
        return true;
    });

    function isUrlBlacklisted(url) {
        if (!CONFIG.blacklistEnabled || !CONFIG.blacklistedSubreddits || CONFIG.blacklistedSubreddits.length === 0) {
            return false;
        }

        try {
            const path = new URL(url).pathname.replace(/^\/+/, '').toLowerCase();
            return CONFIG.blacklistedSubreddits.some(subredditPath => {
                let normalized = subredditPath.toLowerCase().replace(/\/+$/, '') + '/';
                return path.startsWith(normalized);
            });
        } catch (error) {
            return false;
        }
    }

    function isUrlGreenlisted(url) {
        if (!CONFIG.greenlistEnabled || !CONFIG.greenlistedSubreddits || CONFIG.greenlistedSubreddits.length === 0) {
            return false;
        }

        try {
            const path = new URL(url).pathname.replace(/^\/+/, '').toLowerCase();
            return CONFIG.greenlistedSubreddits.some(subredditPath => {
                let normalized = subredditPath.toLowerCase().replace(/\/+$/, '') + '/';
                return path.startsWith(normalized);
            });
        } catch (error) {
            return false;
        }
    }

    function styleClaimButtons() {
        const taskCards = document.querySelectorAll('.bg-white');

        taskCards.forEach(card => {
            const urlElement = card.querySelector('a[href*="reddit.com"]');
            const claimButton = Array.from(card.querySelectorAll('button'))
                .find(btn => btn.textContent.trim() === 'Claim this task' || 
                             btn.dataset.taskfluxOriginal === 'true');

            if (!urlElement || !claimButton) return;

            const url = urlElement.href;
            const isBlacklisted = isUrlBlacklisted(url);
            const isGreenlisted = isUrlGreenlisted(url);

            claimButton.style.cssText = '';
            claimButton.style.pointerEvents = '';
            claimButton.innerText = 'Claim this task';
            claimButton.removeAttribute('disabled');
            claimButton.title = '';
            claimButton.dataset.taskfluxOriginal = 'true';
            card.style.cssText = '';

            if (isBlacklisted && CONFIG.blacklistEnabled) {
                claimButton.style.backgroundColor = '#dc3545';
                claimButton.style.opacity = '0.6';
                claimButton.style.cursor = 'not-allowed';
                claimButton.style.pointerEvents = 'none';
                claimButton.setAttribute('disabled', 'true');
                claimButton.innerText = '🚫 CLAIM DISABLED - BLACKLISTED SUBREDDIT 🚫';
                
                card.style.borderLeft = '4px solid #dc3545';
                card.style.backgroundColor = '#fff5f5';
            } else if (isGreenlisted && CONFIG.greenlistEnabled) {
                claimButton.style.backgroundColor = '#28a745';
                claimButton.innerText = '✅ PREFERRED SUBREDDIT ✅';
                
                card.style.borderLeft = '4px solid #28a745';
                card.style.backgroundColor = '#f0fff4';
            }
        });
    }

    function observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            let shouldRestyle = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    shouldRestyle = true;
                }
            });

            if (shouldRestyle) {
                clearTimeout(window.taskfluxStyleTimeout);
                window.taskfluxStyleTimeout = setTimeout(styleClaimButtons, 300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
