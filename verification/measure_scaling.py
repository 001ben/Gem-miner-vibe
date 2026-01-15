import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import matplotlib.pyplot as plt
import os

async def measure_scaling():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # We need to serve the files. Since we are in the repo root,
        # we can just use the file:// protocol if the harness is set up right,
        # OR better: Assume the user has a server running or we can use a simple python http server.
        # Given the environment, let's try file:// first, but we need absolute paths.
        # Actually, module imports via file:// are blocked by CORS.
        # We should start a temporary server.

        print("Starting simulation...")
        # For simplicity in this environment, we assume we can access localhost:3000
        # (if the user has 'npm start' running) OR we assume we can run a python server.
        # Let's try to run a python server in background?
        # No, 'npm start' is the standard way. Let's assume it's running or we can just use 'python3 -m http.server 8081'.

        # Let's check if port 8081 is free and start a server there
        import subprocess
        import time

        # Start server
        server = subprocess.Popen(["python3", "-m", "http.server", "8081"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2) # Wait for startup

        try:
            # Debugging (Attach BEFORE navigation)
            page.on("console", lambda msg: print(f"Console: {msg.text}"))
            page.on("pageerror", lambda exc: print(f"Page Error: {exc}"))
            page.on("requestfailed", lambda req: print(f"Request Failed: {req.url} - {req.failure}"))
            page.on("request", lambda req: print(f"Request: {req.url}"))

            await page.goto("http://localhost:8081/verification/scaling_harness.html")

            # Wait for window.simulation to be defined
            await page.wait_for_function("() => window.simulation !== undefined")

            results = []

            # Scenarios
            # 1. Level 1 (Baseline)
            # 2. Level 5
            # 3. Level 10
            # 4. Level 20 (Max)

            levels = [1, 5, 10, 20]

            for lvl in levels:
                print(f"Testing Level {lvl}...")

                # Setup
                await page.evaluate(f"window.simulation.setup({lvl}, {lvl})")
                # Press W
                await page.evaluate("window.simulation.setKeys({'KeyW': true})")

                velocity_data = []

                for i in range(30):
                    data = await page.evaluate("window.simulation.step(10)")
                    velocity_data.append(data['speed'])

                results.append({
                    "Level": lvl,
                    "Data": velocity_data
                })

            # Turning Test (Reproduce Infinity Bug)
            print("Testing Turning Stability (Level 20)...")
            await page.evaluate("window.simulation.setup(20, 20)")

            # Drive Forward 2s
            print("Driving Forward...")
            await page.evaluate("window.simulation.setKeys({'KeyW': true})")
            await page.evaluate("window.simulation.step(120)")

            # Turn Right (Hold D + W)
            print("Turning Right (W+D)...")
            await page.evaluate("window.simulation.setKeys({'KeyW': true, 'KeyD': true})")

            turn_data = []
            for i in range(20): # 2 seconds
                data = await page.evaluate("window.simulation.step(6)") # 6*10 = 60ms? No 6 frames = 100ms
                turn_data.append(data['speed'])

            print(f"Turning Speeds: {turn_data}")
            max_turn_speed = max(turn_data)
            print(f"Max Turn Speed: {max_turn_speed}")

            if max_turn_speed > 100:
                print("BUG DETECTED: Speed Explosion!")
            else:
                print("Stability Verified.")

            # Generate Plot
            plt.figure(figsize=(10, 6))

            for res in results:
                plt.plot(range(0, 300, 10), res['Data'], label=f"Level {res['Level']}")

            plt.title("Bulldozer Acceleration Curves (0-5s)")
            plt.xlabel("Frames")
            plt.ylabel("Speed (px/frame)")
            plt.legend()
            plt.grid(True)
            plt.savefig("docs/guide/progression_curves_new.png")
            print("Graph saved to docs/guide/progression_curves_new.png")

        finally:
            server.kill()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(measure_scaling())
