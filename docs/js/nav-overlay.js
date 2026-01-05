document.addEventListener("DOMContentLoaded", function() {
    // 1. Calculate relative path to project root
    const path = window.location.pathname;
    let toRoot = "../"; // Default to one level up (assuming we are at /docs/)

    // Find where '/docs/' starts in the path
    const docsIndex = path.indexOf('/docs/');
    if (docsIndex !== -1) {
        // Get the part of the path after '/docs/'
        const subPath = path.substring(docsIndex + '/docs/'.length);
        const segments = subPath.split('/').filter(p => p && p !== '.');
        const depth = segments.length;
        toRoot = "../".repeat(depth + 1);
    }

    // 2. Create the navigation container
    const navDiv = document.createElement("div");
    navDiv.id = "docs-nav-overlay";
    // Position: Fixed Top Right
    navDiv.style.cssText = "position: fixed; top: 70px; right: 10px; z-index: 2000; background: rgba(0,0,0,0.6); padding: 5px 10px; border-radius: 20px; font-size: 0.9rem; border: 1px solid #555; display: flex; gap: 10px; align-items: center;";

    // Inject Media Query for Mobile Stacking
    const style = document.createElement('style');
    style.innerHTML = `
        @media (max-width: 600px) {
            #docs-nav-overlay {
                flex-direction: column;
                align-items: flex-end !important;
                gap: 5px !important;
            }
        }
    `;
    document.head.appendChild(style);

    // Game Link
    const gameLink = document.createElement("a");
    gameLink.href = toRoot + "index.html";
    gameLink.innerText = "Game";
    gameLink.style.cssText = "color: #fff; text-decoration: none; font-weight: bold;";

    // Asset Viewer Link
    const viewerLink = document.createElement("a");
    viewerLink.href = toRoot + "tools/viewer/index.html";
    viewerLink.innerText = "Asset Viewer";
    viewerLink.style.cssText = "color: #fff; text-decoration: none; font-weight: bold;";

    // Append links
    navDiv.appendChild(gameLink);
    navDiv.appendChild(viewerLink);

    // Append to body
    document.body.appendChild(navDiv);
});
