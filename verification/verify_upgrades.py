from playwright.sync_api import sync_playwright

def verify_upgrades():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Give game time to load
        page.wait_for_timeout(2000)

        # Test Case 1: Level 1 (Default)
        data_l1 = page.evaluate("""
            () => {
                const dozer = window.bulldozer;
                return {
                    level: window.state.dozerLevel,
                    collectorLevel: window.state.collectorLevel,
                    mass: dozer ? dozer.mass : 0,
                    density: dozer ? dozer.density : 0
                };
            }
        """)
        print(f"L1 Data: {data_l1}")

        # Set money to afford upgrades
        page.evaluate("window.state.money = 10000; window.updateUI();")

        # Open Shop
        # Use selector for shop button, which is #btn-shop-toggle
        page.click("#btn-shop-toggle")
        page.wait_for_timeout(500)

        # Buy Dozer Upgrade (Level 1 -> 2)
        page.click("#btn-upgrade-dozer")
        page.wait_for_timeout(500)

        # Verify Level 2 Physics
        data_l2 = page.evaluate("""
            () => {
                const dozer = window.bulldozer;
                return {
                    level: window.state.dozerLevel,
                    mass: dozer ? dozer.mass : 0,
                    density: dozer ? dozer.density : 0
                };
            }
        """)
        print(f"L2 Dozer Data: {data_l2}")

        # Buy Collector Upgrade (Level 1 -> 2)
        page.click("#btn-upgrade-collector")
        page.wait_for_timeout(500)

        # Buy Collector Upgrade again (Level 2 -> 3) to test doubling
        page.click("#btn-upgrade-collector")
        page.wait_for_timeout(500)

        # Verify Levels
        data_l3 = page.evaluate("""
            () => {
                return {
                    collectorLevel: window.state.collectorLevel
                };
            }
        """)
        print(f"L3 Collector Data: {data_l3}")

        # Take screenshot
        page.screenshot(path="verification/upgrades.png")

        browser.close()

if __name__ == "__main__":
    verify_upgrades()
