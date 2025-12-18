from playwright.sync_api import sync_playwright

def verify_input_focus():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game (assuming server running)
        page.goto("http://localhost:8080/index.html")

        page.wait_for_timeout(2000)

        # Try to click the input
        page.click("#debug-scale")

        # Check if joystick is active (it should NOT be)
        # We can check by seeing if #joystick-zone is visible.
        # But `console.js` logs joystick events? No.
        # We can check the style of joystick-zone.

        joystick_display = page.evaluate("""() => {
            return document.getElementById('joystick-zone').style.display;
        }""")

        print(f"Joystick Display: {joystick_display}")

        if joystick_display == 'block':
            print("FAILURE: Joystick activated on input click")
        else:
            print("SUCCESS: Joystick ignored input click")

        page.screenshot(path="verification/screenshot_input_test.png")

        browser.close()

if __name__ == "__main__":
    verify_input_focus()
