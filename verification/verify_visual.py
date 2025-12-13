from playwright.sync_api import sync_playwright

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        try:
            page.goto("http://localhost:8000")
            page.wait_for_selector("canvas", timeout=10000)
            page.wait_for_timeout(2000)

            # Upgrade plow twice to make it obvious
            page.evaluate("window.state.money = 10000; window.updateUI();")
            page.evaluate("window.upgradePlow()")
            page.evaluate("window.upgradePlow()")
            page.wait_for_timeout(1000)

            page.screenshot(path="verification/final_visual.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_visuals()
