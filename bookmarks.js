const PROBLEM_KEY = "PROBLEM_KEY";
let allBookmarks = [];
let filteredBookmarks = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded, initializing...");
    await loadBookmarks();
    await cleanupBookmarks();
    setupEventListeners();
    setupBookmarkEventListeners(); // Add this for CSP-compliant event handling
});

function setupEventListeners() {
    console.log("Setting up event listeners...");

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        console.log("Search input listener added");
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
        console.log("Search button listener added");
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', handleClearAll);
        console.log("Clear all button listener added");
    }
}

// CSP-compliant event delegation for bookmark buttons
function setupBookmarkEventListeners() {
    console.log("Setting up bookmark event listeners...");
    const bookmarksContainer = document.getElementById('bookmarksContainer');

    if (bookmarksContainer) {
        bookmarksContainer.addEventListener('click', handleBookmarkClick);
        console.log("Bookmark container event listener added");
    }
}

function handleBookmarkClick(event) {
    console.log("Bookmark click event:", event.target);

    // Handle open button clicks
    if (event.target.classList.contains('open-btn')) {
        event.preventDefault();
        const url = event.target.dataset.url;
        if (url) {
            openProblemHandler(url);
        }
    }

    // Handle delete button clicks
    if (event.target.classList.contains('delete-btn')) {
        event.preventDefault();
        const bookmarkId = event.target.dataset.id;
        if (bookmarkId) {
            deleteBookmarkHandler(bookmarkId);
        }
    }
}

function isExtensionContextValid() {
    try {
        if (!chrome || !chrome.runtime) {
            return false;
        }
        const id = chrome.runtime.id;
        return !!id;
    } catch (error) {
        console.log("Extension context is invalid:", error.message);
        return false;
    }
}

async function loadBookmarks() {
    try {
        console.log("Loading bookmarks...");
        const bookmarks = await getCurrentBookmarks();
        console.log("Loaded bookmarks:", bookmarks);
        allBookmarks = bookmarks;
        filteredBookmarks = bookmarks;
        renderBookmarks();
        updateStats();
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        showError('Failed to load bookmarks: ' + error.message);
    }
}

function getCurrentBookmarks() {
    return new Promise((resolve) => {
        console.log("Getting current bookmarks...");

        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, using localStorage");
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                const bookmarks = localBookmarks ? JSON.parse(localBookmarks) : [];
                console.log("Local bookmarks:", bookmarks);
                resolve(bookmarks);
            } catch (error) {
                console.error("Error reading from localStorage:", error);
                resolve([]);
            }
            return;
        }

        try {
            chrome.storage.sync.get([PROBLEM_KEY], (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome storage error:", chrome.runtime.lastError);
                    try {
                        const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                        const bookmarks = localBookmarks ? JSON.parse(localBookmarks) : [];
                        resolve(bookmarks);
                    } catch (error) {
                        console.error("Error reading from localStorage:", error);
                        resolve([]);
                    }
                } else {
                    console.log("Chrome storage results:", results);
                    resolve(results[PROBLEM_KEY] || []);
                }
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                const bookmarks = localBookmarks ? JSON.parse(localBookmarks) : [];
                resolve(bookmarks);
            } catch (error) {
                console.error("Error reading from localStorage:", error);
                resolve([]);
            }
        }
    });
}

function saveBookmarks(bookmarks) {
    return new Promise((resolve, reject) => {
        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, saving to localStorage");
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage:", bookmarks);
                resolve();
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                reject(error);
            }
            return;
        }

        try {
            chrome.storage.sync.set({ [PROBLEM_KEY]: bookmarks }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome storage error:", chrome.runtime.lastError);
                    try {
                        localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                        console.log("Bookmarks saved to localStorage (fallback):", bookmarks);
                        resolve();
                    } catch (error) {
                        console.error("Error saving to localStorage:", error);
                        reject(error);
                    }
                } else {
                    console.log("Bookmarks saved to chrome.storage:", bookmarks);
                    resolve();
                }
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage (error fallback):", bookmarks);
                resolve();
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                reject(error);
            }
        }
    });
}

async function cleanupBookmarks() {
    console.log("Cleaning up bookmarks...");
    let hasChanges = false;

    const cleanedBookmarks = allBookmarks.map(bookmark => {
        if (typeof bookmark.name === 'object' || !bookmark.name || bookmark.name === '[object Object]' || bookmark.name.toString() === '[object Object]') {
            console.log(`Fixing corrupted name for bookmark: ${bookmark.id}`);
            bookmark.name = bookmark.id
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase())
                .replace(/\d+$/, match => ` ${match}`);
            hasChanges = true;
        }

        if (!bookmark.timestamp) {
            bookmark.timestamp = new Date().toISOString();
            hasChanges = true;
        }

        return bookmark;
    });

    if (hasChanges) {
        console.log("Saving cleaned bookmarks...");
        try {
            await saveBookmarks(cleanedBookmarks);
            allBookmarks = cleanedBookmarks;
            filteredBookmarks = cleanedBookmarks;
        } catch (error) {
            console.error("Error saving cleaned bookmarks:", error);
        }
    }
}

