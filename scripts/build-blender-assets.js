const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Config
const SRC_DIR = './assets/source/blender';
const OUT_DIR = './assets';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Check for Blender
let blenderCmd = 'blender';
try {
    // Try to find blender in path or common locations if needed.
    // For now assume 'blender' is in PATH (installed via apt)
    execSync('blender --version', { stdio: 'ignore' });
} catch (e) {
    console.error("❌ Blender not found in PATH. Please install Blender to use this pipeline.");
    console.log("   sudo apt-get install blender");
    process.exit(1);
}

(async () => {
    if (!fs.existsSync(SRC_DIR)) {
        console.log("No blender sources found.");
        return;
    }

    const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.py'));
    console.log(`Found ${files.length} Blender scripts...`);

    for (const file of files) {
        const name = path.basename(file, '.py');
        const inputPath = path.join(SRC_DIR, file);

        console.log(`[${name}] Running Blender Script...`);

        // Command: blender --background --python script.py
        try {
            execSync(`blender --background --python "${inputPath}"`, { stdio: 'inherit' });
            console.log(`✅ [${name}] Exported.`);
        } catch (err) {
            console.error(`❌ Error processing ${name}:`, err);
        }
    }
})();
