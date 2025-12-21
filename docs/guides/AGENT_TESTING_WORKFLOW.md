# Agent Testing Workflow

This document defines the Standard Operating Procedure (SOP) for the AI Agent to verify frontend changes using the Background Server and MCP Browser Tools. Execute this flow after any significant refactor.

## 1. Start Environment
Execute the background server task (uses `tmux` for persistence).
```bash
task dev:bg
```
*Expected Output:* `Server is up in tmux session 'gemserver'!`

## 2. Smoke Test (Connectivity)
Verify the server is reachable via CLI before attempting browser automation.
```bash
task test:smoke
```
*Pass Criteria:* `✅ Index reachable`, `✅ Core JS reachable`.

## 3. Visual Verification (MCP)
Use the available MCP tools to inspect the running application.

### A. Load Page
Attempt to connect to the local server.
```javascript
// Tool: new_page
{ "url": "http://127.0.0.1:3030/index.html" }
```
*Troubleshooting:* If `127.0.0.1` fails with `CONNECTION_REFUSED`, try `http://0.0.0.0:3030` or the external IP found in logs. If all fail, rely on Step 2 (Smoke Test) and Step 4 (Logs).

### B. Check Runtime Errors
```javascript
// Tool: list_console_messages
{ "pageIdx": 0 }
```
*Pass Criteria:* No messages with level `error`. specifically check for `undefined` mesh properties or 404s.

### C. Capture State
Take a screenshot to verify rendering correctness (no missing textures, UI layout).
**Important:** Save to a temporary path so you can read it back.
```javascript
// Tool: take_screenshot
{ 
  "fullPage": true,
  "filePath": "/Users/ben/.gemini/tmp/.../screenshot.png" 
}
```
*Pass Criteria:*
1.  **Bulldozer**: Visible, parts aligned.
2.  **Gems**: Visible, correct colors (not magenta).
3.  **UI**: HUD visible, FPS counter active.

## 4. Log Inspection (Fallback)
If visual tools fail, inspect the server logs for request status.
```bash
cat server.log
```
*Pass Criteria:* All critical assets (`.js`, `.glb`, `.png`) return `200 OK`.

## 5. Cleanup
**Crucial:** Always stop the server to free up resources.
```bash
task dev:stop
```
