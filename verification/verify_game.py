from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        try:
            # Navigate to the game
            page.goto("http://localhost:8000")

            # Wait for the game to load (canvas element)
            page.wait_for_selector("canvas", timeout=10000)

            # Wait a bit for physics/rendering to settle
            page.wait_for_timeout(2000)

            # Take a screenshot to verify camera and gems
            page.screenshot(path="verification/verification.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_changes()
