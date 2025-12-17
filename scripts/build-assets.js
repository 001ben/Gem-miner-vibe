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
const PUBLIC_ASSETS_DIR = path.resolve(__dirname, '../public/assets'); // Current output of blender scripts

// Ensure directories exist
[ASSETS_OUT_DIR, TEXTURES_OUT_DIR, CONFIGS_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function main() {
    console.log("🚀 Starting DAMP Build Pipeline...");

    // 1. Run Blender Scripts (Geometry Generation)
    console.log("\n📦 [1/4] Generating Geometry (Blender)...");

    // Ensure public/assets exists as intermediate
    if (!fs.existsSync(PUBLIC_ASSETS_DIR)) fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });

    if (fs.existsSync(BLENDER_SRC_DIR)) {
        const blenderFiles = fs.readdirSync(BLENDER_SRC_DIR).filter(f => f.endsWith('.py'));
        for (const file of blenderFiles) {
            const inputPath = path.join(BLENDER_SRC_DIR, file);
            console.log(`   Running ${file}...`);
            try {
                // This generates files into public/assets/ (hardcoded in py scripts)
                execSync(`blender --background --python "${inputPath}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`   ❌ Failed to run ${file}. Is Blender installed?`);
                // We continue to allow skipping if blender is missing in some envs
            }
        }
    }

    // 2. Copy Generated Assets to Viewer
    console.log("\n🚚 [2/4] Copying 3D Assets to Viewer...");
    if (fs.existsSync(PUBLIC_ASSETS_DIR)) {
        const glbs = fs.readdirSync(PUBLIC_ASSETS_DIR).filter(f => f.endsWith('.glb'));
        for (const glb of glbs) {
            fs.copyFileSync(path.join(PUBLIC_ASSETS_DIR, glb), path.join(ASSETS_OUT_DIR, glb));
            console.log(`   Copied ${glb}`);
        }
    }

    // 3. Copy Textures
    console.log("\n🎨 [3/4] Copying Textures...");
    if (fs.existsSync(TEXTURES_SRC_DIR)) {
        const pngs = fs.readdirSync(TEXTURES_SRC_DIR).filter(f => f.endsWith('.png'));
        for (const png of pngs) {
            fs.copyFileSync(path.join(TEXTURES_SRC_DIR, png), path.join(TEXTURES_OUT_DIR, png));
            console.log(`   Copied ${png}`);
        }
    } else {
        console.warn("   No texture source directory found (assets/source/textures).");
    }

    // 4. Generate Catalog
    console.log("\n📖 [4/4] Generating Catalog...");
    const catalog = {
        models: fs.existsSync(ASSETS_OUT_DIR) ? fs.readdirSync(ASSETS_OUT_DIR).filter(f => f.endsWith('.glb')) : [],
        textures: fs.existsSync(TEXTURES_OUT_DIR) ? fs.readdirSync(TEXTURES_OUT_DIR).filter(f => f.endsWith('.png')) : []
    };

    fs.writeFileSync(path.join(ASSETS_OUT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
    console.log("   catalog.json created.");

    // 5. Copy Three.js (Dependency) - Simplified for Sandbox
    console.log("\n📚 [5/5] Copying Three.js...");
    const THREE_SRC = path.resolve(__dirname, '../node_modules/three');
    const THREE_DEST = path.join(VIEWER_DIR, 'libs/three');

    try {
        if (fs.existsSync(THREE_SRC)) {
             // For sandbox safety, we'll try to copy ONLY the build file and warn about others if needed
             const destBuild = path.join(THREE_DEST, 'build');
             if (!fs.existsSync(destBuild)) fs.mkdirSync(destBuild, { recursive: true });

             const buildFile = path.join(THREE_SRC, 'build/three.module.js');
             if (fs.existsSync(buildFile)) {
                 fs.copyFileSync(buildFile, path.join(destBuild, 'three.module.js'));
                 console.log("   Three.js core module copied.");
             }

             // Manually copy required dependencies to avoid "too many files" error in sandbox with full recursive copy
             const requiredFiles = [
                { src: 'examples/jsm/loaders/GLTFLoader.js', dest: 'examples/jsm/loaders/GLTFLoader.js' },
                { src: 'examples/jsm/loaders/RGBELoader.js', dest: 'examples/jsm/loaders/RGBELoader.js' },
                { src: 'examples/jsm/loaders/HDRLoader.js', dest: 'examples/jsm/loaders/HDRLoader.js' },
                { src: 'examples/jsm/controls/OrbitControls.js', dest: 'examples/jsm/controls/OrbitControls.js' },
                { src: 'examples/jsm/utils/BufferGeometryUtils.js', dest: 'examples/jsm/utils/BufferGeometryUtils.js' }
             ];

             requiredFiles.forEach(file => {
                const srcPath = path.join(THREE_SRC, file.src);
                const destPath = path.join(THREE_DEST, file.dest);
                const destDir = path.dirname(destPath);

                if (fs.existsSync(srcPath)) {
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    fs.copyFileSync(srcPath, destPath);
                    console.log(`   Copied ${file.src}`);
                } else {
                    console.warn(`   ⚠️ Missing dependency: ${file.src}`);
                }
             });

        } else {
            console.error("   ❌ node_modules/three not found. Run 'npm install'?");
        }
    } catch (e) {
        console.error("   ⚠️ Failed to copy Three.js assets:", e.message);
    }

    console.log("\n✅ DAMP Build Complete.");
}

main().catch(console.error);
