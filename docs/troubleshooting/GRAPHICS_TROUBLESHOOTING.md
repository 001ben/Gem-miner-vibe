# Graphics Troubleshooting: The "Striped Shadow" Artifact

## The Issue

In 3D rendering, you may observe weird, striped shadow patterns across surfaces that look like texture glitches or blinds. This is often described as "Shadow Acne" or "Self-Shadowing Artifacts."

## The Cause

This is a fundamental limitation of **Shadow Mapping**.

1. **Depth Map Resolution:** The light source renders the scene depth to a texture (the Shadow Map). This texture has limited resolution (e.g., 1024x1024 pixels).
1. **Quantization:** When checking if a pixel on the screen is in shadow, the engine compares the pixel's depth to the value stored in the shadow map.
1. **The Glitch:** Due to limited precision (quantization) and the angle of the light, a flat surface might calculate its depth as slightly *behind* the value in the shadow map for some pixels and *in front* for others. This causes the surface to cast a shadow on itself in a striped pattern.

## The Fix

We need to tune the **Shadow Bias**.

### 1. Bias (Offset)

This pushes the shadow slightly deeper/away from the light.

- **Too Low:** Acne remains.
- **Too High:** "Peter Panning" (shadows detach from the object).

### 2. Normal Bias

This pushes the shadow lookup coordinate along the surface normal. This is very effective for curved or low-poly geometry (like our programmer art).

## Implementation in Three.js

```javascript
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.castShadow = true;

// The Fix:
dirLight.shadow.bias = -0.0005;      // Slight offset to remove acne
dirLight.shadow.normalBias = 0.05;   // Pushes shadow based on surface angle
```

We have applied this fix to `asset_viewer.html`.
