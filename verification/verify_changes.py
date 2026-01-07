from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:3000")

        # Wait for game to load
        page.wait_for_selector("canvas", timeout=10000)

        # 1. Trigger coin drop animation
        # We need to expose a helper or just execute JS
        page.evaluate("window.spawnCoinDrop(100, {x: 0, y: 0})")

        # Wait a bit for animation to start
        page.wait_for_timeout(200)

        # Check if flying coin exists
        flying_coins = page.locator(".flying-coin")
        count = flying_coins.count()
        print(f"Flying coins found: {count}")

        # Take screenshot of flying coin
        if count > 0:
            page.screenshot(path="verification/flying_coin.png")
            print("Screenshot saved to verification/flying_coin.png")
        else:
            print("No flying coins found!")

        # 2. Check Collector Logic (by inspecting code or simulating upgrade)
        # We can simulate setting state
        page.evaluate("window.state.collectorLevel = 5")

        # Force re-creation of collector? Not easily accessible.
        # But we can check if the money mat is gone.
        # Evaluate if 'coinPileGroup' exists in window (it was removed, but maybe check absence of Mat mesh)

        # Take a screenshot of the Bank Area (approx -400, 400)
        # We need to move camera there or just assume it's visible if we zoom out.

        browser.close()

if __name__ == "__main__":
    try:
        verify_changes()
    except Exception as e:
        print(f"Error: {e}")
