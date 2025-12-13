from playwright.sync_api import sync_playwright

def verify_game_load():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Browser error: {err}"))
        try:
            page.goto("http://localhost:8000")

            # Wait for game to initialize (canvas present)
            page.wait_for_selector("#game-container canvas")

            # Check UI elements
            money = page.wait_for_selector("#money")
            print(f"Money found: {money.inner_text()}")

            # Toggle shop
            page.click("#btn-shop-toggle")

            shop = page.query_selector("#shop-modal")
            classes = shop.get_attribute("class")
            print(f"Shop classes: {classes}")

            if "hidden" in classes:
                print("Shop did not open")
            else:
                print("Shop opened")

            # Take screenshot
            page.screenshot(path="verification/game_preview.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_game_load()
