from playwright.sync_api import sync_playwright

def verify_camera_steady():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for game to load
        page.wait_for_selector("canvas")
        page.wait_for_timeout(2000)

        # We want to check if the camera follows strictly.
        # It's hard to verify "steadiness" via a static screenshot or simple script without recording video.
        # But we can verify that the camera position matches the expected formula.

        # Let's move the bulldozer and check camera position.
        # Access internals

        # Move bulldozer forward
        page.keyboard.press("ArrowUp")
        page.wait_for_timeout(500)
        page.keyboard.press("ArrowUp")
        page.wait_for_timeout(500)

        # Check positions
        data = page.evaluate("""() => {
            const bulldozer = window.bulldozer;
            const camera = window.camera;
            return {
                bx: bulldozer.position.x,
                by: bulldozer.position.y,
                cx: camera.position.x,
                cz: camera.position.z
            };
        }""")

        print(f"Bulldozer: ({data['bx']}, {data['by']})")
        print(f"Camera: ({data['cx']}, {data['cz']})")

        # Expected: cx = bx, cz = by + 100
        # Allow small floating point error
        epsilon = 0.001

        if abs(data['cx'] - data['bx']) < epsilon and abs(data['cz'] - (data['by'] + 100)) < epsilon:
            print("Verification PASSED: Camera is strictly following bulldozer.")
        else:
            print("Verification FAILED: Camera is not strictly following bulldozer.")
            print(f"Diff X: {data['cx'] - data['bx']}")
            print(f"Diff Z: {data['cz'] - (data['by'] + 100)}")

        page.screenshot(path="verification/camera_steady.png")
        browser.close()

if __name__ == "__main__":
    verify_camera_steady()
