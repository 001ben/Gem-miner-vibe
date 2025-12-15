const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = 8002;

// Simple static file server
const server = http.createServer((req, res) => {
    // Sanitize path to prevent directory traversal
    const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');

    let filePath = path.join(__dirname, '..', safePath.split('?')[0]);
    if (filePath.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
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
            if(error.code == 'ENOENT'){
                res.writeHead(404);
                res.end('404 Not Found');
            }
            else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
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

                const assets = ['bulldozer.glb', 'plow.glb'];
                const angles = [0, 45, 90, 135];

                const screenshotDir = path.join(__dirname, 'screenshots');
                if (!fs.existsSync(screenshotDir)) {
                    fs.mkdirSync(screenshotDir, { recursive: true });
                }

                for (const asset of assets) {
                    console.log(`Processing ${asset}...`);
                    const url = `http://localhost:${PORT}/verification/asset_viewer.html?asset=${asset}`;

                    try {
                        await page.goto(url);

                        // Wait for model to be loaded (checking console message "Model loaded" would be best,
                        // but checking if setAngle is functional is a proxy)
                        // Or just wait for the element/variable.
                        // We will wait for setAngle to be defined.
                        await page.waitForFunction(() => typeof window.setAngle === 'function');

                        // Give a little extra time for the model to render
                        await page.waitForTimeout(1000);

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
