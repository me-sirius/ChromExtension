const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");
const PROBLEM_KEY = "PROBLEM_KEY";

window.addEventListener("load", addBookmarkButton);

function addBookmarkButton(){
    const addBookmark = document.getElementsByClassName("coding_problem_info_heading__G9ueL fw-bolder rubik fs-4 mb-0")[0];
    
    if (!addBookmark) {
        console.warn("Target element not found");
        return;
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

    bookmarkButton.addEventListener("click", addNewBookmarkHandler);
}

function extractProblemId(url) {
    const startIndex = url.indexOf("problems/") + "problems/".length;
    const endIndex = url.indexOf("?");
    
    if (startIndex === -1 || endIndex === -1) {
        return null;
    }
    
    return url.substring(startIndex, endIndex);
}

// Enhanced function to get problem name with multiple fallbacks
function getProblemName(uniqueID) {
    // Try multiple selectors for problem name
    const selectors = [
        "Header_resource_heading__cpRp1 rubik fw-bold mb-0 fs-4",
        "coding_problem_info_heading__G9ueL fw-bolder rubik fs-4 mb-0",
        "resource_heading", 
        "problem-title",
        "h1",
        "h2",
        "h3",
        "h4"
    ];

    for (const selector of selectors) {
        const elements = document.getElementsByClassName(selector);
        if (elements.length > 0 && elements[0].innerText?.trim()) {
            console.log(`Found problem name using selector: ${selector}`);
            return elements[0].innerText.trim();
        }
    }

    // Try by tag name as last resort
    const headings = document.querySelectorAll('h1, h2, h3, h4');
    for (const heading of headings) {
        const text = heading.innerText?.trim();
        if (text && text.length > 3 && text.length < 200) {
            console.log(`Found problem name using heading tag: ${heading.tagName}`);
            return text;
        }
    }

    // Try getting from page title
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== "MAANG.IN") {
        const cleanTitle = pageTitle.replace(/\s*\|\s*MAANG\.IN\s*$/i, '').trim();
        if (cleanTitle) {
            console.log(`Using page title as problem name: ${cleanTitle}`);
            return cleanTitle;
        }
    }

    // Final fallback
    const fallbackName = `Problem-${uniqueID}`;
    console.log(`Using fallback name: ${fallbackName}`);
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
    try {
        const currentBookmarks = await getCurrentBookmarks();

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
        await saveBookmarks(updatedBookmarks);
        
        showNotification(`"${ProblemName}" bookmarked successfully!`, "success");
        
    } catch (error) {
        console.error("Error adding bookmark:", error);
        showNotification("Failed to add bookmark: " + error.message, "error");
    }
}

function getCurrentBookmarks(){
    return new Promise((resolve) => {
        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, using localStorage");
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                resolve(localBookmarks ? JSON.parse(localBookmarks) : []);
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
                        resolve(localBookmarks ? JSON.parse(localBookmarks) : []);
                    } catch (error) {
                        console.error("Error reading from localStorage:", error);
                        resolve([]);
                    }
                } else {
                    resolve(results[PROBLEM_KEY] || []);
                }
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                const localBookmarks = localStorage.getItem(PROBLEM_KEY);
                resolve(localBookmarks ? JSON.parse(localBookmarks) : []);
            } catch (error) {
                console.error("Error reading from localStorage:", error);
                resolve([]);
            }
        }
    });
}

function saveBookmarks(bookmarks) {
    return new Promise((resolve) => {
        if (!isExtensionContextValid()) {
            console.log("Extension context invalid, saving to localStorage");
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage:", bookmarks);
                resolve();
            } catch (error) {
                console.error("Error saving to localStorage:", error);
                resolve();
            }
            return;
        }

        try {
            chrome.storage.sync.set({[PROBLEM_KEY]: bookmarks}, () => {
                if (chrome.runtime.lastError) {
                    console.error("Chrome storage error:", chrome.runtime.lastError);
                    try {
                        localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                        console.log("Bookmarks saved to localStorage (fallback):", bookmarks);
                    } catch (error) {
                        console.error("Error saving to localStorage:", error);
                    }
                } else {
                    console.log("Bookmarks saved to chrome.storage:", bookmarks);
                }
                resolve();
            });
        } catch (error) {
            console.error("Error accessing chrome.storage:", error);
            try {
                localStorage.setItem(PROBLEM_KEY, JSON.stringify(bookmarks));
                console.log("Bookmarks saved to localStorage (error fallback):", bookmarks);
            } catch (error) {
                console.error("Error saving to localStorage:", error);
            }
            resolve();
        }
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
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
        transition: "all 0.3s ease"
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = "0";
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}
