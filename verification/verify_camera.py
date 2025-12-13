from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for the game to load and canvas to be present
        page.wait_for_selector("canvas")

        # Wait a bit for the game physics/camera to settle
        page.wait_for_timeout(2000)

        # Take a screenshot
        page.screenshot(path="verification/bulldozer_camera.png")

        # Now upgrade the plow
        # Assuming there is a UI button for upgrading plow.
        # I need to inspect the UI to find the button.
        # Based on `js/ui.js` (I haven't read it but I can assume standard UI)
        # Or I can execute JS to simulate the upgrade if UI is complex.
        # But UI verification is better.

        # Let's verify the bulldozer position first.

        browser.close()

if __name__ == "__main__":
    verify_changes()
