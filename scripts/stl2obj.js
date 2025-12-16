const fs = require('fs');

function stlToObj(stlPath, objPath) {
    const stl = fs.readFileSync(stlPath, 'utf-8');
    const lines = stl.split('\n');

    const vertices = [];
    const faces = [];

    let currentFace = [];

    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('vertex')) {
            const parts = line.split(/\s+/);
            const x = parts[1];
            const y = parts[2];
            const z = parts[3];
            vertices.push(`${x} ${y} ${z}`);
            currentFace.push(vertices.length); // 1-based index
        } else if (line.startsWith('endloop')) {
            if (currentFace.length >= 3) {
                faces.push(`f ${currentFace.join(' ')}`);
            }
            currentFace = [];
        }
    }

    const objContent = vertices.map(v => `v ${v}`).join('\n') + '\n' + faces.join('\n');
    fs.writeFileSync(objPath, objContent);
}

module.exports = stlToObj;

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: node stl2obj.js <input.stl> <output.obj>");
        process.exit(1);
    }
    stlToObj(args[0], args[1]);
}
