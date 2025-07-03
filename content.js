const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");

window.addEventListener("load", addBookmarkButton);

function addBookmarkButton(){
    const addBookmark = document.getElementsByClassName("coding_problem_info_heading__G9ueL fw-bolder rubik fs-4 mb-0")[0];
    
    if (!addBookmark) {
        console.warn("Target element not found");
        return;
    }

    // Check if h4 has overflow restrictions
    const computedStyle = window.getComputedStyle(addBookmark);
    const hasOverflowHidden = computedStyle.overflow === 'hidden' || 
                             computedStyle.textOverflow === 'ellipsis' ||
                             computedStyle.whiteSpace === 'nowrap';

    const bookmarkButton = document.createElement('img');
    bookmarkButton.id = "add-bookmark-button";
    bookmarkButton.src = chrome.runtime.getURL("assets/bookmark.png");
    
    Object.assign(bookmarkButton.style, {
        height: "20px",
        width: "20px",
        cursor: "pointer",
        display: "inline-block"
    });

    if (hasOverflowHidden) {
        // If overflow is hidden, place outside h4 but keep it adjacent
        Object.assign(bookmarkButton.style, {
            marginLeft: "8px",
            verticalAlign: "top",
            marginTop: "2px" // Align with text baseline
        });
        addBookmark.insertAdjacentElement("afterend", bookmarkButton);
        console.log("Icon placed outside h4 due to overflow restrictions");
    } else {
        // If no overflow issues, place inside h4 for perfect adjacency
        Object.assign(bookmarkButton.style, {
            marginLeft: "8px",
            verticalAlign: "middle"
        });
        addBookmark.insertAdjacentElement("beforeend", bookmarkButton);
        console.log("Icon placed inside h4");
    }
}

window.addEventListener("load", addBookmarkButton);
