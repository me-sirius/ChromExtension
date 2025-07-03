const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");
const PROBLEM_KEY = "PROBLEM_KEY";

window.addEventListener("load", addBookmarkButton);

function addBookmarkButton(){
    console.log("Adding bookmark button...");
    
    const addBookmark = document.getElementsByClassName("coding_problem_info_heading__G9ueL fw-bolder rubik fs-4 mb-0")[0];
    
    if (!addBookmark) {
        console.warn("Target element not found");
        return;
    }

    // Remove existing bookmark button if any
    const existingButton = document.getElementById("add-bookmark-button");
    if (existingButton) {
        existingButton.remove();
    }

    // Create a wrapper div for h4 and bookmark
    const wrapper = document.createElement('div');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';
    wrapper.style.maxWidth = '100%';

    // Create bookmark button
    const bookmarkButton = document.createElement('img');
    bookmarkButton.id = "add-bookmark-button";
    bookmarkButton.src = bookmarkImgURL;
    
    Object.assign(bookmarkButton.style, {
        height: "32px",
        width: "30px",
        cursor: "pointer",
        flexShrink: "0"
    });

    // Insert wrapper before h4
    addBookmark.parentNode.insertBefore(wrapper, addBookmark);
    
    // Move h4 into wrapper and add bookmark
    wrapper.appendChild(addBookmark);
    wrapper.appendChild(bookmarkButton);
    
    console.log("Bookmark button added with wrapper");

    // Add click event listener with better error handling
    bookmarkButton.addEventListener("click", function(event) {
        console.log("Bookmark button clicked!");
        event.preventDefault();
        event.stopPropagation();
        addNewBookmarkHandler();
    });
}

function extractProblemId(url) {
    console.log("Extracting problem ID from:", url);
    const startIndex = url.indexOf("problems/") + "problems/".length;
    const endIndex = url.indexOf("?");
    
    if (startIndex === -1 || endIndex === -1) {
        console.error("Could not extract problem ID from URL");
        return null;
    }
    
    const id = url.substring(startIndex, endIndex);
    console.log("Extracted problem ID:", id);
    return id;
}

// Enhanced function to get problem name with multiple fallbacks
function getProblemName(uniqueID) {
    console.log("Getting problem name...");
    
    // Try multiple selectors for problem name
    const selectors = [
        "coding_problem_info_heading__G9ueL fw-bolder rubik fs-4 mb-0",
        "Header_resource_heading__cpRp1 rubik fw-bold mb-0 fs-4",
        "resource_heading", 
        "problem-title"
    ];

    for (const selector of selectors) {
        const elements = document.getElementsByClassName(selector);
        if (elements.length > 0 && elements[0].innerText?.trim()) {
            const name = elements[0].innerText.trim();
            console.log(`Found problem name using selector ${selector}:`, name);
            return name;
        }
    }

    // Try by tag name as last resort
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const heading of headings) {
        const text = heading.innerText?.trim();
        if (text && text.length > 3 && text.length < 200) {
            console.log(`Found problem name using heading tag ${heading.tagName}:`, text);
            return text;
        }
    }

    // Try getting from page title
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== "MAANG.IN") {
        const cleanTitle = pageTitle.replace(/\s*\|\s*MAANG\.IN\s*$/i, '').trim();
        if (cleanTitle) {
            console.log(`Using page title as problem name:`, cleanTitle);
            return cleanTitle;
        }
    }

    // Final fallback
    const fallbackName = `Problem-${uniqueID}`;
    console.log(`Using fallback name:`, fallbackName);
    return fallbackName;
}

// More robust extension context validation
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

async function addNewBookmarkHandler(){
    console.log("=== Starting bookmark process ===");
    
    try {
        // Show immediate feedback
        showNotification("Adding bookmark...", "info");
        
        const currentBookmarks = await getCurrentBookmarks();
        console.log("Current bookmarks:", currentBookmarks);

        const ProblemURL = window.location.href;
        const uniqueID = extractProblemId(ProblemURL);

        if (!uniqueID) {
            showNotification("Could not extract problem ID from URL", "error");
            return;
        }

        // Use enhanced problem name extraction
        const ProblemName = getProblemName(uniqueID);
        
        console.log("Problem details:", {
            id: uniqueID,
            name: ProblemName,
            url: ProblemURL
        });

        // Check if already bookmarked
        if(currentBookmarks.some((bookmark) => bookmark.id === uniqueID)) {
            showNotification("Problem already bookmarked!", "info");
            return;
        }

        const bookmarkObj = {
            id: uniqueID,
            name: ProblemName,
            url: ProblemURL,
            timestamp: new Date().toISOString()
        }

        const updatedBookmarks = [...currentBookmarks, bookmarkObj];
        console.log("Updated bookmarks:", updatedBookmarks);
        
        await saveBookmarks(updatedBookmarks);
        
        showNotification(`"${ProblemName}" bookmarked successfully!`, "success");
        console.log("=== Bookmark process completed ===");
        
    } catch (error) {
        console.error("Error adding bookmark:", error);
        showNotification("Failed to add bookmark: " + error.message, "error");
    }
}

