from playwright.sync_api import sync_playwright
import time

def run_scaling_analysis():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Subscribe to console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        # Assume server is running on localhost:3000
        page.goto("http://localhost:3000/verification/scaling_harness.html")

        # Wait for "Ready"
        try:
            page.wait_for_selector("#status:has-text('Ready')", timeout=5000)
        except Exception as e:
            # Check if status has error text
            try:
                status = page.inner_text("#status")
                print(f"Failed to load harness. Status: {status}")
            except:
                print("Failed to load harness and could not read status.")
            browser.close()
            return []

        print("| Level | Mass | Width | Height | Max Speed (px/f) | Accel (Dist 5s) |")
        print("|-------|------|-------|--------|------------------|-----------------|")

        results = []

        levels = list(range(1, 11)) + [20] # 1-10 and 20
        for level in levels:
            # Run Static Test
            static_stats = page.evaluate(f"window.runTest({level})")

            # Run Dynamic Test (5 seconds = 300 frames)
            dynamic_stats = page.evaluate("window.simulateRun(300)")

            row = f"| {level} | {static_stats['mass']:.2f} | {static_stats['width']:.2f} | {static_stats['height']:.2f} | {dynamic_stats['maxSpeed']:.4f} | {dynamic_stats['distance']:.2f} |"
            print(row)
            results.append(row)

        browser.close()
        return results

if __name__ == "__main__":
    run_scaling_analysis()
