# Agent Testing Workflow

This document defines the Standard Operating Procedure (SOP) for the AI Agent to verify frontend changes using the Background Server and MCP Browser Tools.

## 1. Start Environment
Execute the background server task to ensure the app is serving without blocking the shell.
```bash
task dev:bg
```
*Expected Output:* `Server started successfully (PID ...)`

## 2. Browser Automation (MCP)
Use the available MCP tools to interact with the running application.

### A. Load Page
```javascript
// Tool: new_page
{ "url": "http://127.0.0.1:3000" }
```

### B. Verify Runtime State (Console)
Check for JavaScript errors or warnings.
```javascript
// Tool: list_console_messages
{ "pageIdx": 0 }
```
*Pass Criteria:* No messages with level `error`.

### C. Verify Assets (Network)
Ensure all scripts and assets loaded correctly (no 404s).
```javascript
// Tool: list_network_requests
{ "pageIdx": 0 }
```
*Pass Criteria:* All requests return status `200` (or `304`). No `404` or `500`.

### D. Visual Inspection (Screenshot)
*Note: The `new_page` tool may face connectivity issues with local servers in certain environments. If connection is refused, fallback to Log Inspection.*

## 3. Fallback: Log Inspection
If the browser tool cannot connect, verify correctness by inspecting `server.log`.
```bash
cat server.log
```
*Pass Criteria:* Look for `200 OK` for all critical domain files (e.g., `src/domains/gem/view.js`). No `404` errors should appear for moved files.

## 4. Cleanup
Always stop the server to free up port 3000.
```bash
task dev:stop
```