function getCurrentBookmarks(){
    console.log("Getting current bookmarks...");
    
    return new Promise((resolve) => {
        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, using localStorage");
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                const bookmarks = localBookmarks ? JSON.parse(localBookmarks) : [];
                console.log("Local bookmarks retrieved:", bookmarks);
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
                        console.log("Fallback to local bookmarks:", bookmarks);
                        resolve(bookmarks);
                    } catch (error) {
                        console.error("Error reading from localStorage:", error);
                        resolve([]);
                    }
                } else {
                    const bookmarks = results[PROBLEM_KEY] || [];
                    console.log("Chrome storage bookmarks retrieved:", bookmarks);
                    resolve(bookmarks);
                }
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                const bookmarks = localBookmarks ? JSON.parse(localBookmarks) : [];
                console.log("Error fallback to local bookmarks:", bookmarks);
                resolve(bookmarks);
            } catch (error) {
                console.error("Error reading from localStorage:", error);
                resolve([]);
            }
        }
    });
}

function saveBookmarks(bookmarks) {
    console.log("Saving bookmarks:", bookmarks);
    
    return new Promise((resolve, reject) => {
        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, saving to localStorage");
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage successfully");
                resolve();
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                reject(error);
            }
            return;
        }

        try {
            chrome.storage.sync.set({[PROBLEM_KEY]: bookmarks}, () => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome storage error:", chrome.runtime.lastError);
                    try {
                        localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                        console.log("Bookmarks saved to localStorage (fallback)");
                        resolve();
                    } catch (error) {
                        console.error("Error saving to localStorage:", error);
                        reject(error);
                    }
                } else {
                    console.log("Bookmarks saved to chrome.storage successfully");
                    resolve();
                }
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage (error fallback)");
                resolve();
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                reject(error);
            }
        }
    });
}

// Enhanced message listener for bookmark changes
chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, videoId, user, action, bookmarkId } = obj;
    
    if (type === "NEW") {
        currentVideoBookmarks = videoId;
        newVideoLoaded();
    } else if (type === "PLAY") {
        youtubePlayer.currentTime = user;
    } else if (type === "DELETE") {
        // Remove from local state
        currentVideoBookmarks = currentVideoBookmarks.filter(bookmark => 
            bookmark.time != user
        );
        
        // Update UI
        viewBookmarks(currentVideoBookmarks);
        
        // Force refresh of bookmark button state
        setTimeout(() => {
            updateBookmarkButtonState();
        }, 100);
    } else if (type === "BOOKMARK_CHANGE") {
        // Handle bookmark changes from popup
        if (action === "DELETE" && bookmarkId) {
            // Remove from local state
            currentVideoBookmarks = currentVideoBookmarks.filter(bookmark => 
                bookmark.id !== bookmarkId
            );
        } else if (action === "CLEAR_ALL") {
            // Clear all local bookmarks
            currentVideoBookmarks = [];
        }
        
        // Update UI and button state
        viewBookmarks(currentVideoBookmarks);
        updateBookmarkButtonState();
    }
});

// New function: Update bookmark button state
function updateBookmarkButtonState() {
    const bookmarkBtn = document.getElementsByClassName("bookmark-btn")[0];
    if (bookmarkBtn) {
        const currentProblemId = getProblemIdFromUrl();
        const isBookmarked = currentVideoBookmarks.some(bookmark => 
            bookmark.id === currentProblemId
        );
        
        if (isBookmarked) {
            bookmarkBtn.textContent = "🔖 Bookmarked";
            bookmarkBtn.style.backgroundColor = "#4CAF50";
        } else {
            bookmarkBtn.textContent = "🔖 Bookmark";
            bookmarkBtn.style.backgroundColor = "#2196F3";
        }
    }
}


function showNotification(message, type) {
    console.log(`Notification: ${message} (${type})`);
    
    // Remove any existing notifications
    const existingNotification = document.querySelector('.bookmark-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'bookmark-notification';
    notification.textContent = message;
    
    const colors = {
        success: "#4CAF50",
        error: "#f44336",
        info: "#2196F3"
    };
    
    Object.assign(notification.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        background: colors[type] || "#333",
        color: "white",
        padding: "12px 20px",
        borderRadius: "4px",
        zIndex: "10000",
        fontSize: "14px",
        fontWeight: "500",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        opacity: "0",
        transition: "opacity 0.3s ease"
    });

    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = "1";
    }, 10);

    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Test function to verify storage
function testStorage() {
    console.log("Testing storage...");
    
    const testData = [{
        id: "test-problem",
        name: "Test Problem",
        url: "https://test.com",
        timestamp: new Date().toISOString()
    }];
    
    saveBookmarks(testData).then(() => {
        console.log("Test save successful");
        getCurrentBookmarks().then(bookmarks => {
            console.log("Test retrieve result:", bookmarks);
        });
    }).catch(error => {
        console.error("Test save failed:", error);
    });
}

// Add test button to debug
setTimeout(() => {
    if (window.location.href.includes("maang.in/problems")) {
        console.log("Content script loaded on problems page");
        // Uncomment the line below to test storage
        // testStorage();
    }
}, 2000);
