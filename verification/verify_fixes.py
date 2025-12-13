from playwright.sync_api import sync_playwright

def verify_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")
        page.wait_for_timeout(2000)

        # 1. Verify Speed UI and Camera Zoom
        # Level 1
        speed_text_l1 = page.inner_text("#stats-speed")
        cam_y_l1 = page.evaluate("window.camera.position.y")
        print(f"L1 Speed: {speed_text_l1}, CamY: {cam_y_l1}")
        # Expected: 100%, 1500

        # Upgrade to Level 2
        page.evaluate("window.state.money = 10000; window.updateUI();")
        page.click("#btn-shop-toggle")
        page.wait_for_timeout(500)
        page.click("#btn-upgrade-dozer") # L1 -> L2
        page.wait_for_timeout(500)

        speed_text_l2 = page.inner_text("#stats-speed")
        cam_y_l2 = page.evaluate("window.camera.position.y")
        print(f"L2 Speed: {speed_text_l2}, CamY: {cam_y_l2}")
        # Expected: 133%, 1700 (1500 + 200)

        # Upgrade to Level 3
        page.click("#btn-upgrade-dozer") # L2 -> L3
        page.wait_for_timeout(500)
        speed_text_l3 = page.inner_text("#stats-speed")
        cam_y_l3 = page.evaluate("window.camera.position.y")
        print(f"L3 Speed: {speed_text_l3}, CamY: {cam_y_l3}")
        # Expected: 178%, 1900 (1500 + 400)

        browser.close()

if __name__ == "__main__":
    verify_fixes()
