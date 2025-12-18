const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8003;

// Simple static file server
const server = http.createServer((req, res) => {
    // Sanitize path to prevent directory traversal
    let safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');

    // DEV SERVER MAPPING FIX:
    // The viewer runs at /verification/asset_viewer.html
    // It requests ./node_modules/... -> /verification/node_modules/...
    // It requests public/assets/... -> /verification/public/assets/...
    // We need to map these back to the project root.

    if (safePath.startsWith('/verification/node_modules/')) {
        safePath = safePath.replace('/verification/node_modules/', '/node_modules/');
    }
    if (safePath.startsWith('/verification/public/')) {
        safePath = safePath.replace('/verification/public/', '/public/');
    }

    // Serve from project root
    let filePath = path.join(__dirname, '..', safePath.split('?')[0]);

    if (filePath.endsWith('/')) {
        if (safePath === '/' || safePath === '/verification/') {
             filePath = path.join(__dirname, 'asset_viewer.html');
        } else {
             filePath = path.join(filePath, 'index.html');
        }
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.glb':
            contentType = 'model/gltf-binary';
            break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            // Fallback for direct access to asset_viewer.html without path prefix
            if(error.code == 'ENOENT'){
                 // console.log(`404: ${filePath}`);
                 // Try looking in verification folder if not found in root (for asset_viewer itself)
                 // This covers the case where we request /verification/asset_viewer.html and it maps to /app/verification/asset_viewer.html which is correct,
                 // but if we requested just /asset_viewer.html it might fail if we didn't handle it.
                 // But strictly, our issue was sub-resources.

                res.writeHead(404);
                res.end('404 Not Found: ' + filePath);
            }
            else {
                res.writeHead(500);
                res.end('Error: '+error.code);
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

async function run() {
    return new Promise((resolve) => {
        server.listen(PORT, async () => {
            console.log(`Server running at http://localhost:${PORT}/`);

            try {
                const browser = await chromium.launch();
                const page = await browser.newPage();

                // Debug console logs from page
                page.on('console', msg => console.log('PAGE LOG:', msg.text()));
                page.on('pageerror', exception => console.log('PAGE ERROR:', exception));

                // We test the composite bulldozer and the plow
                const assets = ['bulldozer_composite', 'plow.glb'];
                const angles = [0, 45, 90, 135];

                const screenshotDir = path.join(__dirname, 'screenshots');
                if (!fs.existsSync(screenshotDir)) {
                    fs.mkdirSync(screenshotDir, { recursive: true });
                }

                for (const asset of assets) {
                    console.log(`Processing ${asset}...`);
                    // We load asset_viewer.html via the special route logic or direct path
                    const url = `http://localhost:${PORT}/verification/asset_viewer.html?asset=${asset}`;

                    try {
                        await page.goto(url);

                        // Wait for window.setAngle which indicates script loaded
                        // Increased timeout and added polling
                        await page.waitForFunction(() => typeof window.setAngle === 'function', null, { timeout: 10000 });

                        // Wait a bit more for models to load (composite takes longer)
                        await page.waitForTimeout(3000);

                        for (const angle of angles) {
                            await page.evaluate((a) => window.setAngle(a), angle);
                            await page.waitForTimeout(200);

                            const filename = `${asset.replace('.glb', '')}_angle_${angle}.png`;
                            const filepath = path.join(screenshotDir, filename);

                            await page.screenshot({ path: filepath });
                            console.log(`Saved ${filepath}`);
                        }
                    } catch (e) {
                        console.error(`Error processing ${asset}:`, e);
                    }
                }

                await browser.close();
            } catch (e) {
                console.error("Browser error:", e);
            } finally {
                server.close();
                resolve();
            }
        });
    });
}

run();
