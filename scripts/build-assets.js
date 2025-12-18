const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VIEWER_DIR = path.resolve(__dirname, '../viewer');
const ASSETS_OUT_DIR = path.join(VIEWER_DIR, 'assets');
const TEXTURES_SRC_DIR = path.resolve(__dirname, '../assets/source/textures');
const TEXTURES_OUT_DIR = path.join(ASSETS_OUT_DIR, 'textures');
const BLENDER_SRC_DIR = path.resolve(__dirname, '../assets/source/blender');
const CONFIGS_SRC_DIR = path.resolve(__dirname, '../assets/configs');
const CONFIGS_OUT_DIR = path.join(ASSETS_OUT_DIR, 'configs');
const GENERATED_ASSETS_DIR = path.resolve(__dirname, '../assets'); // Output of blender scripts

// Ensure directories exist
[ASSETS_OUT_DIR, TEXTURES_OUT_DIR, CONFIGS_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function main() {
    console.log("🚀 Starting DAMP Build Pipeline...");

    // 1. Run Blender Scripts (Geometry Generation)
    console.log("\n📦 [1/5] Generating Geometry (Blender)...");

    if (fs.existsSync(BLENDER_SRC_DIR)) {
        const blenderFiles = fs.readdirSync(BLENDER_SRC_DIR).filter(f => f.endsWith('.py'));
        for (const file of blenderFiles) {
            const inputPath = path.join(BLENDER_SRC_DIR, file);
            console.log(`   Running ${file}...`);
            try {
                // This generates files into assets/ (configured in py scripts)
                execSync(`blender --background --python "${inputPath}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`   ❌ Failed to run ${file}. Is Blender installed?`);
                // We continue to allow skipping if blender is missing in some envs
            }
        }
    }

    // 2. Copy Generated Assets to Viewer
    console.log("\n🚚 [2/5] Copying 3D Assets to Viewer...");
    if (fs.existsSync(GENERATED_ASSETS_DIR)) {
        const glbs = fs.readdirSync(GENERATED_ASSETS_DIR).filter(f => f.endsWith('.glb'));
        for (const glb of glbs) {
            fs.copyFileSync(path.join(GENERATED_ASSETS_DIR, glb), path.join(ASSETS_OUT_DIR, glb));
            console.log(`   Copied ${glb}`);
        }
    }

    // 3. Copy Textures
    console.log("\n🎨 [3/5] Copying Textures...");
    // Copy from source/textures if it exists
    if (fs.existsSync(TEXTURES_SRC_DIR)) {
        const pngs = fs.readdirSync(TEXTURES_SRC_DIR).filter(f => f.endsWith('.png'));
        for (const png of pngs) {
            fs.copyFileSync(path.join(TEXTURES_SRC_DIR, png), path.join(TEXTURES_OUT_DIR, png));
            console.log(`   Copied source texture: ${png}`);
        }
    }

    // Also copy generated textures from assets/textures/
    const GENERATED_TEXTURES_DIR = path.join(GENERATED_ASSETS_DIR, 'textures');
    if (fs.existsSync(GENERATED_TEXTURES_DIR)) {
        const pngs = fs.readdirSync(GENERATED_TEXTURES_DIR).filter(f => f.endsWith('.png'));
        for (const png of pngs) {
            fs.copyFileSync(path.join(GENERATED_TEXTURES_DIR, png), path.join(TEXTURES_OUT_DIR, png));
            console.log(`   Copied generated texture: ${png}`);
        }
    }

    // 4. Copy Configs
    console.log("\n⚙️ [4/5] Copying Configs...");
    if (fs.existsSync(CONFIGS_SRC_DIR)) {
        const jsons = fs.readdirSync(CONFIGS_SRC_DIR).filter(f => f.endsWith('.json'));
        for (const json of jsons) {
            fs.copyFileSync(path.join(CONFIGS_SRC_DIR, json), path.join(CONFIGS_OUT_DIR, json));
            console.log(`   Copied config: ${json}`);
        }
    }

    // 5. Generate Catalog
    console.log("\n📖 [5/5] Generating Catalog...");
    const catalog = {
        models: fs.existsSync(ASSETS_OUT_DIR) ? fs.readdirSync(ASSETS_OUT_DIR).filter(f => f.endsWith('.glb')) : [],
        textures: fs.existsSync(TEXTURES_OUT_DIR) ? fs.readdirSync(TEXTURES_OUT_DIR).filter(f => f.endsWith('.png')) : [],
        configs: fs.existsSync(CONFIGS_OUT_DIR) ? fs.readdirSync(CONFIGS_OUT_DIR).filter(f => f.endsWith('.json')) : []
    };

    fs.writeFileSync(path.join(ASSETS_OUT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
    console.log("   catalog.json created.");

    console.log("\n✅ DAMP Build Complete.");
}

main().catch(console.error);
