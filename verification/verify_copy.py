from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:8000")

        # Wait for game to load
        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000)

        # Open console
        console_btn = page.locator("#btn-console-toggle")
        console_btn.click()
        page.wait_for_timeout(500)

        # Verify Copy button exists
        copy_btn = page.locator("#btn-console-copy")
        assert copy_btn.is_visible()

        # Take screenshot
        page.screenshot(path="verification/verification_copy.png")

        browser.close()

if __name__ == "__main__":
    verify_changes()
