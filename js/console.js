
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

export function initConsole() {
    const consoleContainer = document.getElementById('debug-console');
    const consoleLogs = document.getElementById('console-logs');
    const toggleBtn = document.getElementById('btn-console-toggle');

    if (!consoleContainer || !consoleLogs) return;

    toggleBtn.addEventListener('click', () => {
        consoleContainer.classList.toggle('minimized');
        toggleBtn.innerText = consoleContainer.classList.contains('minimized') ? 'Show Logs' : 'Hide Logs';
    });

    // Create Copy Button
    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy';
    copyBtn.id = 'btn-console-copy';
    copyBtn.onclick = () => {
        const text = Array.from(consoleLogs.children).map(line => line.textContent).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied!';
            setTimeout(() => copyBtn.innerText = originalText, 1500);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };
    consoleContainer.appendChild(copyBtn);

    function addLog(type, args) {
        const msg = args.map(arg => {
            if (arg instanceof Error) {
                return `[Error: ${arg.message}] Stack: ${arg.stack}`;
            }
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
        }).join(' ');

        const line = document.createElement('div');
        line.className = `log-line log-${type}`;
        line.textContent = `[${type.toUpperCase()}] ${msg}`;
        consoleLogs.appendChild(line);
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }

    console.log = function(...args) {
        originalLog.apply(console, args);
        addLog('info', args);
    };

    console.warn = function(...args) {
        originalWarn.apply(console, args);
        addLog('warn', args);
    };

    console.error = function(...args) {
        originalError.apply(console, args);
        addLog('error', args);
    };

    window.onerror = function(message, source, lineno, colno, error) {
        addLog('error', [`${message} at ${source}:${lineno}:${colno}`]);
    };
}
