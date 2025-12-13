from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000")

        # Wait for game to load
        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000) # Give it time to render

        # 1. Verify Console Log button exists and console is hidden initially
        console_btn = page.locator("#btn-console-toggle")
        console_box = page.locator("#debug-console")

        assert console_btn.is_visible()
        # It has class 'minimized' so it might be technically "visible" in DOM but hidden via CSS display:none
        # Playwright's is_visible() checks visibility style.
        assert not console_box.is_visible()

        # 2. Click button to show logs
        console_btn.click()
        page.wait_for_timeout(500)
        assert console_box.is_visible()

        # 3. Take screenshot of the game with console open and new ground color
        page.screenshot(path="verification/verification.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
