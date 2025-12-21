const fs = require('fs');
const path = require('path');

const VIEWER_ASSETS_DIR = path.resolve(__dirname, '../../tools/viewer/assets');
const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DOMAINS_DIR = path.join(ROOT_DIR, 'src/domains');

function getDomainConfigs() {
    if (!fs.existsSync(SRC_DOMAINS_DIR)) return [];
    const domains = fs.readdirSync(SRC_DOMAINS_DIR);
    const configs = [];
    domains.forEach(d => {
        const configPath = path.join(SRC_DOMAINS_DIR, d, 'config.json');
        if (fs.existsSync(configPath)) {
            // Store path relative to project root so viewer can fetch
            configs.push(`src/domains/${d}/config.json`);
        }
    });
    return configs;
}

function generateCatalog() {
    const modelsDir = VIEWER_ASSETS_DIR;
    const texturesDir = path.join(VIEWER_ASSETS_DIR, 'textures');
    const legacyConfigsDir = path.join(VIEWER_ASSETS_DIR, 'configs');

    const catalog = {
        models: fs.existsSync(modelsDir) ? fs.readdirSync(modelsDir).filter(f => f.endsWith('.glb')) : [],
        textures: fs.existsSync(texturesDir) ? fs.readdirSync(texturesDir).filter(f => f.endsWith('.png')) : [],
        configs: [
            ...getDomainConfigs(),
            ...(fs.existsSync(legacyConfigsDir) ? fs.readdirSync(legacyConfigsDir).filter(f => f.endsWith('.json')).map(f => `assets/configs/${f}`) : [])
        ]
    };

    fs.writeFileSync(path.join(VIEWER_ASSETS_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
    console.log("✅ catalog.json generated with domain configs.");
}

generateCatalog();
