import http.server
import socketserver
import threading
import os
import sys
from playwright.sync_api import sync_playwright

# Simple HTTP server to serve the project root
PORT = 8081
DIRECTORY = os.getcwd()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

# Start server in background thread
server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()

# Wait briefly for server to start
import time
time.sleep(2)

def verify_bulldozer(page):
    page.goto(f"http://localhost:{PORT}/index.html")

    # Wait for canvas to be present
    page.wait_for_selector("#game-container canvas")

    # Wait for game to initialize (approximate)
    time.sleep(3)

    # Execute javascript to use debugRenderModel to isolate chassis
    # This renders the chassis in the center of the screen
    page.evaluate("window.debugRenderModel('chassis')")

    time.sleep(1)

    # Take screenshot
    page.screenshot(path="verification/bulldozer_chassis.png")
    print("Screenshot saved to verification/bulldozer_chassis.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_bulldozer(page)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
        finally:
            browser.close()
