from playwright.sync_api import sync_playwright

def verify_game():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the file directly from the filesystem
        import os
        filepath = os.path.abspath("index.html")
        page.goto(f"file://{filepath}")

        # Wait for the game container to be visible
        page.wait_for_selector("#game-container")

        # Wait for canvas to be created by Matter.js
        page.wait_for_selector("canvas")

        # Check UI elements
        money_element = page.locator("#money")
        assert money_element.is_visible()

        # Take a screenshot
        page.screenshot(path="verification/game_screenshot.png")

        browser.close()

if __name__ == "__main__":
    verify_game()
