from playwright.sync_api import sync_playwright
import matplotlib.pyplot as plt
import pandas as pd
import time
import os

def run_deep_scaling_analysis():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:3000/verification/scaling_harness.html")

        try:
            page.wait_for_selector("#status:has-text('Ready')", timeout=5000)
        except:
            print("Harness failed to load.")
            browser.close()
            return

        print("Collecting Data...")
        data = []

        # 1. Set A: Engine Lag (Engine=1, Plow=1, Collector=1..20)
        # Note: Physics should be flat as Collector doesn't affect Mass.
        print("Running Set A: Engine=1, Plow=1, Collector=1..20")
        for c in range(1, 21):
            s = page.evaluate(f"window.runTest(1, 1, {c})")
            d = page.evaluate("window.simulateRun(300)")
            data.append({
                "Set": "A: Engine Lag (Engine=1, Plow=1)",
                "Variable_Level": c,
                "Mass": s['mass'],
                "MaxSpeed": d['maxSpeed'],
                "Distance": d['distance'],
                "WingOffset": s['wingOffset']
            })

        # 2. Set B: Engine Focus (Engine=1..20, Plow=1, Collector=1)
        # Shows impact of Engine upgrades on a light chassis.
        print("Running Set B: Engine Focus (Engine=1..20, Plow=1)")
        for e in range(1, 21):
            s = page.evaluate(f"window.runTest({e}, 1, 1)")
            d = page.evaluate("window.simulateRun(300)")
            data.append({
                "Set": "B: Engine Focus (Plow=1)",
                "Variable_Level": e,
                "Mass": s['mass'],
                "MaxSpeed": d['maxSpeed'],
                "Distance": d['distance'],
                "WingOffset": s['wingOffset']
            })

        # 3. Set C: Balanced (Engine=L, Plow=L, Collector=L)
        print("Running Set C: Balanced Progression (All Equal)")
        for l in range(1, 21):
            s = page.evaluate(f"window.runTest({l}, {l}, {l})")
            d = page.evaluate("window.simulateRun(300)")
            data.append({
                "Set": "C: Balanced (All Levels Equal)",
                "Variable_Level": l,
                "Mass": s['mass'],
                "MaxSpeed": d['maxSpeed'],
                "Distance": d['distance'],
                "WingOffset": s['wingOffset']
            })

        browser.close()

    # Plotting
    df = pd.DataFrame(data)

    # Create subplots
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 12))

    # Plot Speed
    for label, grp in df.groupby('Set'):
        ax1.plot(grp.Variable_Level, grp.MaxSpeed, marker='o', label=label)

    ax1.set_title('Top Speed vs Level')
    ax1.set_xlabel('Upgrade Level')
    ax1.set_ylabel('Speed (px/frame)')
    ax1.grid(True)
    ax1.legend()

    # Plot Acceleration (Distance)
    for label, grp in df.groupby('Set'):
        ax2.plot(grp.Variable_Level, grp.Distance, marker='x', linestyle='--', label=label)

    ax2.set_title('Acceleration (Distance in 5s) vs Level')
    ax2.set_xlabel('Upgrade Level')
    ax2.set_ylabel('Distance (px)')
    ax2.grid(True)
    ax2.legend()

    plt.tight_layout()

    # Ensure directory exists
    os.makedirs('docs/guide', exist_ok=True)

    output_path = 'docs/guide/progression_curves.png'
    plt.savefig(output_path)
    print(f"Plot saved to {output_path}")

if __name__ == "__main__":
    run_deep_scaling_analysis()
