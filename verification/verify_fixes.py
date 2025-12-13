from playwright.sync_api import sync_playwright

def verify_fixes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")
        page.wait_for_timeout(2000)

        # 1. Verify Speed and Power UI
        # Level 1
        speed_text_l1 = page.inner_text("#stats-speed")
        power_text_l1 = page.inner_text("#stats-power")
        cam_y_l1 = page.evaluate("window.camera.position.y")
        cam_z_l1 = page.evaluate("window.camera.position.z")
        # Dozer Y position is approx 0.
        # Cam Z should be ~500.

        print(f"L1 Speed: {speed_text_l1}, Power: {power_text_l1}, CamY: {cam_y_l1}, CamZ: {cam_z_l1}")
        # Expected: Speed 100%, Power 100%, CamY 1500, CamZ ~500

        # Upgrade to Level 2
        page.evaluate("window.state.money = 10000; window.updateUI();")
        page.click("#btn-shop-toggle")
        page.wait_for_timeout(500)
        page.click("#btn-upgrade-dozer") # L1 -> L2
        page.wait_for_timeout(500)

        speed_text_l2 = page.inner_text("#stats-speed")
        power_text_l2 = page.inner_text("#stats-power")
        cam_y_l2 = page.evaluate("window.camera.position.y")
        print(f"L2 Speed: {speed_text_l2}, Power: {power_text_l2}, CamY: {cam_y_l2}")
        # Expected: Speed 133%, Power 200%, CamY 1700

        browser.close()

if __name__ == "__main__":
    verify_fixes()
