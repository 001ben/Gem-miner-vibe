from playwright.sync_api import sync_playwright
import time

def verify_rotation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        try:
            page.goto("http://localhost:8000")
            page.wait_for_selector("#game-container canvas")

            # Wait a bit for initialization
            time.sleep(1)

            # Get initial angle
            initial_angle = page.evaluate("""() => {
                const bodies = Matter.Composite.allBodies(window.world);
                const dozer = bodies.find(b => b.label === 'bulldozer');
                return dozer ? dozer.angle : null;
            }""")
            print(f"Initial Angle: {initial_angle}")

            if initial_angle is None:
                print("Bulldozer not found")
                return

            # Press Right Key
            print("Pressing ArrowRight...")
            page.keyboard.down("ArrowRight")
            time.sleep(1) # Hold for 1 second
            page.keyboard.up("ArrowRight")

            # Get new angle
            new_angle = page.evaluate("""() => {
                const bodies = Matter.Composite.allBodies(window.world);
                const dozer = bodies.find(b => b.label === 'bulldozer');
                return dozer ? dozer.angle : null;
            }""")
            print(f"New Angle: {new_angle}")

            if initial_angle == new_angle:
                print("FAIL: Angle did not change")
            else:
                print(f"SUCCESS: Angle changed by {new_angle - initial_angle}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_rotation()
