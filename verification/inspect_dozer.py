from playwright.sync_api import sync_playwright
import time

def inspect_dozer():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for game to load
        page.wait_for_selector("canvas", timeout=10000)
        time.sleep(2)

        # Get initial dimensions
        # The bulldozer has parts: [chassis, plow]
        # part[1] is the plow

        def get_plow_dims():
            return page.evaluate("""() => {
                if (!window.bulldozer) return null;
                const parts = window.bulldozer.parts;
                // parts[0] is usually the compound body itself in Matter.js if parts are used?
                // Actually Matter.js Body.create({parts: [...]}) makes parts[0] = self? No.
                // Usually parts array includes self? Or just children?
                // In Matter.js, body.parts includes the body itself and all parts.
                // Let's filter by label.
                const plow = parts.find(p => p.label === 'plow');
                if (!plow) return null;

                const w = plow.bounds.max.x - plow.bounds.min.x;
                const h = plow.bounds.max.y - plow.bounds.min.y;
                return { w, h, level: window.state ? window.state.plowLevel : -1 };
            }""")

        dims1 = get_plow_dims()
        print(f"Initial Plow Dims: {dims1}")

        # Cheat money to upgrade
        page.evaluate("window.state.money = 10000; window.updateUI();")

        # Upgrade Plow
        page.evaluate("window.upgradePlow()")
        time.sleep(1)

        dims2 = get_plow_dims()
        print(f"Level 2 Plow Dims: {dims2}")

        # Upgrade Plow again
        page.evaluate("window.upgradePlow()")
        time.sleep(1)

        dims3 = get_plow_dims()
        print(f"Level 3 Plow Dims: {dims3}")

        if dims1 and dims2 and dims3:
             print(f"Width Increase: {dims2['w'] - dims1['w']}")
             print(f"Height Increase: {dims2['h'] - dims1['h']}")

        browser.close()

if __name__ == "__main__":
    inspect_dozer()
