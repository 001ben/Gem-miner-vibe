const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const obj2gltf = require('obj2gltf');
const stlToObj = require('./stl2obj');

// Config
const SRC_DIR = './assets/source'; // Where you write .scad
const OUT_DIR = './public/assets'; // Where the game reads .glb

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Helper to run shell commands (OpenSCAD)
const runCommand = (cmd) => {
    try {
        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Failed to run: ${cmd}`);
        process.exit(1);
    }
};

(async () => {
    const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.scad'));

    console.log(`Found ${files.length} SCAD files to compile...`);

    for (const file of files) {
        const name = path.basename(file, '.scad');
        const inputPath = path.join(SRC_DIR, file);
        const tempStlPath = path.join(OUT_DIR, `${name}.stl`);
        const tempObjPath = path.join(OUT_DIR, `${name}.obj`);
        const outputGlbPath = path.join(OUT_DIR, `${name}.glb`);

        console.log(`[${name}] Compiling Geometry...`);
        // 1. OpenSCAD -> ASCII STL
        // We force ASCII STL to ensure our parser works correctly.
        runCommand(`openscad -o "${tempStlPath}" --export-format asciistl "${inputPath}"`);

        console.log(`[${name}] Converting STL to OBJ...`);
        // 2. STL -> OBJ
        stlToObj(tempStlPath, tempObjPath);

        console.log(`[${name}] Converting to GLB...`);
        // 3. OBJ -> GLB
        const options = { binary: true };
        try {
            const glb = await obj2gltf(tempObjPath, options);
            fs.writeFileSync(outputGlbPath, glb);
            console.log(`✅ [${name}] Done.`);
        } catch (err) {
            console.error(`❌ Error converting ${name}:`, err);
        }

        // Cleanup intermediate files
        if (fs.existsSync(tempStlPath)) fs.unlinkSync(tempStlPath);
        if (fs.existsSync(tempObjPath)) fs.unlinkSync(tempObjPath);
    }
})();