function renderBookmarks() {
    console.log("Rendering bookmarks:", filteredBookmarks);
    const container = document.getElementById('bookmarksContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const emptyState = document.getElementById('emptyState');

    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    if (filteredBookmarks.length === 0) {
        if (allBookmarks.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }
        } else {
            container.innerHTML = `
                <div class="no-results">
                    <h3>No results found</h3>
                    <p>Try adjusting your search terms.</p>
                </div>
            `;
        }
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Generate HTML without URLs displayed (CSP compliant)
    const bookmarksHTML = filteredBookmarks.map(bookmark => `
        <div class="bookmark-item">
            <div class="bookmark-info">
                <div class="bookmark-id">ID: ${bookmark.id}</div>
                <div class="bookmark-title">${bookmark.name}</div>
                <div class="bookmark-timestamp">Added: ${formatDate(bookmark.timestamp)}</div>
            </div>
            <div class="bookmark-actions">
                <button class="action-btn open-btn" data-url="${bookmark.url}">🔗 Open</button>
                <button class="action-btn delete-btn" data-id="${bookmark.id}">🗑️ Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = bookmarksHTML;

    // Re-setup event listeners after DOM update
    setupBookmarkEventListeners();
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date';
    }
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    console.log("Searching for:", searchTerm);

    if (!searchTerm) {
        filteredBookmarks = allBookmarks;
    } else {
        filteredBookmarks = allBookmarks.filter(bookmark => {
            const name = bookmark.name ? bookmark.name.toLowerCase() : '';
            const id = bookmark.id ? bookmark.id.toLowerCase() : '';
            const url = bookmark.url ? bookmark.url.toLowerCase() : '';

            return name.includes(searchTerm) ||
                id.includes(searchTerm) ||
                url.includes(searchTerm);
        });
    }

    console.log("Filtered bookmarks:", filteredBookmarks);
    renderBookmarks();
    updateStats();
}

function openProblemHandler(url) {
    console.log("Opening problem:", url);
    if (!url) {
        console.error("No URL provided");
        return;
    }

    try {
        if (chrome && chrome.tabs) {
            chrome.tabs.create({ url: url });
        } else {
            window.open(url, '_blank');
        }
    } catch (error) {
        console.error("Error opening URL:", error);
        window.open(url, '_blank');
    }
}

// Fixed: Made function async to properly use await
async function deleteBookmarkHandler(id) {
    console.log("Deleting bookmark:", id);

    if (!confirm('Are you sure you want to delete this bookmark?')) {
        return;
    }

    try {
        const bookmarkIndex = allBookmarks.findIndex(bookmark => bookmark.id === id);
        if (bookmarkIndex === -1) {
            console.error("Bookmark not found:", id);
            return;
        }

        allBookmarks.splice(bookmarkIndex, 1);
        filteredBookmarks = allBookmarks.filter(bookmark => {
            const searchInput = document.getElementById('searchInput');
            const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

            if (!searchTerm) return true;

            const name = bookmark.name ? bookmark.name.toLowerCase() : '';
            const bookmarkId = bookmark.id ? bookmark.id.toLowerCase() : '';
            const url = bookmark.url ? bookmark.url.toLowerCase() : '';

            return name.includes(searchTerm) ||
                bookmarkId.includes(searchTerm) ||
                url.includes(searchTerm);
        });

        await saveBookmarks(allBookmarks);
        renderBookmarks();
        updateStats();

        console.log("Bookmark deleted successfully");
    } catch (error) {
        console.error("Error deleting bookmark:", error);
        showError('Failed to delete bookmark: ' + error.message);
    }
}

// Fixed: Made function async to properly use await
async function handleClearAll() {
    console.log("Clearing all bookmarks...");

    if (!confirm('Are you sure you want to delete all bookmarks? This action cannot be undone.')) {
        return;
    }

    try {
        allBookmarks = [];
        filteredBookmarks = [];
        await saveBookmarks(allBookmarks);
        renderBookmarks();
        updateStats();

        console.log("All bookmarks cleared");
    } catch (error) {
        console.error("Error clearing bookmarks:", error);
        showError('Failed to clear bookmarks: ' + error.message);
    }
}

function updateStats() {
    const countElement = document.getElementById('bookmarkCount');
    if (countElement) {
        countElement.textContent = `${filteredBookmarks.length} of ${allBookmarks.length}`;
    }
}

function showError(message) {
    console.error(message);
    const container = document.getElementById('bookmarksContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}
