# /// script
# dependencies = [
#   "Pillow",
# ]
# ///

import math
import os
import random
from PIL import Image

def generate_body_texture(filepath):
    width, height = 512, 512
    # Base Yellow: #FFAA00 -> (255, 170, 0, 255)
    img = Image.new('RGBA', (width, height), (255, 170, 0, 255))
    pixels = img.load()

    def blend_pixel(x, y, r, g, b, a):
        if 0 <= x < width and 0 <= y < height:
            bg_r, bg_g, bg_b, bg_a = pixels[x, y]
            alpha = a / 255.0
            new_r = int(r * alpha + bg_r * (1 - alpha))
            new_g = int(g * alpha + bg_g * (1 - alpha))
            new_b = int(b * alpha + bg_b * (1 - alpha))
            pixels[x, y] = (new_r, new_g, new_b, 255)

    # 1. Noise
    for _ in range(1000):
        is_dark = random.random() > 0.5
        val = 0 if is_dark else 255
        cx, cy = random.randint(0, width-1), random.randint(0, height-1)
        for ox in range(2):
            for oy in range(2):
                blend_pixel(cx+ox, cy+oy, val, val, val, 25) # 0.1 alpha approx 25/255

    # 2. Rust Spots
    for _ in range(20):
        cx, cy = random.randint(0, width-1), random.randint(0, height-1)
        radius = random.randint(10, 60)
        r_sq = radius * radius
        for y in range(max(0, cy-radius), min(height, cy+radius)):
            for x in range(max(0, cx-radius), min(width, cx+radius)):
                if (x-cx)**2 + (y-cy)**2 <= r_sq:
                    blend_pixel(x, y, 100, 50, 0, 51) # 0.2 alpha approx 51/255

    img.save(filepath)
    print(f"   [TEXTURE] Generated {filepath}")

def generate_tracks_texture(filepath):
    width, height = 512, 512
    img = Image.new('RGBA', (width, height), (15, 15, 15, 255)) # Dark grey
    pixels = img.load()

    # Draw Chevrons/Treads
    bar_height = 64
    for y in range(0, height, bar_height):
        for x in range(width):
            offset = abs(x - 256) // 8
            for py in range(y + offset, y + offset + 20):
                if 0 <= py < height:
                    pixels[x, py] = (51, 51, 51, 255)

    img.save(filepath)
    print(f"   [TEXTURE] Generated {filepath}")

# --- Execution ---
if __name__ == "__main__":
    tex_dir = os.path.join(os.getcwd(), "assets", "textures")
    os.makedirs(tex_dir, exist_ok=True)
    generate_body_texture(os.path.join(tex_dir, "bulldozer_texture.png"))
    generate_tracks_texture(os.path.join(tex_dir, "tracks_texture.png"))