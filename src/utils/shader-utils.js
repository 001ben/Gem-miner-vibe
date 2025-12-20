import * as THREE from 'three';

export function enhanceMaterialWithTriplanar(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uScale = { value: 0.1 };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;`);
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;\nvWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;\nuniform float uScale;`);
    const triplanarLogic = `
            vec3 blending = abs(vWorldNormal);
            blending = normalize(max(blending, 0.00001));
            float b = (blending.x + blending.y + blending.z);
            blending /= b;
            vec3 coord = vWorldPosition * uScale;
            vec4 xaxis = texture2D(map, coord.yz);
            vec4 yaxis = texture2D(map, coord.xz);
            vec4 zaxis = texture2D(map, coord.xy);
            vec4 texColor = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
            diffuseColor *= texColor;
        `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', triplanarLogic);
  };
}
