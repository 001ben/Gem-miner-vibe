document.addEventListener("DOMContentLoaded", function() {
    // 1. Calculate relative path to project root
    const path = window.location.pathname;
    let toRoot = "../"; // Default to one level up (assuming we are at /docs/)

    // Find where '/docs/' starts in the path
    const docsIndex = path.indexOf('/docs/');
    if (docsIndex !== -1) {
        // Get the part of the path after '/docs/'
        // e.g., "/my-repo/docs/planning/current/" -> "planning/current/"
        // e.g., "/my-repo/docs/index.html" -> "index.html"
        const subPath = path.substring(docsIndex + '/docs/'.length);

        // Count segments to go up
        // "planning/current/" -> ['planning', 'current'] -> 2 segments -> ../../
        // "index.html" -> ['index.html'] -> 1 segment -> ../
        // "" -> [] -> 0 segments -> ./
        const segments = subPath.split('/').filter(p => p && p !== '.');
        const depth = segments.length;

        // Base is /docs/, so we need depth + 1 to go to project root
        // e.g. /docs/ -> depth 0 -> ../
        // e.g. /docs/page -> depth 1 -> ../../
        toRoot = "../".repeat(depth + 1);
    }

    // 2. Create the navigation container
    const navDiv = document.createElement("div");
    // Position: Fixed Top Right (offset to avoid header overlap)
    navDiv.style.cssText = "position: fixed; top: 70px; right: 10px; z-index: 2000; background: rgba(0,0,0,0.6); padding: 5px 10px; border-radius: 20px; font-size: 0.9rem; border: 1px solid #555; display: flex; gap: 10px; align-items: center;";

    // Game Link
    const gameLink = document.createElement("a");
    gameLink.href = toRoot + "index.html"; // Explicitly point to index.html for robustness
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
