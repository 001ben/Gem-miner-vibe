from playwright.sync_api import sync_playwright

def verify_viewer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:8080/viewer/index.html")
            page.wait_for_timeout(3000) # Wait for three.js and UI
            page.screenshot(path="verification/damp_viewer.png")
            print("Screenshot saved to verification/damp_viewer.png")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_viewer()
