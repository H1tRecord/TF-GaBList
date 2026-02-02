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
        
        // Check if on /tasks page and inject auto-add button
        if (window.location.pathname === '/tasks' || window.location.pathname === '/tasks/') {
            injectAutoAddButton();
        }
        
        // Watch for URL changes (SPA navigation)
        observeUrlChanges();
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

    async function saveConfig() {
        try {
            await chrome.storage.local.set({ taskflux_config: CONFIG });
        } catch (error) {
            console.error('TaskFlux: Error saving config', error);
        }
    }

    function injectAutoAddButton() {
        // Wait for table to load
        const checkTable = setInterval(() => {
            const table = document.querySelector('table.w-full');
            if (table && !document.getElementById('taskflux-auto-add-btn')) {
                clearInterval(checkTable);
                createAutoAddButton(table);
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkTable), 10000);
    }

    function createAutoAddButton(table) {
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'taskflux-auto-add-container';
        buttonContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const autoAddBtn = document.createElement('button');
        autoAddBtn.id = 'taskflux-auto-add-btn';
        autoAddBtn.innerHTML = '🔄 Auto-Add Subreddits from Tasks';
        autoAddBtn.style.cssText = `
            padding: 12px 20px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
            transition: all 0.25s ease;
        `;
        autoAddBtn.addEventListener('mouseenter', () => {
            autoAddBtn.style.transform = 'translateY(-2px)';
            autoAddBtn.style.boxShadow = '0 6px 25px rgba(99, 102, 241, 0.5)';
        });
        autoAddBtn.addEventListener('mouseleave', () => {
            autoAddBtn.style.transform = 'translateY(0)';
            autoAddBtn.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
        });
        autoAddBtn.addEventListener('click', scanAndAddSubreddits);

        const statusDiv = document.createElement('div');
        statusDiv.id = 'taskflux-status';
        statusDiv.style.cssText = `
            padding: 10px 15px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 8px;
            font-size: 12px;
            display: none;
            max-width: 300px;
            text-align: center;
        `;

        buttonContainer.appendChild(autoAddBtn);
        buttonContainer.appendChild(statusDiv);
        document.body.appendChild(buttonContainer);
    }

    function extractSubredditFromUrl(url) {
        try {
            const match = url.match(/reddit\.com\/r\/([^\/]+)/i);
            if (match && match[1]) {
                return 'r/' + match[1];
            }
        } catch (error) {
            console.error('TaskFlux: Error extracting subreddit', error);
        }
        return null;
    }

    async function scanAndAddSubreddits() {
        const statusDiv = document.getElementById('taskflux-status');
        const btn = document.getElementById('taskflux-auto-add-btn');
        
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Scanning table...';
        btn.disabled = true;
        btn.style.opacity = '0.7';

        try {
            const table = document.querySelector('table.w-full');
            if (!table) {
                statusDiv.textContent = '❌ Table not found!';
                statusDiv.style.background = 'rgba(239, 68, 68, 0.9)';
                return;
            }

            const rows = table.querySelectorAll('tbody tr');
            let greenAdded = 0;
            let blackAdded = 0;
            let skipped = 0;
            const conflictsInBlacklist = []; // Published but user has in blacklist
            const conflictsInGreenlist = []; // Not published but user has in greenlist

            const newGreenlist = [...CONFIG.greenlistedSubreddits];
            const newBlacklist = [...CONFIG.blacklistedSubreddits];

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 5) return;

                // Get Submitted URL (4th column, index 3)
                const urlCell = cells[3];
                const urlLink = urlCell.querySelector('a[href*="reddit.com"]');
                if (!urlLink) return;

                const url = urlLink.href;
                const subreddit = extractSubredditFromUrl(url);
                if (!subreddit) return;

                // Get Status (5th column, index 4)
                const statusCell = cells[4];
                const statusText = statusCell.textContent.trim().toLowerCase();
                const isPublished = statusText.includes('published');

                const subredditLower = subreddit.toLowerCase();
                const existsInGreen = newGreenlist.some(s => s.toLowerCase() === subredditLower);
                const existsInBlack = newBlacklist.some(s => s.toLowerCase() === subredditLower);

                if (isPublished) {
                    // Check if user already has it in blacklist - conflict!
                    if (existsInBlack) {
                        if (!conflictsInBlacklist.includes(subreddit)) {
                            conflictsInBlacklist.push(subreddit);
                        }
                        return; // Skip, don't modify
                    }
                    // Add to greenlist if not already there
                    if (!existsInGreen) {
                        newGreenlist.push(subreddit);
                        greenAdded++;
                    } else {
                        skipped++;
                    }
                } else {
                    // Check if user already has it in greenlist - conflict!
                    if (existsInGreen) {
                        if (!conflictsInGreenlist.includes(subreddit)) {
                            conflictsInGreenlist.push(subreddit);
                        }
                        return; // Skip, don't modify
                    }
                    // Add to blacklist if not already there
                    if (!existsInBlack) {
                        newBlacklist.push(subreddit);
                        blackAdded++;
                    } else {
                        skipped++;
                    }
                }
            });

            // Remove duplicates
            CONFIG.greenlistedSubreddits = [...new Set(newGreenlist)];
            CONFIG.blacklistedSubreddits = [...new Set(newBlacklist)];

            await saveConfig();

            // Build status message
            let statusHtml = `✅ Scan complete!<br>
                🟢 Greenlist: +${greenAdded} added<br>
                🔴 Blacklist: +${blackAdded} added<br>
                ⏭️ Skipped: ${skipped} (already in list)`;

            // Show conflicts popup if any
            if (conflictsInBlacklist.length > 0 || conflictsInGreenlist.length > 0) {
                showConflictPopup(conflictsInBlacklist, conflictsInGreenlist);
                statusHtml += `<br>⚠️ ${conflictsInBlacklist.length + conflictsInGreenlist.length} conflict(s) found`;
            }

            statusDiv.style.background = 'rgba(34, 197, 94, 0.9)';
            statusDiv.innerHTML = statusHtml;

            // Re-apply styles on the main page
            styleClaimButtons();

        } catch (error) {
            console.error('TaskFlux: Error scanning table', error);
            statusDiv.style.background = 'rgba(239, 68, 68, 0.9)';
            statusDiv.textContent = '❌ Error scanning table!';
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
                statusDiv.style.background = 'rgba(0, 0, 0, 0.8)';
            }, 5000);
        }
    }

    function showConflictPopup(conflictsInBlacklist, conflictsInGreenlist) {
        // Remove existing popup if any
        const existingPopup = document.getElementById('taskflux-conflict-popup');
        if (existingPopup) existingPopup.remove();

        const popup = document.createElement('div');
        popup.id = 'taskflux-conflict-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a3e 0%, #2d1b4e 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            z-index: 10000;
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        let conflictHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px; color: #fbbf24;">⚠️ Conflicts Found</h3>
                <button id="taskflux-close-popup" style="
                    background: rgba(255,255,255,0.1);
                    border: none;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 16px;
                ">✕</button>
            </div>
            <p style="font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 16px;">
                The following subreddits were skipped because they exist in the opposite list. 
                Remove them manually if you want to auto-add them.
            </p>
        `;

        if (conflictsInBlacklist.length > 0) {
            conflictHtml += `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #f87171;">
                        🔴 Published but in your Blacklist (${conflictsInBlacklist.length}):
                    </h4>
                    <div style="background: rgba(239, 68, 68, 0.2); padding: 10px; border-radius: 8px; font-size: 12px; font-family: monospace;">
                        ${conflictsInBlacklist.join(', ')}
                    </div>
                </div>
            `;
        }

        if (conflictsInGreenlist.length > 0) {
            conflictHtml += `
                <div style="margin-bottom: 16px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #4ade80;">
                        🟢 Not Published but in your Greenlist (${conflictsInGreenlist.length}):
                    </h4>
                    <div style="background: rgba(34, 197, 94, 0.2); padding: 10px; border-radius: 8px; font-size: 12px; font-family: monospace;">
                        ${conflictsInGreenlist.join(', ')}
                    </div>
                </div>
            `;
        }

        conflictHtml += `
            <button id="taskflux-dismiss-popup" style="
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
            ">Got it</button>
        `;

        popup.innerHTML = conflictHtml;

        // Add overlay
        const overlay = document.createElement('div');
        overlay.id = 'taskflux-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        // Close handlers
        const closePopup = () => {
            popup.remove();
            overlay.remove();
        };

        document.getElementById('taskflux-close-popup').addEventListener('click', closePopup);
        document.getElementById('taskflux-dismiss-popup').addEventListener('click', closePopup);
        overlay.addEventListener('click', closePopup);
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

    function observeUrlChanges() {
        let lastPath = window.location.pathname;
        
        const checkUrl = () => {
            const currentPath = window.location.pathname;
            if (currentPath !== lastPath) {
                lastPath = currentPath;
                handleUrlChange(currentPath);
            }
        };

        // Check URL periodically for SPA navigation
        setInterval(checkUrl, 500);

        // Also listen to popstate for back/forward navigation
        window.addEventListener('popstate', () => {
            handleUrlChange(window.location.pathname);
        });
    }

    function handleUrlChange(path) {
        const container = document.getElementById('taskflux-auto-add-container');
        const isTasksPage = path === '/tasks' || path === '/tasks/';

        if (isTasksPage && !container) {
            injectAutoAddButton();
        } else if (!isTasksPage && container) {
            container.remove();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
