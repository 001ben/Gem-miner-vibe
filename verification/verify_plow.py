from playwright.sync_api import sync_playwright
import time

def verify_plow(page):
    print("Navigating to game...")
    page.goto("http://localhost:3000")
    
    # Wait for canvas
    page.wait_for_selector("canvas", timeout=10000)
    print("Canvas found.")

    # Wait a bit for loading
    time.sleep(2)

    # Helper to print params
    def log_params(label):
        params = page.evaluate("""() => {
            return {
                plowLevel: window.state.plowLevel,
                teeth: window.state.plowTeethEnabled
            };
        }""")
        print(f"[{label}] State: {params}")

    # Level 1
    print("Setting Plow Level 1...")
    page.evaluate("window.state.plowLevel = 1;")
    time.sleep(0.5) # Wait for frame
    page.screenshot(path="verification/plow_lvl_1.png")
    log_params("Level 1")

    # Level 3 (Wings Start)
    print("Setting Plow Level 3...")
    page.evaluate("window.state.plowLevel = 3;")
    time.sleep(0.5)
    page.screenshot(path="verification/plow_lvl_3.png")
    log_params("Level 3")

    # Level 6 (Wider + Big Wings)
    print("Setting Plow Level 6...")
    page.evaluate("window.state.plowLevel = 6;")
    time.sleep(0.5)
    page.screenshot(path="verification/plow_lvl_6.png")
    log_params("Level 6")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_plow(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
