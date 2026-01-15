const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2] || '../../assets/models/bulldozer_components.glb';
const GLB_PATH = path.resolve(__dirname, targetFile.startsWith('/') ? targetFile : (process.argv[2] ? process.cwd() + '/' + targetFile : targetFile));

function verifyGLB() {
    if (!fs.existsSync(GLB_PATH)) {
        console.error(`❌ Error: GLB file not found at ${GLB_PATH}`);
        process.exit(1);
    }

    console.log(`\n🔍 Verifying DAMP Contract: ${path.basename(GLB_PATH)}`);
    console.log("======================================================");

    const buffer = fs.readFileSync(GLB_PATH);
    
    // Parse GLB Header
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) { // "glTF"
        console.error("❌ Error: Not a valid GLB file");
        process.exit(1);
    }

    // Parse JSON chunk
    const jsonLen = buffer.readUInt32LE(12);
    const jsonStr = buffer.toString('utf8', 20, 20 + jsonLen);
    const gltf = JSON.parse(jsonStr);

    if (!gltf.nodes) {
        console.error("❌ Error: No nodes found in glTF");
        process.exit(1);
    }

    const scene = gltf.scenes[gltf.scene || 0];
    
    function printNode(nodeIdx, indent = "") {
        const node = gltf.nodes[nodeIdx];
        const extras = node.extras || {};
        const dampId = extras.damp_id ? `\x1b[32m[ID: ${extras.damp_id}]\x1b[0m` : "\x1b[31m[NO CONTRACT]\x1b[0m";
        
        let matInfo = "";
        if (node.mesh !== undefined) {
            const mesh = gltf.meshes[node.mesh];
            const prims = mesh.primitives || [];
            prims.forEach(p => {
                if (p.material !== undefined) {
                    const mat = gltf.materials[p.material];
                    const matExtras = mat.extras || {};
                    const matDampId = matExtras.damp_id ? `\x1b[36m[MAT ID: ${matExtras.damp_id}]\x1b[0m` : "[MAT: NO ID]";
                    matInfo += ` -> Material: '${mat.name}' ${matDampId}`;
                }
            });
        }

        console.log(`${indent}• ${node.name || "Unnamed"} ${dampId}${matInfo}`);

        if (node.children) {
            node.children.forEach(childIdx => printNode(childIdx, indent + "  "));
        }
    }

    scene.nodes.forEach(rootIdx => printNode(rootIdx));
    console.log("======================================================\n");
}

verifyGLB();
