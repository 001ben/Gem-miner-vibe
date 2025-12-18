const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.resolve(__dirname, '../viewer/assets');
const TEXTURES_DIR = path.join(ASSETS_DIR, 'textures');
const CONFIGS_DIR = path.join(ASSETS_DIR, 'configs');

function generateCatalog() {
    const catalog = {
        models: fs.existsSync(ASSETS_DIR) ? fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.glb')) : [],
        textures: fs.existsSync(TEXTURES_DIR) ? fs.readdirSync(TEXTURES_DIR).filter(f => f.endsWith('.png')) : [],
        configs: fs.existsSync(CONFIGS_DIR) ? fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.json')) : []
    };

    fs.writeFileSync(path.join(ASSETS_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
    console.log("✅ catalog.json generated.");
}

generateCatalog();
