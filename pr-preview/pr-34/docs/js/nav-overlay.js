document.addEventListener("DOMContentLoaded", function() {
    // Create the navigation container
    const navDiv = document.createElement("div");
    // Positioned at top-right, but offset slightly down to avoid potential header conflicts (or stick to top if consistent)
    // Game: Top Right (inside top-bar)
    // Viewer: Top Right (right: 50px)
    // Docs: Top Right (right: 10px? or 150px to avoid search?)
    // Material search is usually right-aligned. Let's try to put it "below" the header or to the left of search?
    // Actually, fixed position `top: 70px; right: 10px` is safe from header.
    navDiv.style.cssText = "position: fixed; top: 70px; right: 10px; z-index: 2000; background: rgba(0,0,0,0.6); padding: 5px 10px; border-radius: 20px; font-size: 0.9rem; border: 1px solid #555; display: flex; gap: 10px; align-items: center;";

    // Game Link
    const gameLink = document.createElement("a");
    gameLink.href = "../../";
    gameLink.innerText = "Game";
    gameLink.style.cssText = "color: #fff; text-decoration: none; font-weight: bold;";

    // Asset Viewer Link
    const viewerLink = document.createElement("a");
    viewerLink.href = "../../tools/viewer/";
    viewerLink.innerText = "Asset Viewer";
    viewerLink.style.cssText = "color: #fff; text-decoration: none; font-weight: bold;";

    // Append links
    navDiv.appendChild(gameLink);
    navDiv.appendChild(viewerLink);

    // Append to body
    document.body.appendChild(navDiv);
});
